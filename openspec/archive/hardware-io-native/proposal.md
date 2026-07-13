# Proposal — Hardware I/O Native Routing

## Context
OpenBand's hardware routing layer (`src/lib/hardwareIO.ts`) is currently web-only. Every
device-facing function is guarded by `Platform.OS !== "web"`, so on desktop (Electron) and
any native runtime the calls resolve to empty/no-op results:

- `enumerateAudioDevices()` returns `{ inputs: [], outputs: [] }` off-web (`:48-54`).
- `openHardwareInput()` returns `null` off-web (`:121-126`).
- `setAudioOutputDevice()` returns `false` off-web (`:238-239`); `getCurrentOutputDevice()`
  returns `""` (`:262-263`).

This means the `Patchbay` UI (`src/components/Patchbay.tsx`) and `OutputSelector`
(`src/components/OutputSelector.tsx`) can never reflect real audio interfaces when running
inside the Electron desktop shell — exactly the environment where multi-channel audio
interfaces (ASIO/CoreAudio/WASAPI) are most relevant. The desktop bridge already exists at
`src/bridge/` (`interface.ts`, `electron.ts`, `tauri.ts`, `browser.ts`, `index.ts`) and
exposes `OpenBandNative`, but it has **no hardware enumeration or patchbay methods**. The
`NativeBridge` contract only covers file/project dialogs and menu actions.

## Problem Description
- Off-web platforms get empty device lists and no-op routing even though the desktop shell
  has full access to native audio device APIs via IPC.
- `Patchbay` silently shows "No devices found" on desktop because the underlying lib returns
  `[]` and never consults the bridge.
- The `NativeBridge` interface (`src/bridge/interface.ts:20-33`) lacks any
  `enumerateAudioDevices` / patchbay route methods, so there is no contract for a native
  implementation to satisfy.

## Objectives
- Extend the `NativeBridge` interface (`src/bridge/interface.ts`) with hardware enumeration
  and patchbay route methods so native backends can surface real devices and persist routes.
- Implement those methods in `src/bridge/electron.ts` by delegating to `window.electronAPI`
  (which must be backed by new IPC handlers in `electron/main.js` → native audio APIs).
- Provide a `src/bridge/tauri.ts` stub that warns + returns empty results, mirroring the
  existing stub pattern.
- Make `src/lib/hardwareIO.ts` call `OpenBandNative` when not web, falling back to the
  existing `getUserMedia`/`enumerateDevices` web path otherwise, and persist route CRUD
  through the bridge where available.
- Wire the real device list into `Patchbay` (and `OutputSelector`) so desktop users see
  actual I/O without code changes to the component's data flow.
- Update `openspec/specs/hardware-io/spec.md` to require native enumeration + route
  persistence, and add/extend tests.

## Scope
- **Large.** Touches the bridge contract, Electron main-process IPC, Tauri stub, the
  hardwareIO library routing, component data wiring, and the existing spec + tests.
- Cross-references `openspec/changes/mount-patchbay/` (Patchbay is already mounted in the
  studio and consumes `enumerateAudioDevices` + `getHardwareChannels`); this change upgrades
  the data source those components rely on.

## Out of Scope
- No new native DSP / actual audio capture graph — only enumeration, open/close handles, and
  route metadata persistence via the bridge.
- Mobile (iOS/Android) native device enumeration remains a documented no-op (same as today);
  this change targets the Electron desktop shell. Tauri is stubbed.
- No changes to `app/studio/[id].tsx` mount logic (handled by `mount-patchbay`).
