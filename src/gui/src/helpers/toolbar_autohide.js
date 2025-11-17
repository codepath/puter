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
            const kvEnabled = val === true || val === 'true';
            
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
        
        this.clearHideTimer();
        this.hideTimeout = setTimeout(() => {
            this.hide();
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
        
        // Restart hide timer
        if (this.isEnabled) {
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
                // Restart hide timer when mouse moves away
                this.startHideTimer();
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
        
        // Only start timer if mouse is not near the top
        if (this.lastMouseY > this.proximityThreshold) {
            this.startHideTimer();
        }
    }
}

// Create singleton instance
window.toolbar_autohide = new ToolbarAutoHide();

export default window.toolbar_autohide;