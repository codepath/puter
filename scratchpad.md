# Puter Codebase Research Guide

## Project Overview

**Puter** is an open-source Internet OS - a desktop environment in the browser. It's structured as a full-stack application with:
- **Frontend (GUI)**: `src/gui/` - Browser-based desktop environment
- **Backend**: `src/backend/` - Node.js/Express API server
- **SDK**: `src/puter-js/` - JavaScript SDK for apps
- **Additional modules**: Terminal, Git, Emulator, etc.

---

## Architecture Overview

### Frontend (GUI) - `src/gui/src/`

#### Entry Point & Initialization
- **`index.js`**: Main entry point, defines `window.gui()` function
- **`initgui.js`**: Initializes GUI, launches services, sets up desktop
- **`init_sync.js`** / **`init_async.js`**: Synchronous and asynchronous initialization

#### UI Rendering System
- **`UI/`** directory contains all UI components:
  - **`UIDesktop.js`**: Main desktop container (wallpaper, taskbar, windows)
  - **`UIWindow.js`**: Window component (draggable, resizable windows)
  - **`UIComponentWindow.js`**: Wrapper for rendering React-like components in windows
  - **`UIElement.js`**: Base UI element class
  - **`UI/*.js`**: Various UI components (Login, Settings, Alerts, etc.)

**How UI is rendered:**
1. HTML strings are generated in UI functions (e.g., `UIWindow`, `UIDesktop`)
2. Components return HTML strings that are inserted into the DOM
3. Event handlers are attached after DOM insertion
4. Components can use `Placeholder` for dynamic content

**Example flow:**
```javascript
// UIWindow creates HTML string
const win = await UIWindow({ title: "My Window", body_content: html });

// Components can be rendered in windows
const win = await UIComponentWindow({ component: myComponent });
```

#### Event Handling

**Frontend Events:**
- **IPC Events**: `src/gui/src/IPC.js` - Handles inter-process communication
  - Listens to `window.addEventListener('message', ...)`
  - Routes messages to registered handlers via `window.ipc_handlers`
  - Handles app-to-GUI communication

- **Service Events**: Services use event emitters
  - `BroadcastService`: Cross-window communication
  - `ProcessService`: Process lifecycle events
  - `ThemeService`: Theme change events

- **DOM Events**: jQuery-based event handling
  - Event listeners attached after DOM insertion
  - Custom jQuery event handlers in UI components

**Event Registration Pattern:**
```javascript
// In IPC.js - handlers registered globally
window.ipc_handlers['my-action'] = {
    handler: async (params, context) => { /* handle */ }
};

// Services emit/listen via globalThis.services
services.emit('event.name', data);
```

#### Services Architecture

**Frontend Services** (`src/gui/src/services/`):
- **`ProcessService.js`**: Manages app processes/windows
- **`IPCService.js`**: Inter-process communication
- **`ThemeService.js`**: Theme management
- **`BroadcastService.js`**: Cross-window messaging
- **`LocaleService.js`**: Internationalization
- **`SettingsService.js`**: User settings
- **`AntiCSRFService.js`**: Security tokens
- **`ExecService.js`**: Execute commands
- **`DebugService.js`**: Debugging utilities

**Service Pattern:**
```javascript
// Services are registered in initgui.js
register('service-name', new ServiceClass());

// Accessed via globalThis.services
const svc = globalThis.services.get('service-name');
```

---

### Backend - `src/backend/src/`

#### Entry Point
- **`index.js`**: Bootstraps the backend
- **`Kernel.js`**: Core kernel that manages services
- **`CoreModule.js`**: Core module installation

#### API Routing System

**Route Registration:**
- Routes are registered in **Service classes** via `['__on_install.routes']` method
- Services extend `BaseService` and hook into the service lifecycle
- Routes use Express.js with custom `eggspress` wrapper

**Key Services that register routes:**
- **`PuterAPIService.js`**: Main API endpoints (auth, filesystem, apps)
- **`FilesystemAPIService.js`**: Filesystem operations
- **`PermissionAPIService.js`**: Permission management
- **`UserProtectedEndpointsService.js`**: User-protected endpoints

**Route Definition Pattern:**
```javascript
// In a Service class
async ['__on_install.routes'] () {
    const { app } = this.services.get('web-server');
    app.use(require('../routers/my-route'));
}

// Router file uses Endpoint() helper
const Endpoint = require('../util/expressutil').Endpoint;
module.exports = Endpoint({
    route: '/api/my-endpoint',
    methods: ['GET', 'POST'],
    handler: async (req, res) => { /* ... */ }
});
```

#### Backend Services

**Service Architecture:**
- Services extend `BaseService`
- Lifecycle hooks: `_construct()`, `_init()`, `['__on_*']` methods
- Services accessed via `this.services.get('service-name')`

**Key Backend Services:**
- **`WebServerService.js`**: Express server setup
- **`FilesystemService.js`**: Filesystem operations
- **`EventService.js`**: Event emission/listening
- **`PuterHomepageService.js`**: Serves initial HTML page
- **`ExtensionService.js`**: Extension system

**Service Location:** `src/backend/src/services/`

#### Event System

**Backend Events:**
- **`EventService.js`**: Central event system
  - `emit(key, data, meta)`: Emit events
  - `on(key, callback)`: Listen to events
  - Supports wildcard patterns (`event.*`)

**Event Pattern:**
```javascript
// Emit event
await services.emit('install.routes', { app });

// Listen to event
svc_event.on('install.routes', async (key, data, meta) => {
    // Handle event
});
```

---

## How to Research a Feature

### Step 1: Identify the Feature Domain

Determine which part of the system your feature touches:
- **UI/Desktop**: Look in `src/gui/src/UI/`
- **Backend API**: Look in `src/backend/src/routers/` and `src/backend/src/services/`
- **Filesystem**: Look in `src/backend/src/filesystem/`
- **Apps/Processes**: Look at `ProcessService` and IPC system
- **Authentication**: Look in `src/backend/src/routers/auth/`

### Step 2: Find Similar Features

**For UI Features:**
1. Search for similar UI components in `src/gui/src/UI/`
2. Look at how they're structured (HTML generation, event handling)
3. Check how they're launched (from desktop, menu, etc.)
4. See what services they use

**For Backend Features:**
1. Search for similar routes in `src/backend/src/routers/`
2. Check which service registers them
3. See what middleware they use
4. Look at error handling patterns

**Search Strategy:**
```bash
# Use codebase_search to find similar features
# Example: "How does file upload work?"
# Example: "How are windows created and displayed?"
# Example: "How are API endpoints authenticated?"
```

### Step 3: Trace the Flow

**For UI Features:**
1. **Entry Point**: Where is the UI triggered? (menu, button, IPC message)
2. **UI Component**: Which UI component renders it? (`UIWindow`, `UIDesktop`, etc.)
3. **Event Handlers**: Where are events registered? (in component, IPC.js, services)
4. **API Calls**: What backend endpoints are called? (check `puter.*` SDK calls)
5. **State Management**: How is state stored? (services, KV store, DOM)

**For Backend Features:**
1. **Route Registration**: Which service registers the route?
2. **Middleware**: What middleware runs? (auth, validation, etc.)
3. **Handler**: What does the handler do?
4. **Services Used**: Which backend services are called?
5. **Database/Storage**: How is data persisted?

### Step 4: Understand Dependencies

**Frontend Dependencies:**
- **SDK**: `puter.*` API calls (from `src/puter-js/`)
- **Services**: `globalThis.services.get('service-name')`
- **IPC**: `window.ipc_handlers` for app communication
- **Libraries**: jQuery, Socket.io, etc.

**Backend Dependencies:**
- **Services**: `this.services.get('service-name')`
- **Database**: Entity storage, SQL queries
- **Filesystem**: `FilesystemService` for file operations
- **Events**: `EventService` for cross-service communication

### Step 5: Document Your Findings

Create a summary with:
- **Feature Location**: Files involved
- **Data Flow**: Request → Handler → Response
- **UI Flow**: Trigger → Component → Events → API → Update
- **Services Used**: Which services are involved
- **Similar Patterns**: How similar features work
- **Key Functions**: Important functions to understand

---

## Key Directories Reference

### Frontend (`src/gui/src/`)

| Directory | Purpose |
|-----------|---------|
| `UI/` | All UI components (windows, dialogs, desktop) |
| `services/` | Frontend services (process, theme, IPC, etc.) |
| `helpers/` | Utility functions for UI operations |
| `i18n/` | Internationalization/translations |
| `IPC.js` | Inter-process communication handler |
| `initgui.js` | GUI initialization and service setup |
| `index.js` | Entry point, defines `window.gui()` |

### Backend (`src/backend/src/`)

| Directory | Purpose |
|-----------|---------|
| `routers/` | API route handlers |
| `services/` | Backend services (filesystem, auth, etc.) |
| `modules/` | Feature modules (web, core, puterai, etc.) |
| `filesystem/` | Filesystem operations and strategies |
| `middleware/` | Express middleware (auth, CSRF, etc.) |
| `api/` | API utilities (eggspress, validators) |
| `entities/` | Database entities |
| `om/` | Object mapping/ORM system |

### SDK (`src/puter-js/src/`)

| Directory | Purpose |
|-----------|---------|
| `services/` | SDK services (XDIncoming, etc.) |
| `lib/` | SDK libraries and utilities |

---

## Common Patterns

### Pattern 1: Creating a New UI Window

```javascript
// 1. Create UI component in src/gui/src/UI/UIWindowMyFeature.js
async function UIWindowMyFeature(options) {
    let html = '';
    // Generate HTML
    html += `<div class="my-feature">...</div>`;
    
    const win = await UIWindow({
        title: "My Feature",
        body_content: html,
        width: 600,
        height: 400
    });
    
    // Attach event handlers after DOM insertion
    $(win).on('click', '.my-button', async () => {
        // Handle click
    });
    
    return win;
}

// 2. Export and use
export default UIWindowMyFeature;
// Import and call: await UIWindowMyFeature({ ... });
```

### Pattern 2: Creating a Backend API Endpoint

```javascript
// 1. Create router in src/backend/src/routers/my-feature.js
const Endpoint = require('../util/expressutil').Endpoint;

module.exports = Endpoint({
    route: '/api/my-feature',
    methods: ['POST'],
    handler: async (req, res) => {
        const { services } = req.ctx;
        // Use services
        const result = await doSomething();
        res.json({ success: true, data: result });
    }
});

// 2. Register in a Service
// In src/backend/src/services/MyService.js
async ['__on_install.routes'] () {
    const { app } = this.services.get('web-server');
    app.use(require('../routers/my-feature'));
}
```

### Pattern 3: Using Services

**Frontend:**
```javascript
// Get service
const svc_process = globalThis.services.get('process');

// Use service methods
const process = svc_process.get_by_uuid(uuid);
```

**Backend:**
```javascript
// In a service method
const { services } = this;
const svc_fs = services.get('filesystem');
const result = await svc_fs.read(path);
```

### Pattern 4: Event Handling

**Frontend Events:**
```javascript
// Listen to IPC messages
window.ipc_handlers['my-action'] = {
    handler: async (params, { ipc_context }) => {
        // Handle message
    }
};

// Use BroadcastService for cross-window
const svc_broadcast = globalThis.services.get('broadcast');
svc_broadcast.emit('event-name', data);
```

**Backend Events:**
```javascript
// Emit event
await services.emit('my.event', { data: 'value' });

// Listen to event (in a service)
svc_event.on('my.event', async (key, data, meta) => {
    // Handle event
});
```

---

## Research Checklist

Before implementing a feature, answer these questions:

### UI Features
- [ ] Where is similar UI code located?
- [ ] How is the UI component structured? (HTML generation, event handlers)
- [ ] How is the component launched/triggered?
- [ ] What services does it use?
- [ ] How does it communicate with backend? (API calls, IPC)
- [ ] How is state managed? (services, KV store, DOM)
- [ ] What events are involved? (user actions, IPC, broadcasts)

### Backend Features
- [ ] Where are similar API endpoints located?
- [ ] Which service registers the route?
- [ ] What middleware is used? (auth, validation, etc.)
- [ ] What services are called in the handler?
- [ ] How is data validated?
- [ ] How are errors handled?
- [ ] How is data persisted? (database, filesystem)

### Integration
- [ ] How does frontend call the backend?
- [ ] What data format is used? (JSON, form data, etc.)
- [ ] How are errors communicated back?
- [ ] Are there any security considerations? (CSRF, auth, validation)

---

## Example: Researching a File Upload Feature

### Step 1: Find Similar Features
- Search: "How does file upload work?"
- Found: `src/gui/src/helpers/download.js` (opposite direction)
- Found: `src/backend/src/routers/writeFile/` (file writing)

### Step 2: Trace the Flow
1. **UI Trigger**: User drags file or clicks upload button
2. **UI Component**: File picker or drag-drop handler
3. **API Call**: `puter.fs.write()` or direct API call
4. **Backend Route**: `/api/filesystem/write` or similar
5. **Handler**: Validates, processes, saves file
6. **Response**: Success/error back to frontend
7. **UI Update**: Refresh file list, show notification

### Step 3: Key Files
- Frontend: `src/gui/src/helpers/` (upload helpers)
- Backend: `src/backend/src/routers/writeFile/`
- Service: `src/backend/src/services/FilesystemService.js`
- SDK: `src/puter-js/src/` (SDK methods)

### Step 4: Services Used
- `FilesystemService`: File operations
- `ProcessService`: If app-based upload
- `AntiCSRFService`: Security tokens

---

## Tips for Effective Research

1. **Use Semantic Search**: Use `codebase_search` with descriptive questions
2. **Follow Imports**: Trace `import`/`require` statements to understand dependencies
3. **Check Service Lifecycle**: Understand when services are initialized
4. **Look for Patterns**: Similar features follow similar patterns
5. **Read Comments**: Code comments often explain architecture decisions
6. **Check Tests**: Tests show expected behavior
7. **Trace Data Flow**: Follow data from UI → API → Database and back

---

## Next Steps

When you're ready to implement a feature:

1. **Create a TODO list** with specific tasks
2. **Start with similar code** as a template
3. **Implement incrementally** - UI first, then backend, then integration
4. **Test each layer** independently
5. **Follow existing patterns** for consistency
6. **Update this document** with your findings

---

*Last updated: [Current Date]*
*Use this guide as a living document - update it as you learn more about the codebase!*

