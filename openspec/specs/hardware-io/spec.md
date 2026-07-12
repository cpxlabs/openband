# Hardware I/O

## Overview
OpenBand exposes low-latency hardware audio routing: enumerating system audio devices, opening hardware inputs, building patch routes between input channels and tracks, and selecting the output (sink) device. On web this is powered by the Web Audio API + `getUserMedia` + `setSinkId`. On native/desktop platforms the same API surface delegates to `OpenBandNative` (`@bridge`): the Electron shell surfaces real interfaces and persists routes via IPC. When no native bridge implements a method, the native platforms fall back to **no-op / empty** results (same as mobile), because OS-level device enumeration and sink selection are not otherwise available through Expo.

## Implementation Notes
All logic lives in `src/lib/hardwareIO.ts`. Off-web, each device-facing function consults `OpenBandNative` (`@bridge`) when it exposes the corresponding method (`nativeSupports(...)` gate): `enumerateAudioDevices()` calls `OpenBandNative.enumerateAudioDevices()` and maps `BridgeAudioDevice` into `patchState`; `openHardwareInput()` / `closeHardwareInput()` delegate to the bridge; `createPatchRoute` / `removePatchRoute` best-effort persist through the bridge; `getPatchbayState()` hydrates once from `OpenBandNative.getPatchRoutes()`. On web, `enumerateAudioDevices()` calls `navigator.mediaDevices.enumerateDevices()`, `openHardwareInput()` opens a `MediaStream`, and Patch-route CRUD (`createPatchRoute`, `removePatchRoute`, `updatePatchRoute`, `getRoutesForTrack`, `getRoutesFromDevice`, `clearAllRoutes`) mutates an in-module `patchState` singleton. When neither web nor a native bridge method is available (e.g. mobile), the functions early-return empty/`null`/`false`. `setAudioOutputDevice()` calls `ctx.setSinkId(...)` and returns `false` on non-web. The bridge contract (`src/bridge/interface.ts`) declares `BridgeAudioDevice`, `BridgeHardwareChannel`, `BridgePatchRoute` and the methods `enumerateAudioDevices`, `openHardwareInput`, `closeHardwareInput`, `createPatchRoute`, `removePatchRoute`, `getPatchRoutes`; implemented in `electron.ts` (via `window.electronAPI` IPC → `electron/main.js`), stubbed in `tauri.ts` and `browser.ts`. The drag-and-drop matrix UI is `src/components/Patchbay.tsx`; output selection is `src/components/OutputSelector.tsx`. Channel fan-out uses `createChannelSplitter` / `createChannelMerger` on an `AudioContext`.

## Requirements

### Requirement: Enumerate Audio Devices
The system MUST provide `enumerateAudioDevices()` returning current input and output `AudioDevice` lists on web, and an empty result on native.

#### Scenario: Web enumeration
- **Given** the app runs on web with mic permission
- **When** `enumerateAudioDevices()` resolves
- **Then** `inputs` and `outputs` reflect `enumerateDevices()` results
- **And** `patchState.inputDevices` / `outputDevices` are updated

#### Scenario: Native enumeration no-op
- **Given** the app runs on a native platform with no bridge `enumerateAudioDevices` method
- **When** `enumerateAudioDevices()` is called
- **Then** it resolves to `{ inputs: [], outputs: [] }` without touching hardware

### Requirement: Native Device Enumeration via Bridge
Off-web, when `OpenBandNative` exposes `enumerateAudioDevices`, the system MUST return the real desktop device list from the bridge and populate `patchState.inputDevices` / `outputDevices`, so the desktop `Patchbay` and `OutputSelector` reflect actual audio interfaces.

#### Scenario: Desktop enumeration
- **Given** the Electron shell exposes `window.electronAPI.enumerateAudioDevices`
- **When** `enumerateAudioDevices()` is called off-web
- **Then** `OpenBandNative.enumerateAudioDevices()` is awaited
- **And** its `inputs`/`outputs` are returned and stored in `patchState`

#### Scenario: Bridge enumeration failure
- **Given** the native bridge throws during enumeration
- **When** `enumerateAudioDevices()` is called
- **Then** it resolves to `{ inputs: [], outputs: [] }` without crashing

### Requirement: Open Hardware Input
The system MUST provide `openHardwareInput(deviceId, channelCount, sampleRate)` that opens a `MediaStream` on web and returns `null` on native.

#### Scenario: Web open
- **Given** a valid web input deviceId
- **When** `openHardwareInput(id)` is called
- **Then** a `MediaStream` is returned and stored for later teardown

#### Scenario: Native open no-op
- **Given** a native platform with no bridge `openHardwareInput` method
- **When** `openHardwareInput(...)` is called
- **Then** it returns `null`

#### Scenario: Native open via bridge
- **Given** an off-web platform whose bridge exposes `openHardwareInput`
- **When** `openHardwareInput(deviceId, channelCount, sampleRate)` is called
- **Then** `OpenBandNative.openHardwareInput(...)` is invoked with those args
- **And** the function returns `null` (native handles capture; no `MediaStream`)

### Requirement: Patch-Route Persistence via Bridge
Off-web, when `OpenBandNative` exposes the route methods, the system MUST best-effort persist route CRUD through the bridge (`createPatchRoute` / `removePatchRoute`) and hydrate `patchState.routes` once from `getPatchRoutes()` on the first `getPatchbayState()` call, so routes survive across sessions.

#### Scenario: Persist created route
- **Given** an off-web platform whose bridge exposes `createPatchRoute`
- **When** `createPatchRoute(channel, trackId)` is called
- **Then** the route is appended to `patchState.routes`
- **And** `OpenBandNative.createPatchRoute(route)` is invoked

#### Scenario: Hydrate routes on load
- **Given** an off-web platform whose bridge exposes `getPatchRoutes`
- **When** `getPatchbayState()` is called for the first time
- **Then** `OpenBandNative.getPatchRoutes()` is consulted to hydrate `patchState.routes`

### Requirement: Patch-Route CRUD (matrix routing)
The system MUST allow creating, reading, updating, and removing patch routes that map a `HardwareChannel` to a target track channel, with route listing helpers (`getRoutesForTrack`, `getRoutesFromDevice`).

#### Scenario: Create route
- **Given** an open input device channel
- **When** `createPatchRoute(channel, trackId, targetChannel, gain)` is called
- **Then** a `PatchRoute` with `enabled: true` is appended to `patchState.routes`
- **And** `getRoutesForTrack(trackId)` includes it

#### Scenario: Remove route
- **Given** an existing route id
- **When** `removePatchRoute(id)` is called
- **Then** the route is no longer present in `patchState.routes`

### Requirement: Patchbay Mounted in Studio
The studio MUST mount the `Patchbay` component (toggled from the transport toolbar) feeding it the project's track ids, so hardware input channels can be routed to tracks via the existing `hardwareIO` CRUD (`enumerateAudioDevices`, `getHardwareChannels`, `createPatchRoute`, `removePatchRoute`, `getPatchbayState`).

#### Scenario: Toolbar toggle
- **Given** the studio screen is open with tracks loaded
- **When** the user presses the patchbay toolbar button
- **Then** the `Patchbay` overlay becomes visible with the project's `trackIds` passed as drop targets

#### Scenario: Route creation
- **Given** the patchbay is visible and a hardware input channel is dragged to a track
- **When** the drop completes
- **Then** `createPatchRoute` is invoked and `onRouteCreated` fires, persisting the route in `patchState`

### Requirement: Output Device Selection
The system MUST provide `setAudioOutputDevice(deviceId)` (web `setSinkId`) and `getCurrentOutputDevice()`, returning failure/empty on native.

#### Scenario: Web sink selection
- **Given** a Chrome 110+ web context with a known output id
- **When** `setAudioOutputDevice(id)` is called
- **Then** it returns `true` and the context sink changes

#### Scenario: Native sink selection no-op
- **Given** a native platform
- **When** `setAudioOutputDevice(id)` is called
- **Then** it returns `false`

## Test Requirements (Vitest)
- [ ] `createPatchRoute` appends an enabled route and `getRoutesForTrack` filters by track
- [ ] `removePatchRoute` deletes the route by id
- [ ] `getRoutesFromDevice` filters by source device id
- [ ] `enumerateAudioDevices` returns empty on native (no-op)
- [ ] `setAudioOutputDevice` returns false on native
- [ ] mounting `Patchbay` with `visible` renders the matrix, a created route is reflected, and `onRouteCreated`/`onRouteRemoved` fire
- [ ] off-web `enumerateAudioDevices` delegates to `OpenBandNative.enumerateAudioDevices` and maps results into `patchState`
- [ ] off-web `createPatchRoute` invokes `OpenBandNative.createPatchRoute`; `removePatchRoute` invokes `OpenBandNative.removePatchRoute`
- [ ] off-web `openHardwareInput` delegates to the bridge and returns `null`; `closeHardwareInput` is safe when the bridge lacks the method
