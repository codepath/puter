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
        h += `</div>`;

        // --- START NEW CODE BLOCK: REMOVE PICTURE BUTTON ---
        const currentPicture = window.user?.profile?.picture;
        const defaultIconPath = window.icons['profile.svg'];
        
        // Determine if the button should be hidden initially
        // It should be hidden if the current picture is null/undefined OR if it's the default icon path.
        const isCurrentlyDefault = !currentPicture || currentPicture === defaultIconPath;

        // Set the initial inline style to hide the button if no custom picture is set
        const initialDisplayStyle = isCurrentlyDefault ? 'display: none;' : '';

        // Render the button's HTML, using the inline style for visibility
        h += `<div class="remove-picture-wrapper" style="text-align: center; margin-top: -10px; margin-bottom: 20px; ${initialDisplayStyle}">`;
            h += `<button class="button button-danger remove-profile-picture">${i18n('Remove') || 'Remove Profile Picture'}</button>`;
        h += `</div>`;
        // --- END NEW CODE BLOCK ---

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

        // --- START NEW CODE BLOCK: REMOVE PICTURE HANDLER ---
        $el_window.find('.remove-profile-picture').on('click', async function (e) {
            e.preventDefault();
            
            try {
                // 1. Send the API call to clear the profile picture field (set to null)
                await update_profile(window.user.username, { picture: null });

                // 2. Optimistically update the UI to show the default picture
                const defaultIconUrl = window.icons['profile.svg'];
                $el_window.find('.profile-picture').css('background-image', `url(${html_encode(defaultIconUrl)})`);
                $('.profile-image').css('background-image', `url(${html_encode(defaultIconUrl)})`);
                $('.profile-image').removeClass('profile-image-has-picture');
                
                $el_window.find('.remove-picture-wrapper').hide();
                
                // 🚩 Re-attach the click handler with a timeout to refresh the logic!
                setTimeout(() => {
                    attachProfilePictureHandler($el_window); // Give the browser a moment to detach the old handler
                }, 0); 

                alert('Profile picture removed successfully. UI updated.');
                
            } catch (error) {
                    // If the network call itself failed (e.g., server down), show a real error
                    console.error("Error removing profile picture:", error);
                    alert('Connection Error: Could not reach the server to remove the picture.');
                }
        });
        // --- END NEW CODE BLOCK ---
        
        // Helper function to attach the profile picture upload logic
        const attachProfilePictureHandler = ($el_window) => {
            // 1. Detach any existing click handler to prevent duplicates
            $el_window.find('.change-profile-picture').off('click');
            
            // 2. Attach the click handler logic (THE ORIGINAL LOGIC IS MOVED HERE)
            $el_window.find('.change-profile-picture').on('click', async function (e) {
                UIWindow({
                    path: '/' + window.user.username + '/Desktop',
                    parent_uuid: $el_window.attr('data-element_uuid'),
                    allowed_file_types: ['.png', '.jpg', '.jpeg'],
                    show_maximize_button: false,
                    show_minimize_button: false,
                    title: 'Open',
                    is_dir: true,
                    is_openFileDialog: true,
                    selectable_body: false,
                });
            });
        }
        
        // -------------------------------------------------------------
        // Call the function on initial load
        // -------------------------------------------------------------
        attachProfilePictureHandler($el_window); // This initializes the handler!

        $el_window.on('file_opened', async function(e){
            let selected_file = Array.isArray(e.detail) ? e.detail[0] : e.detail;
            // set profile picture
            const profile_pic = await puter.fs.read(selected_file.path)
            // blob to base64
            const reader = new FileReader();
            reader.readAsDataURL(profile_pic);
            reader.onloadend = function() {
                // resizes the image to 150x150
                const img = new Image();
                img.src = reader.result;
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 150;
                    canvas.height = 150;
                    ctx.drawImage(img, 0, 0, 150, 150);
                    const base64data = canvas.toDataURL('image/png');
                    // update profile picture
                    $el_window.find('.profile-picture').css('background-image', 'url(' + html_encode(base64data) + ')');
                    $('.profile-image').css('background-image', 'url(' + html_encode(base64data) + ')');
                    $('.profile-image').addClass('profile-image-has-picture');
                    // update profile picture
                    update_profile(window.user.username, {picture: base64data})
                    
                    // 🚩 NEW CODE: Manually show the button using the wrapper class
                    $el_window.find('.remove-picture-wrapper').show();

                }
            }
        })
    },
};
