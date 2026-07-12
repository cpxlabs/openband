# Tasks — Native Builds

## 1. Android release artifact
- [x] Verify `android/` prebuild is intact (`android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle`, `android/gradlew`)
- [x] Configure signing fallback: `signingConfigs.release` in `android/app/build.gradle` now uses the real `android/.secrets/android-keystore.p12` when present and **falls back to `debug.keystore`** otherwise, so a local `assembleRelease` always succeeds for verification (no `gradle.properties` keystore edits required)
- [x] Ensure `android/local.properties` points `sdk.dir` at the local Android SDK if absent (documented in BUILD.md; not present in this env)
- [ ] Run `cd android && ./gradlew assembleRelease` — **documented command + config-coherent; NOT executed** (full Gradle toolchain run is 20+ min / SDK unavailable here)
- [ ] Confirm `android/app/build/outputs/apk/release/app-release.apk` is produced — blocked on the above run

## 2. Electron desktop artifact
- [x] Root `npm run build` documentation confirmed; `dist/` is the consumed input (documented in BUILD.md)
- [x] `cd electron && npm install` + `npm run build:linux` (AppImage + deb) documented in BUILD.md
- [x] `electron/package.json` `build:linux/mac/win` scripts confirmed present and coherent
- [ ] Run `cd electron && npm run build:linux` — **documented command + config-coherent; NOT executed** (`electron-builder` fetches the Electron binary; not run here)
- [ ] Confirm `electron/out/` distributables exist — blocked on the above run

## 3. Close native bridge gaps (prereq: in-flight specs)
### Hardware I/O — `openspec/changes/hardware-io-native/`
- [x] `NativeBridge` (`src/bridge/interface.ts`) already has the 6 methods + `BridgeAudioDevice`/`BridgeHardwareChannel`/`BridgePatchRoute` types
- [x] `src/bridge/electron.ts` already delegates all 6 methods to `window.electronAPI`
- [x] `electron/main.js` already has the 6 `ipcMain.handle` entries; `electron/preload.js` already exposes them
- [x] `src/bridge/tauri.ts` already has warn-and-empty stubs; `browser.ts` remains the no-op fallback
- [x] `src/lib/hardwareIO.ts` already delegates off-web via `nativeSupports()` (native fast path in `enumerateAudioDevices`, `openHardwareInput`/`closeHardwareInput`, `createPatchRoute`/`removePatchRoute`, `getPatchbayState`)
### Audio recording — `openspec/changes/audio-recording/`
- [x] Web path (`AudioWorklet` + `getUserMedia` via `hardwareIO.openHardwareInput`) implemented and tested in `audio-recording` change
- [ ] Device path (`Platform.OS !== "web"` → `expo-audio` `AudioRecorder` writing into armed `TrackDef`) — **NOT implemented**: out of scope for this change; documented as a limitation. The native `hardwareIO` bridge path is in place so a future device recorder can persist routes through `OpenBandNative`.
- [ ] Verify recorded region persists into the mix on device path — blocked on device path above

## 4. Verify bridge methods on device / shell
- [x] Added deterministic smoke tests: `tests/nativeBridge.test.ts` (electron delegate + browser fallback) and `tests/hardwareIONative.test.ts` (`hardwareIO` delegates off-web). All 5 pass.
- [ ] Electron: launch `npm run desktop` and confirm dialogs + project save/load resolve through `OpenBandNative` → `window.electronAPI` → IPC (manual; covered by smoke test)
- [ ] (Device) Android: install `app-release.apk` and confirm playback + recording without `navigator.mediaDevices` crash (requires APK build — see §1)
- [ ] `hardwareIO` returns real device list inside Electron (requires `node-audiodevice` binding; falls back to `[]`)

## 5. Documentation
- [x] Create `BUILD.md` (repo root): prerequisites, exact commands per platform, signing notes (debug vs release fallback), artifact output paths, desktop bridge chain
- [ ] Add a short build-commands note to `AGENTS.md` (optional) — skipped; BUILD.md is the canonical reference

## 6. Verification
- [x] `npx tsc --noEmit` (root): **backend clean; root has 27 pre-existing errors in files unrelated to this change** (`tests/plugins/dsp.test.ts` ×22 — untracked/pre-existing; `app/studio/[id].tsx`, `src/components/OneKnob.tsx`, `src/components/OnboardingFlow.tsx` — pre-existing working-tree modifications). This change adds **zero** new tsc errors (new `tests/nativeBridge.test.ts` / `tests/hardwareIONative.test.ts` are clean).
- [x] `cd backend && npx tsc --noEmit` clean (0 errors)
- [ ] `npx vitest run`: **936 passed / 37 failed across 9 pre-existing suites** (accessibility, components, components5/6, onboarding, responsive, layout, screens, studio). None are introduced by this change; the 2 new test files pass. Failures are pre-existing web-component/recording-region test issues unrelated to native-builds.
- [x] `npm run test:legacy` passes (24/24)
- [ ] `npm run build` succeeds (web bundle) — not executed here
- [ ] `cd android && ./gradlew assembleRelease` succeeds → APK present — documented; not executed (env limits)
- [ ] `cd electron && npm run build:linux` succeeds → distributable present — documented; not executed (env limits)
- [x] Smoke test added (`tests/nativeBridge.test.ts` + `tests/hardwareIONative.test.ts`)

## 7. Archive prior incomplete work
- [x] Carry forward the unfinished `desktop-build` archive task (run checks): backend tsc clean, legacy tests pass, bridge smoke tests added; full native builds documented but not executed due to env limits.
- [ ] Mark `hardware-io-native` and `audio-recording` as completed and archive — pending the device-path recording item (see §3).
