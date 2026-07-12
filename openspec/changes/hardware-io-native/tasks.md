# Tasks — Hardware I/O Native Routing

## 1. Bridge contract
- [ ] In `src/bridge/interface.ts`, add `BridgeAudioDevice`, `BridgeHardwareChannel`,
  `BridgePatchRoute` types (shapes mirroring `src/lib/hardwareIO.ts`).
- [ ] Add 6 methods to the `NativeBridge` interface (`:20-33`):
  `enumerateAudioDevices()`, `openHardwareInput(deviceId, channelCount?, sampleRate?)`,
  `closeHardwareInput()`, `createPatchRoute(route)`, `removePatchRoute(routeId)`,
  `getPatchRoutes()`.
- [ ] Export the 3 new types from `src/bridge/index.ts` re-export block (`:6-11`).

## 2. Electron bridge implementation
- [ ] In `src/bridge/electron.ts`, add the 6 methods to `electronBridge`, each forwarding to
  `requireAPI().<method>(...)`.
- [ ] In `electron/preload.js`, expose the 6 methods under
  `contextBridge.exposeInMainWorld("electronAPI", { ... })`.
- [ ] In `electron/main.js`, add 6 `ipcMain.handle(...)` handlers
  (`enumerate-audio-devices`, `open-hardware-input`, `close-hardware-input`,
  `create-patch-route`, `remove-patch-route`, `get-patch-routes`) delegating to native
  device APIs; return empty lists / safe defaults when bindings are unavailable.

## 3. Tauri stub
- [ ] In `src/bridge/tauri.ts`, add the 6 methods to `tauriBridge` using the existing
  `warnStub` pattern; return `{ inputs: [], outputs: [] }`, `false`, `undefined`, `[]` as
  appropriate.

## 4. hardwareIO native fast path
- [ ] Import `OpenBandNative` from `@bridge` in `src/lib/hardwareIO.ts`.
- [ ] Update `enumerateAudioDevices()` (`:48`) to call `OpenBandNative.enumerateAudioDevices()`
  when off-web and the bridge supports it, mapping results into `patchState`; otherwise keep
  the existing `navigator.mediaDevices` web path.
- [ ] Update `openHardwareInput()` (`:121`) / `closeHardwareInput()` (`:148`) to delegate to
  the bridge off-web, preserving web behavior.
- [ ] Update `createPatchRoute()` (`:155`) / `removePatchRoute()` (`:176`) to best-effort
  persist through `OpenBandNative` when present.
- [ ] Update `getPatchbayState()` (`:203`) to hydrate from `OpenBandNative.getPatchRoutes()`
  on first off-web call.
- [ ] Leave `setAudioOutputDevice()` / `getCurrentOutputDevice()` web behavior intact
  (documented off-web no-op).

## 5. Component data wiring
- [ ] Confirm `src/components/Patchbay.tsx` (`:38-45`) and `src/components/OutputSelector.tsx`
  (`:30`) correctly render the now-populated off-web `enumerateAudioDevices()` results
  (shapes are identical — no prop changes required).

## 6. Spec + tests
- [ ] Update `openspec/specs/hardware-io/spec.md`: add "Native Device Enumeration" and
  "Patch-Route Persistence via Bridge" requirements + scenarios (desktop surfaces real
  devices; routes persist across sessions via `OpenBandNative`); mark the existing native
  no-op scenarios as applying only when no bridge is available.
- [ ] Create `src/lib/hardwareIO.native.test.ts`: mock `@bridge` returning populated devices
  → `enumerateAudioDevices` returns them and updates `patchState`; mock bridge absent →
  falls back to web empty path; `createPatchRoute` invokes `OpenBandNative.createPatchRoute`.
- [ ] (existing suite) confirm `Patchbay` still renders with populated devices.

## Verification
- [ ] `npx tsc --noEmit` clean
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `npx vitest run` passes
- [ ] `npm run build` succeeds
