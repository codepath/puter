# Documentation Scratchpad

## 2024-10-08

This is place where any documentation can be written, and this documentation
may later be moved or reformatted.

I added this file because I noticed sometimes I don't write documentation
simply because I don't yet know the best place to put the documentation,
which in retrospect seems incredibly silly so instead this file should exist.


### Batch and Symlinks

All filesystem operations will eventually be available through batch requests.
Since batch requests can also handle the cases for single files, it seems silly
to support those endpoints too, so eventually most calls will be done through
`/batch`. Puter's legacy filesystem endpoints will always be supported, but a
future `api.___/fs/v2.0` urlspace for the filesystem API might not include them.

This is batch:

```javascript
await (async () => {
    const endpoint = 'http://api.puter.localhost:4100/batch';

    const ops = [ 
      {
        op: 'mkdir',
        path: '/default_user/Desktop/some-dir',
      },
      {
        op: 'write',
        path: '/default_user/Desktop/some-file.txt',
      }
    ];

    const blob = new Blob(["12345678"], { type: 'text/plain' });
    const formData = new FormData();
    for ( const op of ops ) {
      formData.append('operation', JSON.stringify(op));
    }
    formData.append('fileinfo', JSON.stringify({
        name: 'file.txt',
        size: 8,
        mime: 'text/plain',
    }));
    formData.append('file', blob, 'hello.txt');

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${puter.authToken}` },
        body: formData
    });
    return await response.json();
})();
```
Symlinks are also created via `/batch`

```javascript
await (async () => {
    const endpoint = 'http://api.puter.localhost:4100/batch';

    const ops = [ 
      {
        op: 'symlink',
        path: '~/Desktop',
        name: 'link',
        target: '/bb/Desktop/some'
      },
    ];

    const formData = new FormData();
    for ( const op of ops ) {
      formData.append('operation', JSON.stringify(op));
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${puter.authToken}` },
        body: formData
    });
    return await response.json();
})();
```

## 2025-01-XX: Fix Sidebar Header Text Contrast Bug

### Bug Description
When adjusting the lightness level of screen themes, sidebar header texts in the explorer become unreadable due to poor contrast between text and background colors.

**Current Behavior:**
- Sidebar header text color is hardcoded to `#8f96a3` in `.window-sidebar-title` CSS class
- Sidebar background adapts to theme lightness via CSS variables
- At certain lightness values, the contrast between hardcoded text color and background becomes insufficient
- Text becomes difficult or impossible to read

**Expected Behavior:**
- Sidebar header text should remain readable with adequate contrast across all theme lightness settings
- Should meet WCAG accessibility standards (minimum 4.5:1 contrast ratio for normal text)

### Root Cause Analysis

**Files Involved:**
1. `src/gui/src/css/style.css` (lines 1217-1234)
   - `.window-sidebar-title` has hardcoded `color: #8f96a3;`
   - Sidebar background uses: `hsla(var(--window-sidebar-hue), var(--window-sidebar-saturation), var(--window-sidebar-lightness), calc(0.5 + 0.5*var(--window-sidebar-alpha)))`

2. `src/gui/src/services/ThemeService.js`
   - Sets CSS variables: `--window-sidebar-hue`, `--window-sidebar-saturation`, `--window-sidebar-lightness`, `--window-sidebar-alpha`
   - Sets `--window-sidebar-color` to `var(--primary-color)` which is either white or '#373e44'
   - Does NOT set a variable for sidebar title text color

3. `src/gui/src/css/style.css` (lines 99-103)
   - CSS variables defined: `--window-sidebar-hue`, `--window-sidebar-saturation`, `--window-sidebar-lightness`, `--window-sidebar-alpha`, `--window-sidebar-color`

### Proposed Solution

#### Step 1: Create Contrast Calculation Utility
- **File**: `src/gui/src/services/ThemeService.js` (or create separate utility)
- **Action**: Add helper functions to:
  - Convert HSL to RGB
  - Calculate relative luminance (WCAG formula)
  - Calculate contrast ratio between two colors
  - Determine optimal text color (black or white) based on background color
  - Consider sidebar background's effective color: `calc(0.5 + 0.5*alpha)` means final alpha is `0.5 + 0.5*alpha`

#### Step 2: Calculate Sidebar Title Color Dynamically
- **File**: `src/gui/src/services/ThemeService.js`
- **Location**: In `reload_()` method
- **Action**:
  - Calculate effective sidebar background color (considering alpha blend: `0.5 + 0.5*alpha`)
  - Determine if background is light or dark
  - Calculate appropriate text color that meets WCAG standards
  - Set CSS variable `--window-sidebar-title-color` with calculated color
  - Consider fallback to lighter/darker shades of the theme color if pure black/white doesn't work

#### Step 3: Update CSS to Use Dynamic Color
- **File**: `src/gui/src/css/style.css`
- **Location**: `.window-sidebar-title` rule (line 1221)
- **Action**:
  - Replace hardcoded `color: #8f96a3;` with `color: var(--window-sidebar-title-color, #8f96a3);`
  - Use fallback color in case CSS variable is not set (for backwards compatibility)

#### Step 4: Testing Plan
1. Test with various lightness values (0-100%)
2. Test with different hue and saturation values
3. Verify contrast ratio meets WCAG AA standards (4.5:1) for normal text
4. Test edge cases:
   - Very light backgrounds (lig > 90%)
   - Very dark backgrounds (lig < 10%)
   - Medium backgrounds (lig ~ 50-60%)
5. Test with different alpha values
6. Visual regression testing - ensure text is readable at all settings

#### Step 5: Implementation Details

**Contrast Calculation Algorithm:**
```javascript
// Calculate relative luminance (WCAG)
function getLuminance(rgb) {
  const [r, g, b] = rgb.map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Calculate contrast ratio
function getContrastRatio(color1, color2) {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Get optimal text color
function getOptimalTextColor(backgroundColor) {
  // Calculate effective background color (considering alpha blend)
  // Try black and white, choose one with better contrast
  const blackContrast = getContrastRatio([0, 0, 0], backgroundColor);
  const whiteContrast = getContrastRatio([255, 255, 255], backgroundColor);
  
  if (blackContrast >= 4.5 || whiteContrast < 4.5) {
    return '#000000'; // or darker shade if needed
  } else {
    return '#ffffff'; // or lighter shade if needed
  }
}
```

**ThemeService Integration:**
- In `reload_()` method, after setting other CSS variables:
  1. Calculate effective sidebar background RGB
  2. Determine optimal text color
  3. Set `--window-sidebar-title-color` CSS variable

### Files to Modify

1. ✅ `src/gui/src/services/ThemeService.js`
   - Add contrast calculation utilities
   - Calculate and set `--window-sidebar-title-color` in `reload_()`

2. ✅ `src/gui/src/css/style.css`
   - Update `.window-sidebar-title` to use CSS variable with fallback

### Alternative Approaches Considered

1. **CSS-only solution using `mix-blend-mode`**: 
   - Pros: No JS needed
   - Cons: Browser compatibility issues, may affect other elements

2. **CSS `color-contrast()` function**:
   - Pros: Native CSS solution
   - Cons: Limited browser support as of 2024

3. **Predefined color palettes**:
   - Pros: Simple, predictable
   - Cons: May not work for all lightness values, less flexible

### Implementation Priority
- **High**: This is an accessibility issue affecting user experience
- **Impact**: Affects all users who customize theme lightness
- **Risk**: Low - isolated change to theme service and CSS

## 2025-12-07: Add "Set as Desktop Background" Context Menu Item to Images

### Feature Description
Add a "Set as Desktop Background" context menu option that appears when users right-click on image files. This option should:
- Only appear for image file types (PNG, JPG, etc.)
- Not appear for folders, text files, or other non-image files
- Not appear for items in trash or trashed items
- Immediately update the desktop background when clicked
- Persist the preference to user settings

### Current Behavior
- Users can set desktop background via Settings window
- Context menus on image files show standard options (Open, Download, Copy, etc.)
- No quick way to set an image as desktop background directly from file system

### Expected Behavior
- Context menu on image files includes "Set as Desktop Background" option
- Clicking it immediately applies the image as desktop background
- Preference is saved to user account and persists across sessions

### Step-by-Step Plan

#### Step 1: Add Helper Function to Detect Image Files
- **Location**: `src/gui/src/UI/UIItem.js` (or create helper file)
- **Action**: Create or use existing utility to check if a file is an image
  - Check if `options.type` starts with `'image/'` 
  - Alternatively, check file extension if MIME type not available
  - Handle common image extensions: jpg, jpeg, png, gif, webp, bmp, svg, etc.

#### Step 2: Add Helper Function to Get File Read URL
- **Location**: `src/gui/src/UI/UIItem.js` 
- **Action**: Create async function to get read_url for a file
  - Use `puter.fs.stat()` to get file information
  - Extract `read_url` from the response
  - Handle errors appropriately

#### Step 3: Add Helper Function to Set Desktop Background from File
- **Location**: `src/gui/src/UI/UIItem.js` or `src/gui/src/helpers.js`
- **Action**: Create function that:
  - Takes file path/uid as parameter
  - Gets read_url for the file
  - Calls `window.set_desktop_background()` with the URL
  - Makes POST request to `/set-desktop-bg` API endpoint to persist
  - Handles authentication (similar to UIWindowDesktopBGSettings.js)
  - Uses default fit mode 'cover' (consistent with existing behavior)

#### Step 4: Add Context Menu Item in Single Item Context Menu
- **Location**: `src/gui/src/UI/UIItem.js` - Single item context menu section (around line 964-1384)
- **Action**: 
  - Add conditional check: only show if file is an image AND not trashed AND not trash item
  - Insert menu item after "Share With…" or in appropriate location (likely after "Download" or before "Properties")
  - Use appropriate icon (could use existing desktop background or image icon)
  - Call helper function when clicked

#### Step 5: Add Internationalization String
- **Location**: Internationalization files
- **Action**: 
  - Add translation key for "Set as Desktop Background"
  - Use `i18n('set_as_desktop_background')` in menu item

#### Step 6: Add Icon for Menu Item (if needed)
- **Location**: Check if suitable icon exists in `src/gui/src/images/`
- **Action**: 
  - Use existing icon (e.g., 'desktop-bg.svg' or similar)
  - Or use generic image icon if no specific desktop background icon exists

### Files That Will Be Modified

1. **`src/gui/src/UI/UIItem.js`**
   - **Purpose**: Add context menu item and helper functions
   - **Lines**: ~740-1390 (context menu section)
   - **Changes**:
     - Add image detection logic
     - Add function to get file read_url
     - Add function to set desktop background from file
     - Add menu item in single-item context menu section
     - Conditional rendering based on file type and trash status

2. **Internationalization Files** (if applicable)
   - **Location**: `src/gui/src/i18n/` or similar
   - **Purpose**: Add translation for "Set as Desktop Background"
   - **Changes**: Add new translation key

### Functions That Will Be Modified

1. **Context Menu Handler in `UIItem.js`**
   - **Function**: Anonymous function in `$(el_item).bind("contextmenu taphold", ...)` handler
   - **Location**: Line ~740-1393
   - **Changes**:
     - Add conditional check for image files
     - Add menu item to `menu_items` array when conditions are met
     - Place menu item in appropriate position (likely after "Download" or in logical grouping)

2. **New Helper Functions to Add**:

   a. **`is_image_file(options)` or similar**
      - **Purpose**: Check if a file is an image type
      - **Logic**:
        ```javascript
        function is_image_file(options) {
            if (options.is_dir) return false;
            if (options.type && options.type.startsWith('image/')) return true;
            // Fallback: check extension
            const ext = path.extname(options.name || '').toLowerCase();
            const image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.ico'];
            return image_extensions.includes(ext);
        }
        ```

   b. **`get_file_read_url(file_path_or_uid)` or similar**
      - **Purpose**: Get read_url for a file
      - **Logic**:
        ```javascript
        async function get_file_read_url(file_path_or_uid) {
            return new Promise((resolve, reject) => {
                puter.fs.stat(file_path_or_uid, {
                    success: (fsentry) => {
                        // Get read_url - might need to call puter.fs.sign() or check fsentry structure
                        // Check how UIWindowDesktopBGSettings.js does it (line 136-138)
                        resolve(fsentry.read_url);
                    },
                    error: reject
                });
            });
        }
        ```

   c. **`set_desktop_background_from_file(file_path, file_uid)` or similar**
      - **Purpose**: Set desktop background from file and persist to server
      - **Logic**:
        ```javascript
        async function set_desktop_background_from_file(file_path, file_uid) {
            try {
                // Get read_url
                const fsentry = await new Promise((resolve, reject) => {
                    puter.fs.stat(file_path, {
                        success: resolve,
                        error: reject
                    });
                });
                
                const read_url = fsentry.read_url;
                if (!read_url) {
                    // Fallback: might need to sign the file
                    // Check how other parts of codebase get read_url
                    throw new Error('Could not get read URL for file');
                }
                
                // Set desktop background immediately
                window.set_desktop_background({
                    url: read_url,
                    fit: 'cover'
                });
                
                // Persist to server (similar to UIWindowDesktopBGSettings.js lines 164-186)
                await $.ajax({
                    url: window.api_origin + "/set-desktop-bg",
                    type: 'POST',
                    data: JSON.stringify({
                        url: read_url,
                        fit: 'cover',
                        color: null
                    }),
                    async: true,
                    contentType: "application/json",
                    headers: {
                        "Authorization": "Bearer " + window.auth_token
                    },
                    statusCode: {
                        401: function () {
                            window.logout();
                        }
                    }
                });
            } catch (err) {
                console.error('Failed to set desktop background:', err);
                UIAlert('Failed to set desktop background. Please try again.');
            }
        }
        ```

### Detailed Implementation Notes

#### Context Menu Item Placement
- **Best Position**: After "Download" and before "Zip" (around line 1185-1189)
- **Alternative**: After "Share With…" (around line 1109) or before "Properties" (around line 1357)
- **Consideration**: Group with other file operations, not with sharing/publishing options

#### Image Detection Logic
- Primary: Check `options.type` starts with `'image/'`
- Fallback: Check file extension (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`, `.svg`, etc.)
- Edge cases: 
  - Handle files without MIME type
  - Handle case-insensitive extensions
  - Exclude directories

#### Trash Item Exclusion
- Check `is_trashed` variable (line 182, 764)
- Check if path starts with `window.trash_path` (line 965)
- Check if item is the trash folder itself: `is_trash` (line 965)

#### Read URL Acquisition
- Research needed: Check how `UIWindowDesktopBGSettings.js` gets `read_url` from `selected_file.read_url` (line 138)
- May need to call `puter.fs.sign()` or similar API
- Check `open_item.js` or `launch_app.js` for examples of getting read_url

#### Error Handling
- Handle cases where file cannot be read
- Handle authentication failures
- Handle API errors gracefully
- Show user-friendly error messages

#### Testing Checklist
1. ✅ Right-click on PNG image → "Set as Desktop Background" appears
2. ✅ Right-click on JPG image → "Set as Desktop Background" appears
3. ✅ Right-click on non-image file → "Set as Desktop Background" does NOT appear
4. ✅ Right-click on folder → "Set as Desktop Background" does NOT appear
5. ✅ Right-click on image in trash → "Set as Desktop Background" does NOT appear
6. ✅ Click "Set as Desktop Background" → Background changes immediately
7. ✅ Background persists after page refresh
8. ✅ Background persists across sessions (after logout/login)
9. ✅ Menu item appears in correct position
10. ✅ Icon displays correctly (if added)
11. ✅ Internationalization works for non-English languages

### Implementation Priority
- **Medium-High**: User experience enhancement
- **Impact**: Improves convenience for users who want to customize desktop
- **Risk**: Low - isolated change to context menu, reuses existing desktop background functionality
- **Dependencies**: None - uses existing APIs and functions

## 2025--XX: Auto-Hide Top Toolbar Feature

### Feature Description
Implement an auto-hide feature for the top toolbar that hides it after 2 seconds of inactivity and shows it again when the mouse moves near the top edge of the screen (within 50px).

### Current Behavior
- Top toolbar is always visible
- Toolbar occupies screen space continuously (30px height)
- No option to hide or minimize toolbar

### Expected Behavior
- Toolbar automatically hides after 2 seconds of mouse inactivity
- Toolbar reappears when mouse moves within 50px of top screen edge
- Smooth fade/slide animation for hiding and showing
- Optional setting to toggle auto-hide on/off (default: off for backwards compatibility)
- Maintains full functionality when visible

### Step-by-Step Implementation Plan

#### Step 1: Add CSS Classes for Auto-Hide Animation
- **File**: `src/gui/src/css/style.css`
- **Location**: After `.toolbar` class definition (around line 1752)
- **Action**: Add CSS classes for hidden state and transitions
  - `.toolbar-auto-hide-hidden` - class to hide toolbar
  - CSS transition for smooth animation (opacity and transform)
  - Ensure toolbar maintains functionality when transitioning

#### Step 2: Add User Preference for Auto-Hide
- **File**: `src/gui/src/globals.js`
- **Location**: In `window.user_preferences` defaults (around line 98-102)
- **Action**: Add default preference: `toolbar_auto_hide: false`
- **File**: `src/gui/src/UI/UIDesktop.js`
- **Location**: In user preferences loading section (around line 709-713)
- **Action**: Load `toolbar_auto_hide` preference from KV store

#### Step 3: Add Auto-Hide Logic to UIDesktop
- **File**: `src/gui/src/UI/UIDesktop.js`
- **Location**: After toolbar HTML insertion (around line 1146)
- **Action**: 
  - Initialize auto-hide state variables
  - Set up mouse move tracking
  - Set up inactivity timeout (2 seconds)
  - Implement show/hide functions with smooth animations
  - Check mouse proximity to top edge (50px threshold)

#### Step 4: Add Settings UI Toggle (Optional but Recommended)
- **File**: `src/gui/src/UI/Settings/UITabPersonalization.js` or appropriate settings tab
- **Action**: Add checkbox/toggle to enable/disable auto-hide feature
- **Action**: Save preference using `window.mutate_user_preferences()`

### Files That Will Be Modified

1. **`src/gui/src/css/style.css`**
   - **Purpose**: Add CSS for auto-hide animation
   - **Changes**: 
     - Add `.toolbar-auto-hide-hidden` class with transform/opacity
     - Add transition properties for smooth animation
     - Ensure z-index and positioning work correctly when hidden

2. **`src/gui/src/globals.js`**
   - **Purpose**: Add default preference value
   - **Changes**: Add `toolbar_auto_hide: false` to default preferences

3. **`src/gui/src/UI/UIDesktop.js`**
   - **Purpose**: Implement auto-hide logic
   - **Changes**:
     - Load `toolbar_auto_hide` preference
     - Add mouse tracking event listeners
     - Add timeout management for inactivity
     - Add show/hide functions
     - Conditional logic to only activate if preference is enabled

4. **`src/gui/src/UI/Settings/UITabPersonalization.js`** (Optional)
   - **Purpose**: Add UI toggle for feature
   - **Changes**: Add checkbox/toggle control

5. **`src/gui/src/helpers/update_mouse_position.js`** (May need to check)
   - **Purpose**: Verify mouse position tracking is available
   - **Action**: Check if `window.mouseY` is already being tracked

### Functions That Will Be Modified/Created

1. **New Functions in `UIDesktop.js`**:

   a. **`init_toolbar_auto_hide()`**
      - **Purpose**: Initialize auto-hide functionality
      - **Logic**:
        ```javascript
        function init_toolbar_auto_hide() {
            if (!window.user_preferences.toolbar_auto_hide) return;
            
            let hideTimeout;
            let isHidden = false;
            const toolbar = $('.toolbar');
            const HIDE_DELAY = 2000; // 2 seconds
            const SHOW_THRESHOLD = 50; // 50px from top
            
            function hideToolbar() {
                if (!isHidden) {
                    toolbar.addClass('toolbar-auto-hide-hidden');
                    isHidden = true;
                }
            }
            
            function showToolbar() {
                if (isHidden) {
                    toolbar.removeClass('toolbar-auto-hide-hidden');
                    isHidden = false;
                }
                clearTimeout(hideTimeout);
                hideTimeout = setTimeout(hideToolbar, HIDE_DELAY);
            }
            
            // Track mouse movement
            $(document).on('mousemove', function(e) {
                if (e.clientY <= SHOW_THRESHOLD) {
                    showToolbar();
                } else {
                    // Reset hide timeout if toolbar is visible
                    if (!isHidden) {
                        clearTimeout(hideTimeout);
                        hideTimeout = setTimeout(hideToolbar, HIDE_DELAY);
                    }
                }
            });
            
            // Initial timeout
            hideTimeout = setTimeout(hideToolbar, HIDE_DELAY);
        }
        ```

   b. **Toolbar event handlers**
      - When toolbar buttons are hovered/clicked, keep toolbar visible
      - Reset timeout on toolbar interaction

### Implementation Details

#### CSS Animation Approach
- Use `transform: translateY(-100%)` to slide up
- Use `opacity: 0` for fade effect
- Transition duration: ~300ms for smooth animation
- Use `pointer-events: none` when hidden to prevent interaction issues

#### Mouse Tracking
- Use existing `window.mouseY` if available from `update_mouse_position.js`
- Or use `$(document).mousemove()` event with `e.clientY`
- Check `e.clientY <= 50` to show toolbar

#### Timeout Management
- Clear existing timeout before setting new one
- Handle edge cases (window focus, mouse leaving window, etc.)

#### Backwards Compatibility
- Default to `toolbar_auto_hide: false` so existing users are not affected
- Feature only activates if explicitly enabled

### Testing Checklist
1. ✅ Toolbar remains visible by default (backwards compatibility)
2. ✅ Enable auto-hide in settings (if implemented)
3. ✅ Toolbar hides after 2 seconds of inactivity
4. ✅ Toolbar shows when mouse moves near top edge (within 50px)
5. ✅ Smooth animation when hiding/showing
6. ✅ Toolbar buttons remain functional when visible
7. ✅ Toolbar stays visible when hovering over it
8. ✅ Toolbar stays visible when clicking toolbar buttons
9. ✅ Preference persists across page refresh
10. ✅ Works on different screen sizes
11. ✅ Works when window loses focus and regains focus

### Implementation Priority
- **Medium**: User experience enhancement
- **Impact**: Improves screen space utilization
- **Risk**: Low - isolated change, backwards compatible (default off)
- **Dependencies**: None - uses existing mouse tracking and preferences system
