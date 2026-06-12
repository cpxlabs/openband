# Building an APK with EAS Build

This guide covers building an Android APK for OpenBand using Expo's EAS Build (remote build servers — no local Android SDK needed).

---

## Prerequisites

- An [Expo](https://expo.dev) account (free tier works)
- An [EAS](https://expo.dev/eas) account (on the same login)

## Setup

### 1. Log in to Expo

```bash
npx eas login
```

### 2. Configure the project

The `eas.json` at the project root already has a `preview` profile configured for APK output:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

You can also add a `preview` profile that produces an APK by running:

```bash
npx eas build:configure
```

Then edit `eas.json` — for the profile you'll use, add:

```json
"android": {
  "buildType": "apk"
}
```

### 3. Build the APK

```bash
npx eas build --platform android --profile preview
```

- This uploads your project to Expo's build servers
- Build takes 5–15 minutes
- You'll get a download link when it's done

### 4. Download to `dist/`

After the build completes, you'll see a URL like:

```
https://expo.dev/accounts/<user>/projects/openband/builds/<build-id>
```

Download the APK from that page and place it in the `dist/` folder:

```bash
mkdir -p dist
# Download from the URL above
```

---

## Profiles Reference

| Profile | Type | Use Case |
|---------|------|----------|
| `development` | Development build | Debugging, testing native modules |
| `preview` | APK | Sharing test builds, installing directly |
| `production` | AAB (default) | Play Store submission |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Not logged in` | Run `npx eas login` |
| `Project not found` | Run `npx eas init` to register on EAS |
| `Build fails` | Check build logs in Expo dashboard or run `npx eas build:list` |
| Need a different keystore | EAS manages keystores automatically; or upload your own in dashboard |
| APK too large | Enable ProGuard in `android/app/build.gradle` after prebuild |

---

## Local Build (Alternative)

If you have Android SDK + Java installed:

```bash
npx expo prebuild
cd android && ./gradlew assembleRelease
# APK at android/app/build/outputs/apk/release/app-release.apk
cp android/app/build/outputs/apk/release/app-release.apk dist/
```
