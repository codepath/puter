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

/**
 * Convert HSL color to RGB array [r, g, b] with values 0-255
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {Array<number>} RGB array [r, g, b] with values 0-255
 */
function hslToRgb(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
    ];
}

/**
 * Calculate relative luminance using WCAG formula
 * @param {Array<number>} rgb - RGB array [r, g, b] with values 0-255
 * @returns {number} Relative luminance (0-1)
 */
function getLuminance(rgb) {
    const [r, g, b] = rgb.map(val => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 * @param {Array<number>} rgb1 - First RGB array [r, g, b] with values 0-255
 * @param {Array<number>} rgb2 - Second RGB array [r, g, b] with values 0-255
 * @returns {number} Contrast ratio (1-21)
 */
function getContrastRatio(rgb1, rgb2) {
    const l1 = getLuminance(rgb1);
    const l2 = getLuminance(rgb2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Blend color with white background (simulating alpha blend on white)
 * Sidebar uses: calc(0.5 + 0.5*alpha), so effective alpha is 0.5 + 0.5*alpha
 * When alpha=1, effective is 1.0; when alpha=0, effective is 0.5
 * @param {Array<number>} rgb - RGB array [r, g, b] with values 0-255
 * @param {number} alpha - Alpha value (0-1)
 * @returns {Array<number>} Blended RGB array [r, g, b] with values 0-255
 */
function blendWithWhite(rgb, alpha) {
    const effectiveAlpha = 0.5 + 0.5 * alpha;
    const [r, g, b] = rgb;
    return [
        Math.round(r * effectiveAlpha + 255 * (1 - effectiveAlpha)),
        Math.round(g * effectiveAlpha + 255 * (1 - effectiveAlpha)),
        Math.round(b * effectiveAlpha + 255 * (1 - effectiveAlpha))
    ];
}

/**
 * Determine optimal text color (black or white) based on background color
 * Returns the color that provides better contrast meeting WCAG AA standards (4.5:1)
 * @param {Array<number>} backgroundColor - RGB array [r, g, b] with values 0-255
 * @returns {string} Hex color string ('#000000' for black, '#ffffff' for white)
 */
function getOptimalTextColor(backgroundColor) {
    const black = [0, 0, 0];
    const white = [255, 255, 255];
    
    const blackContrast = getContrastRatio(black, backgroundColor);
    const whiteContrast = getContrastRatio(white, backgroundColor);
    
    // Choose the color with better contrast
    // If both meet 4.5:1, prefer the one with higher contrast
    // If neither meets 4.5:1, still choose the better one
    if (blackContrast >= whiteContrast) {
        return '#000000';
    } else {
        return '#ffffff';
    }
}

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
        }
        // Always reload to set initial CSS variables
        this.reload_();
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

    get (key) { return this.state[key]; }

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

        // Calculate optimal sidebar colors based on effective background color
        // Sidebar background uses: calc(0.5 + 0.5*alpha), so we need to blend with white
        try {
            const sidebarRgb = hslToRgb(s.hue, s.sat, s.lig);
            const blendedSidebarRgb = blendWithWhite(sidebarRgb, s.alpha);
            const sidebarTextColor = getOptimalTextColor(blendedSidebarRgb);
            
            // Set CSS variables for both sidebar title and sidebar items
            this.root.style.setProperty('--window-sidebar-title-color', sidebarTextColor);
            this.root.style.setProperty('--window-sidebar-item-color', sidebarTextColor);
            console.log('[ThemeService] Sidebar text colors set to:', sidebarTextColor);
        } catch (error) {
            console.error('[ThemeService] Error calculating sidebar colors:', error);
        }

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
