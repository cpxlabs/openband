# Tasks: Milestone 4 - Desktop Build

## Phase 1: Electron Setup
- [x] Initialize `electron/` folder with `main.js`, `preload.js`, and `package.json`.
- [x] Install electron dependencies inside `electron/` folder (`npm i electron --save-dev`).
- [x] Implement `contextBridge` in `preload.js` with `showOpenDialog`, `readFile`, `writeFile`, `showSaveDialog`.
- [x] Implement `ipcMain` handlers in `main.js` using Node's `fs` and `dialog`.

## Phase 2: The `@bridge` Implementation
- [x] Create `src/bridge/interface.ts` defining `NativeBridge`.
- [x] Create `src/bridge/browser.ts` with web-safe fallbacks.
- [x] Create `src/bridge/electron.ts` that delegates to `window.electronAPI`.
- [x] Create `src/bridge/tauri.ts` with placeholder methods.
- [x] Create `src/bridge/index.ts` to export the detected `OpenBandNative` instance.
- [x] Update `tsconfig.json` to alias `@bridge` to `./src/bridge/index.ts`.

## Phase 3: Integration & Scripts
- [x] Ensure `library.tsx` or `projectStore.ts` uses `@bridge` for importing/exporting.
- [x] Add `desktop` script to root `package.json` to build Expo web and run Electron.
- [ ] Run checks (`tsc`, `vitest`).
