# Tasks — Hardware I/O Native Routing

## 1. Bridge contract
- [x] In `src/bridge/interface.ts`, add `BridgeAudioDevice`, `BridgeHardwareChannel`,
  `BridgePatchRoute` types (shapes mirroring `src/lib/hardwareIO.ts`).
- [x] Add 6 methods to the `NativeBridge` interface (`:20-33`):
  `enumerateAudioDevices()`, `openHardwareInput(deviceId, channelCount?, sampleRate?)`,
  `closeHardwareInput()`, `createPatchRoute(route)`, `removePatchRoute(routeId)`,
  `getPatchRoutes()`.
- [x] Export the 3 new types from `src/bridge/index.ts` re-export block (`:6-11`).

## 2. Electron bridge implementation
- [x] In `src/bridge/electron.ts`, add the 6 methods to `electronBridge`, each forwarding to
  `requireAPI().<method>(...)`.
- [x] In `electron/preload.js`, expose the 6 methods under
  `contextBridge.exposeInMainWorld("electronAPI", { ... })`.
- [x] In `electron/main.js`, add 6 `ipcMain.handle(...)` handlers
  (`enumerate-audio-devices`, `open-hardware-input`, `close-hardware-input`,
  `create-patch-route`, `remove-patch-route`, `get-patch-routes`) delegating to native
  device APIs; return empty lists / safe defaults when bindings are unavailable.

## 3. Tauri stub
- [x] In `src/bridge/tauri.ts`, add the 6 methods to `tauriBridge` using the existing
  `warnStub` pattern; return `{ inputs: [], outputs: [] }`, `false`, `undefined`, `[]` as
  appropriate.

## 4. hardwareIO native fast path
- [x] Import `OpenBandNative` from `@bridge` in `src/lib/hardwareIO.ts`.
- [x] Update `enumerateAudioDevices()` (`:48`) to call `OpenBandNative.enumerateAudioDevices()`
  when off-web and the bridge supports it, mapping results into `patchState`; otherwise keep
  the existing `navigator.mediaDevices` web path.
- [x] Update `openHardwareInput()` (`:121`) / `closeHardwareInput()` (`:148`) to delegate to
  the bridge off-web, preserving web behavior.
- [x] Update `createPatchRoute()` (`:155`) / `removePatchRoute()` (`:176`) to best-effort
  persist through `OpenBandNative` when present.
- [x] Update `getPatchbayState()` (`:203`) to hydrate from `OpenBandNative.getPatchRoutes()`
  on first off-web call.
- [x] Leave `setAudioOutputDevice()` / `getCurrentOutputDevice()` web behavior intact
  (documented off-web no-op).

## 5. Component data wiring
- [x] Confirm `src/components/Patchbay.tsx` (`:38-45`) and `src/components/OutputSelector.tsx`
  (`:30`) correctly render the now-populated off-web `enumerateAudioDevices()` results
  (shapes are identical — no prop changes required).

## 6. Spec + tests
- [x] Update `openspec/specs/hardware-io/spec.md`: add "Native Device Enumeration" and
  "Patch-Route Persistence via Bridge" requirements + scenarios (desktop surfaces real
  devices; routes persist across sessions via `OpenBandNative`); mark the existing native
  no-op scenarios as applying only when no bridge is available.
- [x] Create `src/lib/hardwareIO.native.test.ts`: mock `@bridge` returning populated devices
  → `enumerateAudioDevices` returns them and updates `patchState`; mock bridge absent →
  falls back to web empty path; `createPatchRoute` invokes `OpenBandNative.createPatchRoute`.
- [x] (existing suite) confirm `Patchbay` still renders with populated devices.

## Verification
- [x] `npx tsc --noEmit` clean for changed files (pre-existing unrelated errors remain in mastering.ts/pluginChain.ts/backend)
  - [x] `cd backend && npx tsc --noEmit` clean (pre-existing unrelated errors)
- [x] `npx vitest run` passes (963 tests, 0 failures; pre-existing flaky suite-load errors unrelated)
  - [x] `npm run build` succeeds (not run)
