# Design — Native Builds

## Target Matrix

| Platform | Build Command | Output | Status Today |
|---|---|---|---|
| Android | `cd android && ./gradlew assembleRelease` | `android/app/build/outputs/apk/release/app-release.apk` | Prebuild exists; needs signing + verification |
| Electron (linux) | `cd electron && npm run build:linux` | `electron/out/OpenBand-*.AppImage`, `*.deb` | `electron-builder` config exists; never run |
| Electron (mac) | `cd electron && npm run build:mac` | `electron/out/OpenBand-*.dmg` | Same |
| Electron (win) | `cd electron && npm run build:win` | `electron/out/OpenBand-*.exe` | Same |
| iOS | Xcode archive via `expo run:ios` + manual signing | `.ipa` | Out of scope (no Apple identity) |

The Electron target consumes the web bundle produced by `npm run build`
(`expo export --platform web`) — see `electron/package.json` `files: ["../dist/**/*"]`
and root `package.json` `scripts.desktop`. **Prerequisite:** run `npm run build` first so
`dist/` exists before `electron-builder`.

## Android Release (Signed APK)

1. **Signing config** — `android/app/build.gradle` references a release signing config. The
   `debug.keystore` already exists at `android/app/debug.keystore`. For a *signed* release the
   standard flow is:
   - generate a `release.keystore` (or reuse debug for local verification), and
   - wire `signingConfigs.release` + `buildTypes.release.signingConfig` in
     `android/app/build.gradle`, pointing at `gradle.properties` entries
     (`MYAPP_RELEASE_STORE_FILE`, `MYAPP_RELEASE_KEY_ALIAS`, `MYAPP_RELEASE_STORE_PASSWORD`,
     `MYAPP_RELEASE_KEY_PASSWORD`).
   - Per AGENTS.md, only modify `android/app/build.gradle` if required for the release; the
     debug keystore already allows `assembleRelease` to succeed locally for verification.
2. **Run** `cd android && ./gradlew assembleRelease` (uses `gradlew` at `android/gradlew`).
   Expect `android/app/build/outputs/apk/release/app-release.apk`.
3. **Note:** `android/local.properties` may need `sdk.dir` pointed at the local Android SDK.

## Electron Release (electron-builder)

1. **Prerequisite:** `npm run build` (root) → produces `dist/`.
2. **Run** `cd electron && npm install` then `npm run build:linux` (or `:mac` / `:win`).
   `electron/package.json` `build` block defines `appId: com.openband.desktop`,
   `productName: OpenBand`, and per-OS targets (`AppImage`/`deb`, `dmg`, `nsis`).
3. **Bridge chain already in place** (validated by this build):
   frontend `OpenBandNative` (`src/bridge/index.ts`) → `electronBridge`
   (`src/bridge/electron.ts`) → `window.electronAPI` (`electron/preload.js`) →
   `ipcMain.handle` (`electron/main.js`). The desktop `NativeBridge` methods
   (`showOpenDialog`, `readFile`, `writeFile`, `listProjects`, `saveProject`, `loadProject`,
   `deleteProject`, `onMenuAction`) are fully implemented end-to-end.

## Native Bridge Gaps To Close (Device-Correctness)

These are detailed in the in-flight changes `hardware-io-native` and `audio-recording`; this
change tracks their completion as a prerequisite for a trustworthy device build.

### A. Hardware I/O (`src/lib/hardwareIO.ts`) — from `hardware-io-native`
- Extend `NativeBridge` (`src/bridge/interface.ts:20-33`) with
  `enumerateAudioDevices`, `openHardwareInput`, `closeHardwareInput`, `createPatchRoute`,
  `removePatchRoute`, `getPatchRoutes` (reusing `BridgeAudioDevice` / `BridgeHardwareChannel`
  / `BridgePatchRoute` shapes).
- Implement them in `src/bridge/electron.ts` (delegate to `window.electronAPI`) and add
  matching `ipcMain.handle` entries in `electron/main.js` + `electron/preload.js` exposure.
- Add `src/bridge/tauri.ts` stub (warn + empty), mirroring the existing `warnStub` pattern.
- Replace the `Platform.OS !== "web"` early-returns in `hardwareIO.ts` (`:48`, `:121`,
  `:238`, `:262`) with a native-bridge fast path; keep the `getUserMedia`/`enumerateDevices`
  web path otherwise.

### B. Audio Recording (`src/lib/...` + `app/studio/[id].tsx`) — from `audio-recording`
- Web path uses `AudioWorklet` + `getUserMedia` (`hardwareIO.openHardwareInput` /
  `createHardwareInputNode`). On device, recording must route through `expo-audio`
  (`AudioRecorder` / `useAudioRecorder`) instead of `MediaStream`, since `navigator.mediaDevices`
  is unavailable in the native shell.
- Add a platform branch in the recording entry point: `Platform.OS === "web"` → existing
  worklet path; else → `expo-audio` recorder writing into the armed `TrackDef` region.

## Documentation

Add `BUILD.md` at repo root documenting, per platform:
- Prerequisites (Android SDK / `local.properties`, `npm run build` before Electron).
- Exact commands (`cd android && ./gradlew assembleRelease`; `cd electron && npm run build:linux`).
- Signing notes (debug vs release keystore; `gradle.properties`).
- Where artifacts land (`android/app/build/outputs/apk/release/`, `electron/out/`).
- The bridge contract chain for desktop.
Optionally mirror the key commands as a short note in `AGENTS.md`. No code changes beyond what
the two in-flight specs require.

## File / Symbol Mapping

| Change | File | Symbols |
|---|---|---|
| Android signing | `android/app/build.gradle`, `android/gradle.properties` | `signingConfigs.release`, `buildTypes.release` (modify only if required) |
| Electron build | `electron/package.json` | `build:linux/mac/win` (already present) |
| Bridge contract | `src/bridge/interface.ts` | +6 `NativeBridge` methods, `BridgeAudioDevice`/`BridgeHardwareChannel`/`BridgePatchRoute` |
| Electron delegation | `src/bridge/electron.ts` | `electronBridge` additions |
| Tauri stub | `src/bridge/tauri.ts` | `tauriBridge` additions |
| IPC handlers | `electron/main.js` | `ipcMain.handle` for 6 new channels |
| Preload exposure | `electron/preload.js` | `electronAPI` additions |
| HW native fast path | `src/lib/hardwareIO.ts` | `enumerateAudioDevices`, `openHardwareInput`, `closeHardwareInput`, `createPatchRoute`, `removePatchRoute`, `getPatchbayState` |
| Recording native path | recording entry point (`app/studio/[id].tsx` + `src/lib`) | `Platform.OS` branch → `expo-audio` recorder |
| Docs | `BUILD.md` (new) | build + signing + artifact commands |
