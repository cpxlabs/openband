# Proposal — Native Builds

## Context
OpenBand targets web, desktop (Electron), Android, and iOS. The build scaffolding for the
native targets already exists:

- `android/` — a full Expo prebuild Gradle project (`build.gradle`, `settings.gradle`,
  `app/src/main/java`, `app/src/main/AndroidManifest.xml`, `app/build.gradle`,
  `debug.keystore`). No signed release artifact has ever been produced.
- `ios/` — Expo prebuild Xcode project (`Podfile`, `openband.xcodeproj`, `openband/`),
  but signing for a real device / App Store is unconfigured.
- `electron/` — `main.js`, `preload.js`, `package.json` with `electron-builder` config
  (`build:linux`, `build:mac`, `build:win`, `build:electron`). The desktop bridge and IPC
  handlers exist, but `electron-builder` has never been run to emit a distributable.

Two prior changes were archived **mid-effort** and left native correctness unfinished:

- `openspec/archive/desktop-build/` — archived with its final task unchecked:
  `- [ ] Run checks (tsc, vitest)` and with no verified Electron build artifact.
- `openspec/archive/app-responsivity/` — archived mid-effort; responsive layout gaps on
  native shells were never validated end-to-end.

Two **in-flight** changes describe the native bridge gaps that block a real device build:

- `openspec/changes/hardware-io-native/` — `src/lib/hardwareIO.ts` is web-only; every device
  function is guarded by `Platform.OS !== "web"` (`hardwareIO.ts:48`, `:121`, `:238`,
  `:262`) and the `NativeBridge` contract (`src/bridge/interface.ts:20-33`) has no hardware
  enumeration / patchbay methods.
- `openspec/changes/audio-recording/` — the recording engine is designed around web
  `AudioWorklet` + `getUserMedia`; on a device it needs `expo-audio` capture
  (`useAudioRecorder` / `AudioRecorder`) rather than the browser `MediaStream` path.

## Problem Description
- No verified, shippable release artifact exists for Android (`assembleRelease`) or the
  desktop (`electron-builder`) despite complete build configs.
- Native bridge gaps remain: recorded audio and hardware I/O do not work on a real device
  because the library calls are no-ops off-web and the bridge contract has no native methods
  for them.
- The archived `desktop-build` and `app-responsivity` changes left checks unrun and
  responsive/native behavior unverified.

## Objectives
- Produce a **signed Android APK** via `cd android && ./gradlew assembleRelease` and an
  **Electron distributable** via `electron-builder` as verifiable release artifacts.
- Close the native bridge gaps so recorded audio and hardware I/O work on device, by
  extending the `NativeBridge` contract and implementing the native paths described in
  `hardware-io-native` and `audio-recording`.
- Document the exact build commands in a `BUILD.md` (or `AGENTS.md` note) so any contributor
  can reproduce a release.
- Complete the unfinished verification left by the archived `desktop-build` change
  (`tsc`, `vitest`, `npm run build`).

## Target Platform Order
**Recommend Android first, then Electron desktop.**

- Android: the prebuild project is complete and `./gradlew assembleRelease` is self-contained
  once signing is configured (`android/app/build.gradle` + `gradle.properties`); it exercises
  the same `expo-audio` runtime that the recording gap depends on, so fixing that gap is
  validated by the build.
- Electron: `electron-builder` config exists and the desktop bridge is the most mature of the
  native bridges (`src/bridge/electron.ts` delegates to `window.electronAPI`); producing an
  AppImage/deb/dmg validates the `desktop-build` archive's final unchecked task.
- iOS is **out of scope** for the first pass: it requires a paid Apple Developer identity and
  device provisioning that cannot be verified in this environment. The `ios/` prebuild is left
  as-is; only documentation notes the manual steps.

## Out of Scope
- iOS App Store / TestFlight signing and distribution (no Apple identity available here).
- New audio DSP or capture-graph behavior — only enumeration, route persistence, and the
  device recording entry point.
- Modifying build config files (`android/app/build.gradle`, `electron/package.json`,
  `gradle.properties`, `tsconfig.json`, etc.) unless strictly required for the release; the
  AGENTS.md rule "Don't modify config files unless the task explicitly requires it" applies.
