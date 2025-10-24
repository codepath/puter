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

import UIAlert from "../UI/UIAlert.js";
import { Service } from "../definitions.js";

const PUTER_THEME_DATA_FILENAME = '~/.__puter_gui.json';

const SAVE_COOLDOWN_TIME = 1000;

const default_values = {
    sat: 41.18,
    hue: 210,
    lig: 93.33,
    alpha: 0.8,
    light_text: false,
};

export class ThemeService extends Service {
    #broadcastService;

    async _init () {
        this.#broadcastService = globalThis.services.get('broadcast');

        this.state = {
            sat: 41.18,
            hue: 210,
            lig: 93.33,
            alpha: 0.8,
            light_text: false,
        };
        this.root = document.querySelector(':root');
        // this.ss = new CSSStyleSheet();
        // document.adoptedStyleSheets.push(this.ss);

        this.save_cooldown_ = undefined;

        let data = undefined;
        try {
            data = await puter.fs.read(PUTER_THEME_DATA_FILENAME);
            if ( typeof data === 'object' ) {
                data = await data.text();
            }
        } catch (e) {
            if ( e.code !== 'subject_does_not_exist' ) {
                // TODO: once we have an event log,
                //       log this error to the event log
                console.error(e);

                // We don't show an alert because it's likely
                // other things also aren't working.
            }
        }

        if ( data ) try {
            data = JSON.parse(data.toString());
        } catch (e) {
            data = undefined;
            console.error(e);

            UIAlert({
                title: 'Error loading theme data',
                message: `Could not parse "${PUTER_THEME_DATA_FILENAME}": ` +
                    e.message,
            });
        }

        if ( data && data.colors ) {
            this.state = {
                ...this.state,
                ...data.colors,
            };
            this.reload_();
        }
    }

    reset () {
        this.state = default_values;
        this.reload_();
        puter.fs.delete(PUTER_THEME_DATA_FILENAME);
    }

    apply (values) {
        this.state = {
            ...this.state,
            ...values,
        };
        this.reload_();
        this.save_();
    }

    get(key) { return this.state[key]; }

    /**
     * Calculate appropriate text color based on background lightness
     * Uses WCAG-compliant luminance calculation for better contrast
     * @param {number} lightness - Background lightness percentage (0-100)
     * @param {number} saturation - Background saturation percentage (0-100)
     * @returns {string} - 'white' for dark backgrounds, '#373e44' for light backgrounds
     */
    calculateSidebarTextColor(lightness, saturation) {
        // Convert HSL to relative luminance for WCAG compliance
        const hue = this.state.hue || 210;
        const relativeLuminance = this.calculateRelativeLuminance(hue, saturation, lightness);
        
        // WCAG AA requires 4.5:1 contrast ratio for normal text
        // Calculate contrast ratios for both white and dark text options
        const whiteContrast = this.calculateContrastRatio(1.0, relativeLuminance);
        const darkContrast = this.calculateContrastRatio(0.2, relativeLuminance); // #373e44 ≈ 0.2 luminance
        
        // Choose text color that provides better contrast, preferring WCAG AA compliance
        return whiteContrast >= darkContrast ? 'white' : '#373e44';
    }

    /**
     * Calculate relative luminance from HSL values according to WCAG guidelines
     */
    calculateRelativeLuminance(hue, saturation, lightness) {
        // Convert HSL to RGB first
        const h = hue / 360;
        const s = saturation / 100;
        const l = lightness / 100;
        
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = l - c / 2;
        
        let r, g, b;
        if (h < 1/6) { r = c; g = x; b = 0; }
        else if (h < 2/6) { r = x; g = c; b = 0; }
        else if (h < 3/6) { r = 0; g = c; b = x; }
        else if (h < 4/6) { r = 0; g = x; b = c; }
        else if (h < 5/6) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        
        r = (r + m);
        g = (g + m);
        b = (b + m);
        
        // Apply gamma correction and calculate luminance
        const sRGBToLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        return 0.2126 * sRGBToLinear(r) + 0.7152 * sRGBToLinear(g) + 0.0722 * sRGBToLinear(b);
    }

    /**
     * Calculate contrast ratio between two luminance values
     */
    calculateContrastRatio(luminance1, luminance2) {
        const lighter = Math.max(luminance1, luminance2);
        const darker = Math.min(luminance1, luminance2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    reload_() {
        // debugger;
        const s = this.state;
        // this.ss.replace(`
        //     .taskbar, .window-head, .window-sidebar {
        //         background-color: hsla(${s.hue}, ${s.sat}%, ${s.lig}%, ${s.alpha});
        //     }
        // `)
        // this.root.style.setProperty('--puter-window-background', `hsla(${s.hue}, ${s.sat}%, ${s.lig}%, ${s.alpha})`);
        this.root.style.setProperty('--primary-hue', s.hue);
        this.root.style.setProperty('--primary-saturation', s.sat + '%');
        this.root.style.setProperty('--primary-lightness', s.lig + '%');
        this.root.style.setProperty('--primary-alpha', s.alpha);
        this.root.style.setProperty('--primary-color', s.light_text ? 'white' : '#373e44');

        // Calculate appropriate sidebar text color based on background lightness
        const sidebarTextColor = this.calculateSidebarTextColor(s.lig, s.sat);
        const sidebarTextContrast = sidebarTextColor === 'white' ? '#ffffff' : '#373e44';

        // Set CSS custom properties for sidebar text colors
        this.root.style.setProperty('--sidebar-text-color', sidebarTextColor);
        this.root.style.setProperty('--sidebar-text-contrast', sidebarTextContrast);

        // TODO: Should we debounce this to reduce traffic?
        this.#broadcastService.sendBroadcast('themeChanged', {
            palette: {
                primaryHue: s.hue,
                primarySaturation: s.sat + '%',
                primaryLightness: s.lig + '%',
                primaryAlpha: s.alpha,
                primaryColor: s.light_text ? 'white' : '#373e44',
            },
        }, { sendToNewAppInstances: true });
    }   

    save_ () {
        if ( this.save_cooldown_ ) {
            clearTimeout(this.save_cooldown_);
        }
        this.save_cooldown_ = setTimeout(() => {
            this.commit_save_();
        }, SAVE_COOLDOWN_TIME);
    }
    commit_save_ () {
        puter.fs.write(PUTER_THEME_DATA_FILENAME, JSON.stringify(
            { colors: this.state },
            undefined,
            5,
        ));
    }
}
