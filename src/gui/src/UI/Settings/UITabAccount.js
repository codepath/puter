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
        h += `<div class="profile-picture-container" style="overflow: hidden; display: flex; margin-bottom: 20px; flex-direction: column; align-items: center;">`;
        const hasProfilePicture = window.user?.profile?.picture;
        const profileImageUrl = hasProfilePicture ? window.user.profile.picture : window.icons['profile.svg'];
        const profilePictureClass = hasProfilePicture ? 'profile-picture change-profile-picture profile-image-has-picture' : 'profile-picture change-profile-picture';
        h += `<div class="${profilePictureClass}" style="background-image: url('${html_encode(profileImageUrl)}');">`;
        h += `</div>`;
        // Add action buttons container
        h += `<div class="profile-picture-actions" style="display: flex; gap: 10px; margin-top: 10px;">`;
        // Only show remove button if user has a profile picture
        if (window.user?.profile?.picture) {
            h += `<button class="button button-danger remove-profile-picture">${i18n('Remove Profile Picture')}</button>`;
        }
        h += `</div>`;
        h += `</div>`;

        // change password button
        if (!window.user.is_temp) {
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
        if (window.user.email) {
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
                window_options: {
                    parent_uuid: $el_window.attr('data-element_uuid'),
                    disable_parent_window: true,
                    parent_center: true,
                }
            });
        });

        $el_window.find('.change-username').on('click', function (e) {
            UIWindowChangeUsername({
                window_options: {
                    parent_uuid: $el_window.attr('data-element_uuid'),
                    disable_parent_window: true,
                    parent_center: true,
                }
            });
        });

        $el_window.find('.change-email').on('click', function (e) {
            UIWindowChangeEmail({
                window_options: {
                    parent_uuid: $el_window.attr('data-element_uuid'),
                    disable_parent_window: true,
                    parent_center: true,
                }
            });
        });

        $el_window.find('.manage-sessions').on('click', function (e) {
            UIWindowManageSessions({
                window_options: {
                    parent_uuid: $el_window.attr('data-element_uuid'),
                    disable_parent_window: true,
                    parent_center: true,
                }
            });
        });

        $el_window.find('.delete-account').on('click', function (e) {
            UIWindowConfirmUserDeletion({
                window_options: {
                    parent_uuid: $el_window.attr('data-element_uuid'),
                    disable_parent_window: true,
                    parent_center: true,
                }
            });
        });

        // Handle clicking on profile picture or change button
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
        });

        // Handle remove profile picture button
        $el_window.find('.remove-profile-picture').on('click', async function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Remove profile picture without confirmation dialog
            try {
                await window.removeProfilePicture(window.user.username);

                // Update UI immediately after successful removal
                updateProfilePictureUI($el_window);

                // Show success message
                window.show_save_account_notice_message(i18n('profile_picture_removed') || 'Profile picture removed successfully');
            } catch (error) {
                console.error('Error removing profile picture:', error);
                // Show error message
                window.show_save_account_notice_message(i18n('error_removing_profile_picture') || 'Failed to remove profile picture. Please try again.', 'error');
            }
        });

        // Function to update profile picture UI after changes
        function updateProfilePictureUI($el_window) {
            // Use the global profile picture update function
            window.updateAllProfilePictures();

            // Update the action buttons - hide/show remove button based on picture presence
            const hasProfilePicture = window.user?.profile?.picture;
            if (hasProfilePicture) {
                // Show remove button if it doesn't exist
                if ($el_window.find('.remove-profile-picture').length === 0) {
                    $el_window.find('.profile-picture-actions').append(
                        `<button class="button button-danger remove-profile-picture">${i18n('remove')}</button>`
                    );
                    // Re-attach event handler for the new button
                    $el_window.find('.remove-profile-picture').on('click', async function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        // Remove profile picture without confirmation dialog
                        try {
                            await window.removeProfilePicture(window.user.username);
                            updateProfilePictureUI($el_window);
                            window.show_save_account_notice_message(i18n('profile_picture_removed') || 'Profile picture removed successfully');
                        } catch (error) {
                            console.error('Error removing profile picture:', error);
                            window.show_save_account_notice_message(i18n('error_removing_profile_picture') || 'Failed to remove profile picture. Please try again.', 'error');
                        }
                    });
                }
            } else {
                // Hide remove button
                $el_window.find('.remove-profile-picture').remove();
            }
        }

        $el_window.on('file_opened', async function (e) {
            let selected_file = Array.isArray(e.detail) ? e.detail[0] : e.detail;
            // set profile picture
            const profile_pic = await puter.fs.read(selected_file.path)
            // blob to base64
            const reader = new FileReader();
            reader.readAsDataURL(profile_pic);
            reader.onloadend = function () {
                // resizes the image to 150x150
                const img = new Image();
                img.src = reader.result;
                img.onload = function () {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 150;
                    canvas.height = 150;
                    ctx.drawImage(img, 0, 0, 150, 150);
                    const base64data = canvas.toDataURL('image/png');
                    // update profile picture in user object first
                    if (!window.user.profile) {
                        window.user.profile = {};
                    }
                    window.user.profile.picture = base64data;
                    // update UI using the centralized function
                    updateProfilePictureUI($el_window);
                    // update profile picture in storage
                    update_profile(window.user.username, { picture: base64data })
                }
            }
        })

    },
};
