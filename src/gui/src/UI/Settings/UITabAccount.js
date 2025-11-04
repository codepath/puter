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

import UIWindowChangePassword from '../UIWindowChangePassword.js';
import UIWindowChangeEmail from './UIWindowChangeEmail.js';
import UIWindowChangeUsername from '../UIWindowChangeUsername.js';
import UIWindowConfirmUserDeletion from './UIWindowConfirmUserDeletion.js';
import UIWindowManageSessions from '../UIWindowManageSessions.js';
import UIWindow from '../UIWindow.js';
import UINotification from '../UINotification.js';

// About
export default {
    id: 'account',
    title_i18n_key: 'account',
    icon: 'user.svg',
    html: () => {
        let h = '';
        // h += `<h1>${i18n('account')}</h1>`;

        // profile picture
        h += `<div style="overflow: hidden; display: flex; margin-bottom: 20px; flex-direction: column; align-items: center;">`;
            h += `<div class="profile-picture change-profile-picture" style="background-image: url('${html_encode(window.user?.profile?.picture ?? window.icons['profile.svg'])}');">`;
            h += `</div>`;
            // Remove profile picture button (only show if picture exists)
            if(window.user?.profile?.picture){
                h += `<button class="button remove-profile-picture" style="margin-top: 10px;">${i18n('remove_profile_picture')}</button>`;
            }
        h += `</div>`;

        // change password button
        if(!window.user.is_temp){
            h += `<div class="settings-card">`;
                h += `<strong>${i18n('password')}</strong>`;
                h += `<div style="flex-grow:1;">`;
                    h += `<button class="button change-password" style="float:right;">${i18n('change_password')}</button>`;
                h += `</div>`;
            h += `</div>`;
        }

        // change username button
        h += `<div class="settings-card">`;
            h += `<div>`;
                h += `<strong style="display:block;">${i18n('username')}</strong>`;
                h += `<span class="username" style="display:block; margin-top:5px;">${html_encode(window.user.username)}</span>`;
            h += `</div>`;
            h += `<div style="flex-grow:1;">`;
                h += `<button class="button change-username" style="float:right;">${i18n('change_username')}</button>`;
            h += `</div>`
        h += `</div>`;

        // change email button
        if(window.user.email){
            h += `<div class="settings-card">`;
                h += `<div>`;
                    h += `<strong style="display:block;">${i18n('email')}</strong>`;
                    h += `<span class="user-email" style="display:block; margin-top:5px;">${html_encode(window.user.email)}</span>`;
                h += `</div>`;
                h += `<div style="flex-grow:1;">`;
                    h += `<button class="button change-email" style="float:right;">${i18n('change_email')}</button>`;
                h += `</div>`;
            h += `</div>`;
        }

        // 'Delete Account' button
        h += `<div class="settings-card settings-card-danger">`;
            h += `<strong style="display: inline-block;">${i18n("delete_account")}</strong>`;
            h += `<div style="flex-grow:1;">`;
                h += `<button class="button button-danger delete-account" style="float:right;">${i18n("delete_account")}</button>`;
            h += `</div>`;
        h += `</div>`;

        return h;
    },
    init: ($el_window) => {
        $el_window.find('.change-password').on('click', function (e) {
            UIWindowChangePassword({
                window_options:{
                    parent_uuid: $el_window.attr('data-element_uuid'),
                    disable_parent_window: true,
                    parent_center: true,
                }
            });
        });

        $el_window.find('.change-username').on('click', function (e) {
            UIWindowChangeUsername({
                window_options:{
                    parent_uuid: $el_window.attr('data-element_uuid'),
                    disable_parent_window: true,
                    parent_center: true,
                }
            });
        });

        $el_window.find('.change-email').on('click', function (e) {
            UIWindowChangeEmail({
                window_options:{
                    parent_uuid: $el_window.attr('data-element_uuid'),
                    disable_parent_window: true,
                    parent_center: true,
                }
            });
        });

        $el_window.find('.manage-sessions').on('click', function (e) {
            UIWindowManageSessions({
                window_options:{
                    parent_uuid: $el_window.attr('data-element_uuid'),
                    disable_parent_window: true,
                    parent_center: true,
                }
            });
        });

        $el_window.find('.delete-account').on('click', function (e) {
            UIWindowConfirmUserDeletion({
                window_options:{
                    parent_uuid: $el_window.attr('data-element_uuid'),
                    disable_parent_window: true,
                    parent_center: true,
                }
            });
        });

        $el_window.find('.change-profile-picture').on('click', async function (e) {
            // open dialog
            UIWindow({
                path: '/' + window.user.username + '/Desktop',
                // this is the uuid of the window to which this dialog will return
                parent_uuid: $el_window.attr('data-element_uuid'),
                allowed_file_types: ['.png', '.jpg', '.jpeg'],
                show_maximize_button: false,
                show_minimize_button: false,
                title: 'Open',
                is_dir: true,
                is_openFileDialog: true,
                selectable_body: false,
            });    
        })

        $el_window.find('.remove-profile-picture').on('click', function (e) {
            try {
                // Remove profile picture
                update_profile(window.user.username, {picture: null});
                
                // Update UI elements to show default avatar
                const defaultAvatar = window.icons['profile.svg'];
                $el_window.find('.profile-picture').css('background-image', 'url(' + html_encode(defaultAvatar) + ')');
                $('.profile-image').css('background-image', 'url(' + html_encode(defaultAvatar) + ')');
                $('.profile-image').removeClass('profile-image-has-picture');
                
                // Hide the remove button
                $el_window.find('.remove-profile-picture').hide();
            } catch (error) {
                console.error('Error removing profile picture:', error);
                UINotification({
                    title: i18n('profile_picture_remove_failed'),
                    text: error?.message || i18n('error_unknown_cause'),
                    icon: window.icons['error.svg'] || window.icons['bell.svg']
                });
            }
        })

        $el_window.on('file_opened', async function(e){
            let selected_file = Array.isArray(e.detail) ? e.detail[0] : e.detail;
            
            try {
                // Optional validation: check file extension if we can detect it
                // The dialog already filters for .png, .jpg, .jpeg, so we only validate
                // if we can clearly detect an invalid extension
                const fileName = selected_file.name || selected_file.fsentry_name || selected_file.path?.split('/').pop() || '';
                const fileExtension = fileName.toLowerCase().split('.').pop();
                const allowedExtensions = ['png', 'jpg', 'jpeg'];
                
                // Only reject if we have a filename with extension AND it's clearly invalid
                // If we can't determine the extension, trust the dialog filtering
                if (fileName && fileExtension && fileName.includes('.')) {
                    if (!allowedExtensions.includes(fileExtension)) {
                        console.log('Invalid file extension detected:', fileExtension, 'from file:', selected_file);
                        UINotification({
                            title: i18n('profile_picture_invalid_file'),
                            text: i18n('profile_picture_invalid_file'),
                            icon: window.icons['error.svg'] || window.icons['bell.svg']
                        });
                        return;
                    }
                }

                // Read the file
                const profile_pic = await puter.fs.read(selected_file.path);
                
                // Validate file size (e.g., max 10MB for profile pictures)
                const maxSize = 10 * 1024 * 1024; // 10MB
                if (profile_pic.size && profile_pic.size > maxSize) {
                    UINotification({
                        title: i18n('profile_picture_upload_failed'),
                        text: i18n('profile_picture_too_large'),
                        icon: window.icons['error.svg'] || window.icons['bell.svg']
                    });
                    return;
                }

                // blob to base64
                const reader = new FileReader();
                
                reader.onerror = function() {
                    UINotification({
                        title: i18n('profile_picture_upload_failed'),
                        text: i18n('error_unknown_cause'),
                        icon: window.icons['error.svg'] || window.icons['bell.svg']
                    });
                };

                reader.onloadend = function() {
                    try {
                        // Validate that we got a data URL
                        if (!reader.result || typeof reader.result !== 'string' || !reader.result.startsWith('data:')) {
                            throw new Error('Invalid file data');
                        }

                        // resizes the image to 150x150
                        const img = new Image();
                        
                        img.onerror = function() {
                            UINotification({
                                title: i18n('profile_picture_load_failed'),
                                text: i18n('profile_picture_load_failed'),
                                icon: window.icons['error.svg'] || window.icons['bell.svg']
                            });
                        };

                        img.onload = function() {
                            try {
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                
                                if (!ctx) {
                                    throw new Error('Canvas context not available');
                                }
                                
                                canvas.width = 150;
                                canvas.height = 150;
                                ctx.drawImage(img, 0, 0, 150, 150);
                                const base64data = canvas.toDataURL('image/png');
                                
                                if (!base64data || !base64data.startsWith('data:image')) {
                                    throw new Error('Failed to convert image to base64');
                                }
                                
                                // update profile picture
                                $el_window.find('.profile-picture').css('background-image', 'url(' + html_encode(base64data) + ')');
                                $('.profile-image').css('background-image', 'url(' + html_encode(base64data) + ')');
                                $('.profile-image').addClass('profile-image-has-picture');
                                
                                // update profile picture
                                update_profile(window.user.username, {picture: base64data});
                                
                                // Show or create the remove button
                                let $removeBtn = $el_window.find('.remove-profile-picture');
                                if($removeBtn.length === 0){
                                    // Create the button if it doesn't exist
                                    $removeBtn = $(`<button class="button remove-profile-picture" style="margin-top: 10px;">${i18n('remove_profile_picture')}</button>`);
                                    $el_window.find('.profile-picture').parent().append($removeBtn);
                                    // Add click handler for the newly created button
                                    $removeBtn.on('click', function (e) {
                                        try {
                                            // Remove profile picture
                                            update_profile(window.user.username, {picture: null});
                                            
                                            // Update UI elements to show default avatar
                                            const defaultAvatar = window.icons['profile.svg'];
                                            $el_window.find('.profile-picture').css('background-image', 'url(' + html_encode(defaultAvatar) + ')');
                                            $('.profile-image').css('background-image', 'url(' + html_encode(defaultAvatar) + ')');
                                            $('.profile-image').removeClass('profile-image-has-picture');
                                            
                                            // Hide the remove button
                                            $removeBtn.hide();
                                        } catch (error) {
                                            console.error('Error removing profile picture:', error);
                                            UINotification({
                                                title: i18n('profile_picture_remove_failed'),
                                                text: error?.message || i18n('error_unknown_cause'),
                                                icon: window.icons['error.svg'] || window.icons['bell.svg']
                                            });
                                        }
                                    });
                                } else {
                                    $removeBtn.show();
                                }
                            } catch (error) {
                                console.error('Error processing image:', error);
                                UINotification({
                                    title: i18n('profile_picture_update_failed'),
                                    text: error?.message || i18n('error_unknown_cause'),
                                    icon: window.icons['error.svg'] || window.icons['bell.svg']
                                });
                            }
                        };
                        
                        img.src = reader.result;
                    } catch (error) {
                        console.error('Error reading file:', error);
                        UINotification({
                            title: i18n('profile_picture_upload_failed'),
                            text: error?.message || i18n('error_unknown_cause'),
                            icon: window.icons['error.svg'] || window.icons['bell.svg']
                        });
                    }
                };

                reader.readAsDataURL(profile_pic);
            } catch (error) {
                console.error('Error reading profile picture file:', error);
                UINotification({
                    title: i18n('profile_picture_upload_failed'),
                    text: error?.message || i18n('error_unknown_cause'),
                    icon: window.icons['error.svg'] || window.icons['bell.svg']
                });
            }
        })
    },
};
