# Hardware I/O

## Overview
OpenBand exposes low-latency hardware audio routing: enumerating system audio devices, opening hardware inputs, building patch routes between input channels and tracks, and selecting the output (sink) device. On web this is powered by the Web Audio API + `getUserMedia` + `setSinkId`. On native platforms (iOS/Android) the same API surface is provided but returns **no-op / empty** results, because OS-level device enumeration and sink selection are not available through Expo.

## Implementation Notes
All logic lives in `src/lib/hardwareIO.ts`. `enumerateAudioDevices()` calls `navigator.mediaDevices.enumerateDevices()` but early-returns `{ inputs: [], outputs: [] }` whenever `Platform.OS !== "web"` or `navigator` is undefined. `openHardwareInput()` similarly returns `null` on native. Patch-route CRUD (`createPatchRoute`, `removePatchRoute`, `updatePatchRoute`, `getRoutesForTrack`, `getRoutesFromDevice`, `clearAllRoutes`) mutates an in-module `patchState` singleton. `setAudioOutputDevice()` calls `ctx.setSinkId(...)` and returns `false` on non-web. The drag-and-drop matrix UI is `src/components/Patchbay.tsx`; output selection is `src/components/OutputSelector.tsx`. Channel fan-out uses `createChannelSplitter` / `createChannelMerger` on an `AudioContext`.

## Requirements

### Requirement: Enumerate Audio Devices
The system MUST provide `enumerateAudioDevices()` returning current input and output `AudioDevice` lists on web, and an empty result on native.

#### Scenario: Web enumeration
- **Given** the app runs on web with mic permission
- **When** `enumerateAudioDevices()` resolves
- **Then** `inputs` and `outputs` reflect `enumerateDevices()` results
- **And** `patchState.inputDevices` / `outputDevices` are updated

#### Scenario: Native enumeration no-op
- **Given** the app runs on a native platform
- **When** `enumerateAudioDevices()` is called
- **Then** it resolves to `{ inputs: [], outputs: [] }` without touching hardware

### Requirement: Open Hardware Input
The system MUST provide `openHardwareInput(deviceId, channelCount, sampleRate)` that opens a `MediaStream` on web and returns `null` on native.

#### Scenario: Web open
- **Given** a valid web input deviceId
- **When** `openHardwareInput(id)` is called
- **Then** a `MediaStream` is returned and stored for later teardown

#### Scenario: Native open no-op
- **Given** a native platform
- **When** `openHardwareInput(...)` is called
- **Then** it returns `null`

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
