# Tasks — Native Builds

## 1. Android release artifact
- [ ] Verify `android/` prebuild is intact (`android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle`, `android/gradlew`)
- [ ] Configure signing only if required: `signingConfigs.release` + `buildTypes.release` in `android/app/build.gradle`; add `MYAPP_RELEASE_*` entries to `android/gradle.properties` (debug keystore at `android/app/debug.keystore` allows local verification without changes)
- [ ] Ensure `android/local.properties` points `sdk.dir` at the local Android SDK if absent
- [ ] Run `cd android && ./gradlew assembleRelease`
- [ ] Confirm `android/app/build/outputs/apk/release/app-release.apk` is produced

## 2. Electron desktop artifact
- [ ] Run root `npm run build` to produce `dist/` (consumed by `electron/package.json` `files: ["../dist/**/*"]`)
- [ ] `cd electron && npm install` (deps: `electron`, `electron-builder`)
- [ ] Run `cd electron && npm run build:linux` (AppImage + deb); produce `electron/out/OpenBand-*`
- [ ] (Optional, where host permits) `npm run build:mac`, `npm run build:win`
- [ ] Confirm `electron/out/` distributables exist

## 3. Close native bridge gaps (prereq: in-flight specs)
### Hardware I/O — `openspec/changes/hardware-io-native/`
- [ ] Extend `NativeBridge` (`src/bridge/interface.ts:20-33`) with `enumerateAudioDevices`, `openHardwareInput`, `closeHardwareInput`, `createPatchRoute`, `removePatchRoute`, `getPatchRoutes` + bridge types
- [ ] Implement in `src/bridge/electron.ts` (delegate to `window.electronAPI`)
- [ ] Add `ipcMain.handle` entries in `electron/main.js` + expose in `electron/preload.js`
- [ ] Add `src/bridge/tauri.ts` warn-and-empty stubs
- [ ] Replace `Platform.OS !== "web"` early-returns in `src/lib/hardwareIO.ts` (`:48`, `:121`, `:238`, `:262`) with native-bridge fast path
### Audio recording — `openspec/changes/audio-recording/`
- [ ] Add `Platform.OS` branch in recording entry point: web → `AudioWorklet`/`getUserMedia`; device → `expo-audio` `AudioRecorder`/`useAudioRecorder` writing into armed `TrackDef`
- [ ] Verify recorded region persists into the mix on device path

## 4. Verify bridge methods on device / shell
- [ ] Electron: launch `npm run desktop` (or built app) and confirm dialogs + project save/load resolve through `OpenBandNative` → `window.electronAPI` → IPC
- [ ] (Device) Android: install `app-release.apk`, confirm audio playback (expo-audio) + recording entry works without `navigator.mediaDevices` crash
- [ ] `hardwareIO` returns real device list inside Electron (not `[]`)

## 5. Documentation
- [ ] Create `BUILD.md` (repo root) with: prerequisites, exact commands per platform, signing notes (debug vs release), artifact output paths, desktop bridge chain
- [ ] Add a short build-commands note to `AGENTS.md` (optional)

## 6. Verification
- [ ] `npx tsc --noEmit` clean (root)
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `npx vitest run` passes
- [ ] `npm run test:legacy` passes
- [ ] `npm run build` succeeds (web bundle, consumed by Electron)
- [ ] `cd android && ./gradlew assembleRelease` succeeds → APK present
- [ ] `cd electron && npm run build:linux` succeeds → distributable present
- [ ] (If feasible) add a smoke test that `OpenBandNative` resolves to the correct bridge per env (browser/electron/tauri) and that `hardwareIO` delegates off-web — extend `tests/lib5.test.ts` or add `tests/nativeBridge.test.ts`

## 7. Archive prior incomplete work
- [ ] Carry forward the unfinished `desktop-build` archive task (run checks) — now satisfied by step 6
- [ ] Mark `hardware-io-native` and `audio-recording` as completed once their tasks above pass, then archive
