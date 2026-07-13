/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Shared Three.js CDN loader for the immersive 3D creative-mode screens.
 *
 * All 3D screens previously duplicated this CDN list + dynamic-import cascade.
 * Loading via `new Function("url", "return import(url)")` avoids the bundler
 * statically resolving the URL, and the result is memoized so subsequent
 * screens reuse the already-loaded module.
 */

export type ThreeModule = any;

export const THREE_CDNS = [
  "https://unpkg.com/three@0.160.0/build/three.module.js",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.js",
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
];

let cached: ThreeModule | null = null;
let pending: Promise<ThreeModule> | null = null;

export async function loadThree(): Promise<ThreeModule> {
  if (cached) return cached;
  if (pending) return pending;

  pending = (async () => {
    for (const url of THREE_CDNS) {
      try {
        const mod = await new Function("url", "return import(url)")(url);
        cached = mod;
        return mod;
      } catch {
        continue;
      }
    }
    pending = null;
    throw new Error("Failed to load Three.js from all CDN sources");
  })();

  return pending;
}
