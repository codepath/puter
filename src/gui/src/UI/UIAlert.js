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

import UIWindow from './UIWindow.js'

// Alert type to icon mapping
const ALERT_TYPE_ICONS = {
    'info': 'bell.svg',
    'success': 'c-check.svg',
    'warning': 'warning-sign.svg',
    'error': 'danger.svg',
    'question': 'reminder.svg'
};

/**
 * Validates and retrieves an icon with fallback logic
 * @param {string} customIcon - The custom icon name/path to validate
 * @param {string} alertType - The alert type for fallback icon
 * @returns {string} The validated icon path or fallback icon
 */
function validateAndGetIcon(customIcon, alertType) {
    // First, try to get the custom icon
    if (customIcon && window.icons && window.icons[customIcon]) {
        return window.icons[customIcon];
    }

    // If custom icon is a direct path/URL, validate it exists
    if (customIcon && (customIcon.startsWith('/') || customIcon.startsWith('http') || customIcon.includes('.'))) {
        // For direct paths, we'll trust they exist and return them
        // The browser will handle broken images gracefully
        return customIcon;
    }

    // Fallback to type-based icon
    const typeIcon = ALERT_TYPE_ICONS[alertType] || ALERT_TYPE_ICONS['warning'];
    return window.icons[typeIcon] || window.icons[ALERT_TYPE_ICONS['warning']];
}

/**
 * Sanitizes HTML content to prevent XSS attacks while allowing safe HTML elements
 * @param {string|HTMLElement} content - The content to sanitize
 * @returns {string} The sanitized HTML content
 */
function sanitizeCustomUI(content) {
    if (!content) return '';

    // If content is an HTMLElement, get its outerHTML
    if (content instanceof HTMLElement) {
        content = content.outerHTML;
    }

    // Convert to string if not already
    content = String(content);

    // Create a temporary div to parse and sanitize the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    // Define allowed tags and attributes for basic HTML sanitization
    const allowedTags = ['div', 'span', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'a', 'img', 'button', 'input', 'textarea', 'select', 'option', 'label', 'form'];
    const allowedAttributes = ['class', 'id', 'style', 'href', 'src', 'alt', 'title', 'type', 'value', 'name', 'placeholder', 'data-*'];

    // Remove script tags and event handlers
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach(script => script.remove());

    // Remove event handler attributes (onclick, onload, etc.)
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(element => {
        // Remove event handler attributes
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('on')) {
                element.removeAttribute(attr.name);
            }
        });

        // Remove javascript: URLs
        if (element.href && element.href.startsWith('javascript:')) {
            element.removeAttribute('href');
        }
        if (element.src && element.src.startsWith('javascript:')) {
            element.removeAttribute('src');
        }
    });

    return tempDiv.innerHTML;
}

function UIAlert(options) {
    // set sensible defaults
    if (arguments.length > 0) {
        // if first argument is a string, then assume it is the message
        if (window.isString(arguments[0])) {
            options = {};
            options.message = arguments[0];
        }
        // if second argument is an array, then assume it is the buttons
        if (arguments[1] && Array.isArray(arguments[1])) {
            options.buttons = arguments[1];
        }
    }

    // ensure options is an object
    options = options || {};

    return new Promise(async (resolve) => {
        // provide an 'OK' button if no buttons are provided
        if (!options.buttons || options.buttons.length === 0) {
            options.buttons = [
                { label: i18n('ok'), value: true, type: 'primary' }
            ]
        }

        // set default type if not provided (for backward compatibility)
        if (!options.type) {
            options.type = 'warning';
        }

        // validate alert type and fallback to warning if invalid
        if (!ALERT_TYPE_ICONS[options.type]) {
            options.type = 'warning';
        }

        // set body icon based on type or custom icon override
        if (options.icon) {
            // custom icon override with validation and fallback
            options.body_icon = validateAndGetIcon(options.icon, options.type);
        } else {
            // use type-based icon
            options.body_icon = window.icons[ALERT_TYPE_ICONS[options.type]];
        }

        let h = '';

        let santized_message = html_encode(options.message);
        // replace sanitized <strong> with <strong>
        santized_message = santized_message.replace(/&lt;strong&gt;/g, '<strong>');
        santized_message = santized_message.replace(/&lt;\/strong&gt;/g, '</strong>');
        // replace sanitized <p> with <p>
        santized_message = santized_message.replace(/&lt;p&gt;/g, '<p>');
        santized_message = santized_message.replace(/&lt;\/p&gt;/g, '</p>');

        // icon
        h += `<img class="window-alert-icon" src="${html_encode(options.body_icon)}">`;
        // message
        h += `<div class="window-alert-message">${santized_message}</div>`;

        // buttons
        if(options.buttons && options.buttons.length > 0){
            h += `<div style="overflow:hidden; margin-top:20px;">`;
            for(let y=0; y<options.buttons.length; y++){
                h += `<button class="button button-block button-${html_encode(options.buttons[y].type)} alert-resp-button" data-label="${html_encode(options.buttons[y].label)}"
                data-value="${html_encode(options.buttons[y].value ?? options.buttons[y].label)}"
                ${options.buttons[y].type === 'primary' ? 'autofocus' : ''}>${html_encode(options.buttons[y].label)}</button>`;
            }
            h += `</div>`;
        }

        const el_window = await UIWindow({
            title: null,
            icon: null,
            uid: null,
            is_dir: false,
            message: options.message,
            body_icon: options.body_icon,
            backdrop: options.backdrop ?? false,
            is_resizable: false,
            is_droppable: false,
            has_head: false,
            stay_on_top: options.stay_on_top ?? false,
            selectable_body: false,
            draggable_body: options.draggable_body ?? true,
            allow_context_menu: false,
            show_in_taskbar: false,
            window_class: 'window-alert',
            dominant: true,
            body_content: h,
            width: 350,
            parent_uuid: options.parent_uuid,
            ...options.window_options,
            window_css:{
                height: 'initial',
            },
            body_css: {
                width: 'initial',
                padding: '20px',
                'background-color': 'rgba(231, 238, 245, .95)',
                'backdrop-filter': 'blur(3px)',
            }
        });

        // focus to primary btn
        $(el_window).find('.button-primary').focus();

        // --------------------------------------------------------
        // Button pressed
        // --------------------------------------------------------
        $(el_window).find('.alert-resp-button').on('click', async function (event) {
            event.preventDefault();
            event.stopPropagation();

            const buttonIndex = parseInt($(this).attr('data-button-index'));
            const buttonConfig = options.buttons[buttonIndex];
            const buttonValue = $(this).attr('data-value');

            // Execute callback function if provided
            if (buttonConfig && typeof buttonConfig.callback === 'function') {
                try {
                    // Execute the callback function
                    const callbackResult = await buttonConfig.callback();

                    // If callback returns a value, use it; otherwise use the button value
                    const resolveValue = callbackResult !== undefined ? callbackResult : buttonValue;
                    resolve(resolveValue);
                } catch (error) {
                    console.error('Error executing button callback:', error);
                    // On callback error, still resolve with button value for backward compatibility
                    resolve(buttonValue);
                }
            } else {
                // No callback - use existing behavior for backward compatibility
                resolve(buttonValue);
            }

            $(el_window).close();
            return false;
        });

        // --------------------------------------------------------
        // Custom UI support - provide methods to close dialog programmatically
        // --------------------------------------------------------
        if (options.customUI) {
            // Add a close method to the window element for custom UI to use
            el_window.closeAlert = function (value) {
                resolve(value);
                $(el_window).close();
            };

            // Also make it available globally for custom UI scripts
            window.currentAlertWindow = el_window;
        }
    })
}

def(UIAlert, 'ui.window.UIAlert');

export default UIAlert;
