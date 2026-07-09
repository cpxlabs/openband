# Design: Milestone 4 - Desktop Build

## Electron Architecture
The desktop app will be housed in an `electron/` directory at the project root.
- `electron/main.js`: The Electron main process. It will create a `BrowserWindow` and load the static files output by `expo export --platform web`.
- `electron/preload.js`: Exposes a safe `window.electronAPI` to the frontend using `contextBridge`.
- `electron/package.json`: A lightweight package for the desktop app specifically.

## The `@bridge` Architecture
We will create a `src/bridge` folder to abstract native capabilities:
- `interface.ts`: Defines `NativeBridge` interface with methods like `showOpenDialog`, `readFile`, `writeFile`, `showSaveDialog`.
- `browser.ts`: Browser fallbacks using `<input type="file">`, `localStorage`, etc.
- `electron.ts`: Uses `window.electronAPI`.
- `tauri.ts`: Tauri stubs for future-proofing.
- `index.ts`: The entry point that detects the environment (`window.electronAPI` vs `__TAURI__` vs Browser) and exports `OpenBandNative`.

We will also update `tsconfig.json` paths to alias `@bridge` to `src/bridge/index.ts`.

## Integration
- The frontend `Library` and `Studio` components will use `OpenBandNative` to interact with files instead of relying on pure browser APIs.
- The `npm run desktop` script will build the web app, copy it to `electron/build`, and launch the electron app.
