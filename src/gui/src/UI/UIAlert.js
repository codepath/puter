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
        // Provide type-specific default buttons if no buttons are provided
        if(!options.buttons || options.buttons.length === 0){
            switch (options.type) {
                case 'question':
                    options.buttons = [
                        { label: i18n('yes'), value: 'yes', type: 'primary' },
                        { label: i18n('no'), value: 'no', type: 'default' }
                    ];
                    break;
                case 'warning':
                    options.buttons = [
                        { label: i18n('ok'), value: true, type: 'primary' },
                        { label: i18n('cancel'), value: false, type: 'default' }
                    ];
                    break;
                case 'error':
                case 'info':
                case 'success':
                default:
                    options.buttons = [
                        { label: i18n('ok'), value: true, type: 'primary' }
                    ];
                    break;
            }
        }

        // Convert string array to button objects
        if (options.buttons && options.buttons.length > 0 && 
            typeof options.buttons[0] === 'string') {
            options.buttons = options.buttons.map((label, index) => ({
                label: label,
                value: label,
                type: index === 0 ? 'primary' : 'default'
            }));
        }

        // Icon mapping for all alert types
        const iconMap = {
            'warning': window.icons['warning-sign.svg'],
            'success': window.icons['c-check.svg'],
            'error': window.icons['danger.svg'],
            'info': window.icons['reminder.svg'],
            'question': window.icons['reminder.svg'],
        };

        // Set body icon based on type, or use custom override
        options.body_icon = options.body_icon ?? 
            (options.type ? iconMap[options.type] : iconMap['warning']);
        let message = options.message;
        if (typeof message !== 'string') {
            message = message != null ? String(message) : '';
        }

        let sanitized_message = html_encode(message);

        // replace sanitized <strong> with <strong>
        sanitized_message = sanitized_message.replace(/&lt;strong&gt;/g, '<strong>');
        sanitized_message = sanitized_message.replace(/&lt;\/strong&gt;/g, '</strong>');

        // replace sanitized <p> with <p>
        sanitized_message = sanitized_message.replace(/&lt;p&gt;/g, '<p>');
        sanitized_message = sanitized_message.replace(/&lt;\/p&gt;/g, '</p>');

        let h = '';
        // icon
        h += `<img class="window-alert-icon" src="${html_encode(options.body_icon)}">`;
        // message
        h += `<div class="window-alert-message">${sanitized_message}</div>`;
        
        // Custom UI content (if provided)
        if (options.customUI) {
            let sanitized_custom = html_encode(options.customUI);
            // Allow safe tags
            sanitized_custom = sanitized_custom.replace(/&lt;strong&gt;/g, '<strong>');
            sanitized_custom = sanitized_custom.replace(/&lt;\/strong&gt;/g, '</strong>');
            sanitized_custom = sanitized_custom.replace(/&lt;p&gt;/g, '<p>');
            sanitized_custom = sanitized_custom.replace(/&lt;\/p&gt;/g, '</p>');
            sanitized_custom = sanitized_custom.replace(/&lt;br&gt;/g, '<br>');
            sanitized_custom = sanitized_custom.replace(/&lt;br\/&gt;/g, '<br/>');
            
            h += `<div class="window-alert-custom" style="margin-top: 15px;">${sanitized_custom}</div>`;
        }
        
        // buttons
        if(options.buttons && options.buttons.length > 0){
            h += `<div style="overflow:hidden; margin-top:20px;">`;
            for(let y=0; y<options.buttons.length; y++){
                h += `<button class="button button-block button-${html_encode(options.buttons[y].type)} alert-resp-button" 
                                data-label="${html_encode(options.buttons[y].label)}"
                                data-value="${html_encode(options.buttons[y].value ?? options.buttons[y].label)}"
                                ${options.buttons[y].type === 'primary' ? 'autofocus' : ''}
                                >${html_encode(options.buttons[y].label)}</button>`;
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
