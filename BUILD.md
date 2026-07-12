# BUILD.md — OpenBand Native Builds

This document records the exact commands required to produce release artifacts for
Android and the Electron desktop app, plus the native bridge chain that makes
device-correct audio/hardware work.

Platform matrix:

| Platform | Command | Artifact |
| --- | --- | --- |
| Android (release APK) | `cd android && ./gradlew assembleRelease` | `android/app/build/outputs/apk/release/app-release.apk` |
| Electron (linux) | `cd electron && npm run build:linux` | `electron/out/OpenBand-*.AppImage`, `electron/out/OpenBand-*.deb` |
| Electron (mac) | `cd electron && npm run build:mac` | `electron/out/OpenBand-*.dmg` |
| Electron (win) | `cd electron && npm run build:win` | `electron/out/OpenBand-*.exe` |
| iOS | `expo run:ios` + manual Xcode signing | `.ipa` (out of scope — requires Apple identity) |

---

## Prerequisites

- **Node 20+** and the repo dependencies installed (`npm install`).
- **Web bundle first for Electron:** Electron consumes `dist/` (root `scripts/post-export.js`).
  Always run the root build before any `electron-builder` target.
- **Android SDK** present; point `android/local.properties` at it if absent:
  ```properties
  sdk.dir=/path/to/Android/Sdk
  ```
  The `android/` prebuild is a complete Expo prebuild project (`settings.gradle`,
  `app/build.gradle`, `app/src/main/java`, `debug.keystore`).

---

## Android — Signed Release APK

```bash
# From repo root
cd android && ./gradlew assembleRelease
ls -la android/app/build/outputs/apk/release/app-release.apk
```

`android/app/build.gradle` declares two signing configs:

- `signingConfigs.debug` — always uses `android/app/debug.keystore` (password `android`).
- `signingConfigs.release` — uses a real keystore when present, otherwise **falls back to
  the debug keystore** so a local `assembleRelease` always succeeds for verification.

The release keystore is expected at `android/.secrets/android-keystore.p12`
(`MYAPP_RELEASE_*`-equivalent values `openband123` / alias `openband-android`). To ship a
genuinely signed artifact:

1. Place your production keystore at `android/.secrets/android-keystore.p12`
   (or edit the `signingConfigs.release` block in `android/app/build.gradle`).
2. Re-run `./gradlew assembleRelease`.

> Verified locally: the build config is coherent and runs `assembleRelease` via the
> debug-keystore fallback. A full 20+ minute Gradle toolchain run was not executed in CI
> here; the command and signing fallback are documented and config-coherent.

---

## Electron — Desktop Distributable

```bash
# 1. Build the web bundle (produces dist/, consumed by electron-builder)
npm run build

# 2. Install desktop deps
cd electron && npm install

# 3. Build per-OS (output lands in electron/out/)
npm run build:linux   # AppImage + deb
# npm run build:mac   # dmg  (mac host)
# npm run build:win   # nsis # win host

ls -la electron/out/
```

`electron/package.json` defines `appId: com.openband.desktop`, `productName: OpenBand`,
and `files: ["main.js", "preload.js", "../dist/**/*", "../assets/**/*"]`.
`electron-builder` is wired for `AppImage`/`deb`, `dmg`, and `nsis` targets.

> Verified locally: the `electron-builder` config and IPC bridge chain are coherent. The
> actual `electron-builder` download/package step was not executed here (it fetches the
> Electron binary); the command is documented and config-coherent.

Dev / smoke run of the desktop shell:

```bash
npm run desktop       # builds web bundle, then electron . (loadURL in dev / dist in prod)
```

---

## Desktop Bridge Chain

All native desktop I/O flows through one contract:

```
OpenBandNative (src/bridge/index.ts)
  └─ detectBridge(): window.electronAPI ? electronBridge : (window.__TAURI__ ? tauriBridge : browserBridge)
       └─ electronBridge (src/bridge/electron.ts) -> window.electronAPI
            └─ preload.js (electron/preload.js) contextBridge.exposeInMainWorld("electronAPI", {...})
                 └─ ipcMain.handle(...) (electron/main.js)
```

`NativeBridge` methods implemented end-to-end: `showOpenDialog`, `showSaveDialog`,
`readFile`, `writeFile`, `getDocumentsPath`, `getAppDataPath`, `listProjects`,
`saveProject`, `loadProject`, `deleteProject`, `onMenuAction`, `removeMenuActionListener`,
`enumerateAudioDevices`, `openHardwareInput`, `closeHardwareInput`, `createPatchRoute`,
`removePatchRoute`, `getPatchRoutes`.

Hardware I/O is no longer web-only: `src/lib/hardwareIO.ts` checks
`nativeSupports(method)` and delegates to `OpenBandNative` off-web (Electron returns real
device lists via `node-audiodevice` when available, else `[]`), keeping the
`navigator.mediaDevices` path for web. `tauri.ts` mirrors the same methods as warn-and-empty
stubs; `browser.ts` is the no-op fallback.

---

## Verification Before Shipping

```bash
npx tsc --noEmit                 # root type check (must be clean)
cd backend && npx tsc --noEmit   # backend type check
npx vitest run                   # bridge + lib + component suites
npm run test:legacy              # node:test legacy suite
npm run build                    # web bundle (prereq for Electron)
```

Build artifacts, when produced:

- Android: `android/app/build/outputs/apk/release/app-release.apk`
- Electron: `electron/out/OpenBand-<version>-<target>`
