/**
 * Copyright (C) 2024 Puter Technologies Inc.
 *
 * This file is part of Puter.
 *
 * Puter is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

class ToolbarAutoHide {
    constructor() {
        this.hideTimeout = null;
        this.hideDelay = 2000; // 2 seconds
        this.proximityThreshold = 50; // pixels from top
        this.isHidden = false;
        this.isEnabled = false;
        this.$toolbar = null;
        this.lastMouseY = 0;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        
        this.$toolbar = $('.toolbar');
        
        if (this.$toolbar.length === 0) {
            console.warn('Toolbar not found, auto-hide initialization skipped');
            return;
        }
        
        this.isInitialized = true;
        
        // First, check localStorage for initial state
        const localPref = window.user_preferences?.toolbar_autohide ?? false;
        this.isEnabled = localPref;
        
        // Then load from KV store to get the authoritative state
        puter.kv.get('user_preferences.toolbar_autohide').then((val) => {
            const kvEnabled = !!val;
            
            // If KV store has a different value, use that
            if (kvEnabled !== this.isEnabled) {
                this.isEnabled = kvEnabled;
                
                // Update localStorage to match
                if (window.user_preferences) {
                    window.user_preferences.toolbar_autohide = kvEnabled;
                    localStorage.setItem('user_preferences', JSON.stringify(window.user_preferences));
                }
            }
            
            // Apply the state
            if (this.isEnabled) {
                this.enable();
            } else {
                // Ensure toolbar is visible by default
                this.$toolbar.addClass('toolbar-visible');
            }
        }).catch((err) => {
            console.warn('Could not load toolbar autohide preference from KV store:', err);
            // Fall back to localStorage value
            if (this.isEnabled) {
                this.enable();
            } else {
                this.$toolbar.addClass('toolbar-visible');
            }
        });

        // Add event listeners for toolbar interaction
        this.$toolbar.on('mouseenter', () => this.onMouseEnterToolbar());
        this.$toolbar.on('mouseleave', () => this.onMouseLeaveToolbar());
        
        // Prevent hiding when interacting with toolbar buttons
        this.$toolbar.on('click', () => {
            this.clearHideTimer();
            this.show();
        });

        // Listen for context menu open/close events
        $(document).on('ctxmenu-will-open', () => {
            // When a context menu is about to open, prevent hiding
            this.clearHideTimer();
            this.show();
        });

        // Monitor for context menu visibility
        // Check periodically if any context menu is open
        setInterval(() => {
            if (this.hasOpenMenu()) {
                this.clearHideTimer();
                if (this.isHidden) {
                    this.show();
                }
            }
        }, 500); // Check every 500ms
    }

    /**
     * Check if any context menu is currently open from the toolbar
     */
    hasOpenMenu() {
        // Check if any toolbar button has an open context menu
        if (this.$toolbar && this.$toolbar.find('.toolbar-btn.has-open-contextmenu').length > 0) {
            return true;
        }
        
        // Check if any context menu is visible (as a fallback)
        if ($('.context-menu:visible').length > 0) {
            // Check if the context menu is related to the toolbar
            const $openMenus = $('.context-menu:visible');
            for (let i = 0; i < $openMenus.length; i++) {
                const menuId = $openMenus.eq(i).attr('data-id');
                // Check if it's the user-options-menu or any menu with parent from toolbar
                if (menuId === 'user-options-menu') {
                    return true;
                }
                // Check if parent element is in toolbar
                const parentId = $openMenus.eq(i).attr('data-parent-id');
                if (parentId) {
                    const $parent = $(`[data-element-id="${parentId}"]`);
                    if ($parent.closest('.toolbar').length > 0) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    enable() {
        this.isEnabled = true;
        this.$toolbar.addClass('toolbar-autohide-enabled');
        this.startHideTimer();
    }

    disable() {
        this.isEnabled = false;
        this.show();
        this.clearHideTimer();
        this.$toolbar.removeClass('toolbar-autohide-enabled');
    }

    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
        
        // Save preference
        window.mutate_user_preferences({
            toolbar_autohide: this.isEnabled
        });
    }

    startHideTimer() {
        if (!this.isEnabled) return;
        
        // Don't start timer if a menu is open
        if (this.hasOpenMenu()) {
            return;
        }
        
        this.clearHideTimer();
        this.hideTimeout = setTimeout(() => {
            // Double-check menu is still closed before hiding
            if (!this.hasOpenMenu()) {
                this.hide();
            }
        }, this.hideDelay);
    }

    clearHideTimer() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    hide() {
        if (!this.isEnabled || this.isHidden) return;
        
        // Don't hide if a menu is open
        if (this.hasOpenMenu()) {
            return;
        }
        
        this.isHidden = true;
        this.$toolbar.removeClass('toolbar-visible toolbar-peek').addClass('toolbar-hidden');
        
        // Adjust layout
        this.updateLayout(true);
    }

    show() {
        if (!this.isHidden && !this.$toolbar.hasClass('toolbar-peek')) return;
        
        this.isHidden = false;
        this.$toolbar.removeClass('toolbar-hidden toolbar-peek').addClass('toolbar-visible');
        
        // Adjust layout
        this.updateLayout(false);
        
        // Restart hide timer (only if no menu is open)
        if (this.isEnabled && !this.hasOpenMenu()) {
            this.startHideTimer();
        }
    }

    peek() {
        if (!this.isEnabled || !this.isHidden) return;
        
        this.$toolbar.removeClass('toolbar-hidden').addClass('toolbar-peek');
    }

    updateLayout(isHidden) {
        const toolbarHeight = isHidden ? 0 : window.toolbar_height;
        
        // Update window container top position
        $('.window-container').css('top', toolbarHeight);
        
        // Update desktop height
        const taskbarHeight = window.taskbar_height || 0;
        $('.desktop').css('height', `calc(100vh - ${taskbarHeight + toolbarHeight}px)`);
        
        // Update global desktop_height for calculations
        window.desktop_height = window.innerHeight - taskbarHeight - toolbarHeight;
    }

    onMouseMove(mouseY) {
        if (!this.isEnabled || !this.isInitialized) return;
        
        this.lastMouseY = mouseY;
        
        // Check if mouse is near top of screen
        if (mouseY <= this.proximityThreshold) {
            if (this.isHidden) {
                this.peek();
            }
            this.clearHideTimer();
        } else {
            if (this.$toolbar.hasClass('toolbar-peek')) {
                // Mouse moved away from top, hide the peek
                this.$toolbar.removeClass('toolbar-peek').addClass('toolbar-hidden');
            } else if (!this.isHidden) {
                // Restart hide timer when mouse moves away (only if no menu is open)
                if (!this.hasOpenMenu()) {
                    this.startHideTimer();
                }
            }
        }
    }

    onMouseEnterToolbar() {
        if (!this.isEnabled) return;
        
        this.clearHideTimer();
        this.show();
    }

    onMouseLeaveToolbar() {
        if (!this.isEnabled) return;
        
        // Only start timer if mouse is not near the top and no menu is open
        if (this.lastMouseY > this.proximityThreshold && !this.hasOpenMenu()) {
            this.startHideTimer();
        }
    }
}

// Create singleton instance
window.toolbar_autohide = new ToolbarAutoHide();

export default window.toolbar_autohide;