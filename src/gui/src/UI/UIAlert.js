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

// Icon mapping for different alert types
const ALERT_TYPE_ICONS = {
    'info': 'reminder.svg',
    'success': 'c-check.svg',
    'warning': 'warning-sign.svg',
    'error': 'warning-sign.svg', // Using warning icon for error, can be replaced with error.svg if available
    'question': 'reminder.svg', // Using reminder icon for question, can be replaced with question.svg if available
};

function UIAlert(options){
    // set sensible defaults
    if(arguments.length > 0){
        // if first argument is a string, then assume it is the message
        if(window.isString(arguments[0])){
            options = {};
            options.message = arguments[0];
        }
        // if second argument is an array, then assume it is the buttons
        if(arguments[1] && Array.isArray(arguments[1])){
            options.buttons = arguments[1];
        }
    }

    return new Promise(async (resolve) => {
        // Normalize buttons: convert string array to object array
        if(options.buttons && Array.isArray(options.buttons) && options.buttons.length > 0){
            options.buttons = options.buttons.map(btn => {
                // If button is a string, convert to object
                if(typeof btn === 'string'){
                    return {
                        label: btn,
                        value: btn,
                        type: 'primary' // Default type for string buttons
                    };
                }
                // If button is already an object, ensure it has required properties
                return {
                    label: btn.label || btn.value || 'OK',
                    value: btn.value ?? btn.label ?? 'OK',
                    type: btn.type || 'primary'
                };
            });
        }
        
        // provide an 'OK' button if no buttons are provided
        if(!options.buttons || options.buttons.length === 0){
            options.buttons = [
                {label: i18n('ok'), value: true, type: 'primary'}
            ]
        }

        // Determine icon based on type
        // Priority: custom icon > type-based icon > default warning icon
        if(!options.body_icon){
            if(options.type && ALERT_TYPE_ICONS[options.type]){
                options.body_icon = window.icons[ALERT_TYPE_ICONS[options.type]];
            } else {
                options.body_icon = window.icons['warning-sign.svg'];
            }
        }
        
        // Allow custom icon override via icon parameter
        if(options.icon){
            options.body_icon = options.icon;
        }

        // If custom UI is provided, use it instead of default rendering
        if(options.customUI){
            const el_window = await UIWindow({
                title: null,
                icon: null,
                uid: null,
                is_dir: false,
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
                body_content: options.customUI,
                width: options.width ?? 350,
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
                    ...options.customBodyCSS,
                }
            });

            // If custom UI has buttons, set up click handlers
            $(el_window).find('.alert-resp-button, [data-alert-button]').on('click', async function(event){
                event.preventDefault(); 
                event.stopPropagation();
                const value = $(this).attr('data-value') || $(this).attr('data-alert-button');
                resolve(value);
                $(el_window).close();
                return false;
            });

            return;
        }

        let santized_message = html_encode(options.message);

        // replace sanitized <strong> with <strong>
        santized_message = santized_message.replace(/&lt;strong&gt;/g, '<strong>');
        santized_message = santized_message.replace(/&lt;\/strong&gt;/g, '</strong>');

        // replace sanitized <p> with <p>
        santized_message = santized_message.replace(/&lt;p&gt;/g, '<p>');
        santized_message = santized_message.replace(/&lt;\/p&gt;/g, '</p>');

        // Add type-specific CSS class for styling
        const alertTypeClass = options.type ? `window-alert-type-${options.type}` : '';

        let h = '';
        h += `<div class="window-alert-content ${alertTypeClass}">`;
        // icon
        h += `<img class="window-alert-icon" src="${html_encode(options.body_icon)}">`;
        // message
        h += `<div class="window-alert-message">${santized_message}</div>`;
        // buttons
        if(options.buttons && options.buttons.length > 0){
            h += `<div style="overflow:hidden; margin-top:20px;">`;
            for(let y=0; y<options.buttons.length; y++){
                const btn = options.buttons[y];
                h += `<button class="button button-block button-${html_encode(btn.type || 'primary')} alert-resp-button" 
                                data-label="${html_encode(btn.label)}"
                                data-value="${html_encode(btn.value ?? btn.label)}"
                                ${btn.type === 'primary' ? 'autofocus' : ''}
                                >${html_encode(btn.label)}</button>`;
            }
            h += `</div>`;
        }
        h += `</div>`;

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
            width: options.width ?? 350,
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
        $(el_window).find('.alert-resp-button').on('click',  async function(event){
            event.preventDefault(); 
            event.stopPropagation();
            resolve($(this).attr('data-value'));
            $(el_window).close();
            return false;
        })
    })
}

def(UIAlert, 'ui.window.UIAlert');

export default UIAlert;
