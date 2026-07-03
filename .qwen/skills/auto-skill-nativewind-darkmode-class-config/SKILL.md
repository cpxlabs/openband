---
name: nativewind-darkmode-class-config
description: Fix NativeWind v4 "Cannot manually set color scheme" error using CSS custom property
source: auto-skill
extracted_at: '2026-07-03T12:38:19.918Z'
---

## Problem

When running the Expo web dev server with NativeWind v4, this error appears:

```
Cannot manually set color scheme, as dark mode is type 'media'.
Please use StyleSheet.setFlag('darkMode', 'class')
```

## Root Cause

NativeWind v4 uses `react-native-css-interop` internally, which reads the dark mode configuration from a CSS custom property `--css-interop-darkMode`. Without it, the default is `"media"` (respects `prefers-color-scheme`), which blocks manual color scheme toggling.

## Fix

Add the CSS variable in `global.css` at the top (before any other rules):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* NativeWind dark mode configuration: class-based toggling */
:root {
  --css-interop-darkMode: class dark;
}
```

The value format is `"<mode> <class-name>"` — `class dark` means toggle via the `.dark` class on `<html>`.

## What NOT to do

- Do NOT use `StyleSheet.setFlags({ darkMode: "class" })` in app code — this API does not exist in react-native-web.
- Do NOT add `darkMode: 'class'` to the `withNativeWind` call in `metro.config.js` — it's not a valid option in NativeWind v4.
- Do NOT add `darkMode: 'class'` to `tailwind.config.js` — NativeWind v4 uses CSS interop, not standard Tailwind config.

## After applying

Restart the Metro bundler (kill existing `expo start` process, then `npm run web`). The error will disappear and `[data-theme="light"]` / `[data-theme="dark"]` attribute toggling will work correctly.
