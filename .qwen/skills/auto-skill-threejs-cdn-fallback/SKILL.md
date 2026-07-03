---
name: threejs-cdn-fallback
description: Pattern for loading Three.js via CDN with multiple fallback sources in Expo web apps — avoids Metro bundler resolution issues
source: auto-skill
extracted_at: '2026-07-03T16:08:19.519Z'
---

## Problem

Three.js cannot be imported via `import * as THREE from "three"` in Expo projects without adding it as a dependency, which causes Metro bundler resolution failures on Vercel builds. The solution is to load Three.js from a CDN script tag at runtime.

## Approach

Load Three.js from multiple CDN sources with sequential fallback. If one CDN is blocked or fails, try the next.

```ts
const THREE_CDNS = [
  "https://unpkg.com/three@0.170.0/build/three.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.min.js",
  "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.min.js",
];

async function loadThree() {
  const existing = window.THREE;
  if (existing) return existing;

  for (const url of THREE_CDNS) {
    try {
      const three = await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.onload = () => resolve(window.THREE);
        script.onerror = () => reject(new Error(`Failed to load from ${url}`));
        document.head.appendChild(script);
      });
      return three;
    } catch {
      continue; // try next CDN
    }
  }
  throw new Error("Failed to load Three.js from all CDN sources");
}
```

## Why multiple CDNs

- **unpkg** — fastest for npm packages, but occasionally rate-limited
- **cdnjs** — most reliable globally, but slightly older versions
- **jsdelivr** — good fallback, fast in Asia/Europe

Order matters: try unpkg first (fastest), then cdnjs (most reliable), then jsdelivr.

## Error handling

Always show a graceful fallback UI when all CDNs fail:

```tsx
{loadError && (
  <View className="absolute inset-0 items-center justify-center bg-black">
    <Text className="text-4xl mb-3">🏠</Text>
    <Text className="text-white font-bold text-lg mb-2">3D Unavailable</Text>
    <Text className="text-gray-400 text-center text-sm">{loadError}</Text>
  </View>
)}
```

## Type safety

Since Three.js has no TypeScript types installed when loaded via CDN, use an eslint-disable comment for the dynamic import:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThreeAny = any;
```

This is acceptable because:
- Three.js is loaded at runtime, not bundled
- The types would add 2MB to the bundle
- The dynamic access pattern is unavoidable with CDN loading
