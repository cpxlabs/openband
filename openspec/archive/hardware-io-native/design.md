# Design — Hardware I/O Native Routing

## Bridge Method Contract

Add to `src/bridge/interface.ts` the following types and `NativeBridge` methods. Reuse the
existing `AudioDevice` / `HardwareChannel` / `PatchRoute` shapes from
`src/lib/hardwareIO.ts` (re-declared in the bridge interface so the bridge has no
dependency on the app lib):

```ts
// in interface.ts
export interface BridgeAudioDevice {
  id: string;
  kind: "audioinput" | "audiooutput";
  label: string;
  groupId: string;
  sampleRates: number[];
  channelCounts: number[];
  latency: number;
}

export interface BridgeHardwareChannel {
  deviceId: string;
  channelIndex: number;
  label: string;
  sampleRate: number;
}

export interface BridgePatchRoute {
  id: string;
  source: BridgeHardwareChannel;
  targetTrackId: string;
  targetChannel: number;
  gain: number;
  enabled: boolean;
}
```

New `NativeBridge` methods (added to the interface at `src/bridge/interface.ts:20-33`):

| Method | Signature | Purpose |
|---|---|---|
| `enumerateAudioDevices` | `(): Promise<{ inputs: BridgeAudioDevice[]; outputs: BridgeAudioDevice[] }>` | Real device list on desktop; `[]` on web/browser/tauri stub |
| `openHardwareInput` | `(deviceId: string, channelCount?: number, sampleRate?: number): Promise<boolean>` | Reserve/activate an input device handle natively; returns success |
| `closeHardwareInput` | `(): Promise<void>` | Release the active input handle |
| `createPatchRoute` | `(route: BridgePatchRoute): Promise<void>` | Persist a route (mirrors `hardwareIO.createPatchRoute`) |
| `removePatchRoute` | `(routeId: string): Promise<void>` | Delete a persisted route |
| `getPatchRoutes` | `(): Promise<BridgePatchRoute[]>` | Load persisted routes back into the app |

## Electron Implementation (`src/bridge/electron.ts`)

Mirror the existing delegation pattern (`:18-65`). Each method forwards to
`requireAPI().<method>(...)`:

- `enumerateAudioDevices` → `requireAPI().enumerateAudioDevices()`
- `openHardwareInput(deviceId, channelCount, sampleRate)` → `requireAPI().openHardwareInput(...)`
- `closeHardwareInput()` → `requireAPI().closeHardwareInput()`
- `createPatchRoute(route)` → `requireAPI().createPatchRoute(route)`
- `removePatchRoute(routeId)` → `requireAPI().removePatchRoute(routeId)`
- `getPatchRoutes()` → `requireAPI().getPatchRoutes()`

## Electron Main-Process IPC (`electron/main.js` + `electron/preload.js`)

Following the existing `ipcMain.handle("show-open-dialog", ...)` pattern
(`electron/main.js:157`), add:

- `ipcMain.handle("enumerate-audio-devices", async () => { /* call native device API
  (e.g. node `node-audiodevice` / CoreAudio/ WASAPI bindings) → BridgeAudioDevice[] */ })`
- `ipcMain.handle("open-hardware-input", async (_e, deviceId, channelCount, sampleRate) => boolean)`
- `ipcMain.handle("close-hardware-input", async () => void)`
- `ipcMain.handle("create-patch-route", async (_e, route) => void)`
- `ipcMain.handle("remove-patch-route", async (_e, routeId) => void)`
- `ipcMain.handle("get-patch-routes", async () => BridgePatchRoute[])`

In `electron/preload.js`, expose these under `contextBridge.exposeInMainWorld("electronAPI", { ... })`
so they become `window.electronAPI` methods — completing the chain `hardwareIO` →
`OpenBandNative` → `electronBridge` → `window.electronAPI` → IPC → `main.js`.

## Tauri Stub (`src/bridge/tauri.ts`)

Mirror the existing `warnStub` pattern (`:8-14`). Every new method warns once and returns
empty/safe values: `enumerateAudioDevices` → `{ inputs: [], outputs: [] }`,
`openHardwareInput` → `false`, `closeHardwareInput` → `undefined`, `createPatchRoute` /
`removePatchRoute` / `getPatchRoutes` → `undefined` / `[]`.

## hardwareIO Routing (`src/lib/hardwareIO.ts`)

Replace the `Platform.OS !== "web"` early-returns with a native-bridge fast path:

- `enumerateAudioDevices()` (`:48`): if `Platform.OS !== "web"` AND `OpenBandNative`
  exposes `enumerateAudioDevices`, `await OpenBandNative.enumerateAudioDevices()` and map
  `BridgeAudioDevice` → `AudioDevice` into `patchState`; else run the existing
  `navigator.mediaDevices` web path.
- `openHardwareInput()` (`:121`): off-web, delegate to
  `OpenBandNative.openHardwareInput(...)` and keep `mediaStream` semantics via a no-op
  `MediaStream` note (native handles the capture); web path unchanged.
- `closeHardwareInput()` (`:148`): off-web, `OpenBandNative.closeHardwareInput()`; web path
  unchanged.
- `createPatchRoute()` (`:155`): after appending to `patchState`, if bridge present call
  `OpenBandNative.createPatchRoute(route)` (fire-and-forget, best-effort persistence).
- `removePatchRoute()` (`:176`): after removing, best-effort
  `OpenBandNative.removePatchRoute(routeId)`.
- `getPatchbayState()` (`:203`): on first off-web call, hydrate from
  `OpenBandNative.getPatchRoutes()` if available so routes persist across sessions.
- `setAudioOutputDevice()` (`:238`) and `getCurrentOutputDevice()` (`:262`): unchanged on
  web; off-web they may consult `OpenBandNative` if a sink API is added later — leave as
  `false`/`""` for now (documented no-op, see proposal Out of Scope).

Import `OpenBandNative` from `@bridge` (alias wired in `src/bridge/index.ts`). No new
dependency is introduced; the web path is untouched when the bridge lacks the method.

## Component Data Wiring

`Patchbay.tsx` (`:38-45`) already calls `enumerateAudioDevices()` and `getPatchbayState()`
from `hardwareIO`. Because this change upgrades the *return values* of those functions on
desktop, the component automatically reflects real devices with **no prop/DSL changes**.
`OutputSelector.tsx` (`:30`) similarly already consumes `enumerateAudioDevices()` outputs,
so the native device list appears without edits. The only component-side requirement is to
confirm both components handle the now-populated off-web results (they already do, since the
shapes are identical).

## File / Symbol Mapping

| Change | File | Symbols |
|---|---|---|
| Bridge types + methods | `src/bridge/interface.ts` | `BridgeAudioDevice`, `BridgeHardwareChannel`, `BridgePatchRoute`, 6 new `NativeBridge` methods |
| Electron delegation | `src/bridge/electron.ts` | `electronBridge` additions |
| Tauri stub | `src/bridge/tauri.ts` | `tauriBridge` additions |
| IPC handlers | `electron/main.js` | `ipcMain.handle` for 6 new channels |
| Preload exposure | `electron/preload.js` | `electronAPI` additions |
| Native fast path | `src/lib/hardwareIO.ts` | `enumerateAudioDevices`, `openHardwareInput`, `closeHardwareInput`, `createPatchRoute`, `removePatchRoute`, `getPatchbayState` |
| Spec | `openspec/specs/hardware-io/spec.md` | add native enumeration + route persistence requirements |
| Test | `src/lib/hardwareIO.native.test.ts` (new) | bridge delegation + fall-back behavior |
