# Design: Recorded-URL Persistence Across Reloads

## 1. Asset store (`src/lib/assetStore.ts`)

```ts
export const ASSET_PREFIX = "asset://";

let assetCache = new Map<string, string>(); // id -> live blob: URL

export async function saveAsset(blob: Blob): Promise<string> {
  const id = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await persistBytes(id, blob);
  const url = URL.createObjectURL(blob);
  assetCache.set(id, url);
  return ASSET_PREFIX + id;
}

export async function resolveAssetUrl(url: string): Promise<string> {
  if (!url.startsWith(ASSET_PREFIX)) return url;
  const id = url.slice(ASSET_PREFIX.length);
  const cached = assetCache.get(id);
  if (cached) return cached;
  const blob = await readBytes(id);
  const live = URL.createObjectURL(blob);
  assetCache.set(id, live);
  return live;
}

export function resolveAssetUrlSync(url: string): string {
  if (!url.startsWith(ASSET_PREFIX)) return url;
  return assetCache.get(url.slice(ASSET_PREFIX.length)) ?? url;
}

export function revokeAssetCache(): void {
  for (const u of assetCache.values()) {
    try { URL.revokeObjectURL(u); } catch {}
  }
  assetCache.clear();
}
```

### Web persistence (`persistBytes`/`readBytes`)
IndexedDB `openband_assets` store (`id` keyPath, `blob` value). `persistBytes`
writes the blob; `readBytes` reads it. If IndexedDB is unavailable, `persistBytes`
is a no-op (asset still lives in `assetCache` for the session) and `readBytes`
reads from an in-memory fallback map.

### Native persistence
`OpenBandNative.writeFile(path, await blob.arrayBuffer())` under
`(await getDocumentsPath())/assets/<id>.wav`; `readBytes` uses
`OpenBandNative.readFile`. Falls back to in-memory if bridge missing.

## 2. Record flow (`app/studio/[id].tsx`, `toggleRecording`)
Web branch (currently `uri = createTrackedBlob(blob)`):
```ts
const pointer = await saveAsset(blob); // returns asset://<id>
uri = pointer;
```
Native branch: keep `uri = recorderState?.url || ...` but also `await saveAsset`
is unnecessary (file path already persists); store the file path directly. To
keep one code path, native stores its file path as the `url` (already reload-safe
on device). Only web needs the `asset://` pointer.

The region is unchanged otherwise; `markBlobActive` is replaced by the cache
populated inside `saveAsset`.

## 3. Hydration on load (`app/studio/[id].tsx`)
After `loadProject` resolves, before first render/play, scan all tracks' regions
for `asset://` urls and eagerly call `resolveAssetUrl` to warm `assetCache`
(so the first play doesn't await IndexedDB). On studio unmount, call
`revokeAssetCache()`.

## 4. Engine resolution (`src/lib/midiSynth.ts`, `src/lib/universalAudio.ts`)
Every `fetch(region.url, ...)` becomes `fetch(await resolveAssetUrl(region.url), ...)`.
`resolveAssetUrl` is idempotent for non-asset urls, so no behavioral change for
`http`/`blob`/data urls.

- `midiSynth.ts:825` → `const r = await fetch(await resolveAssetUrl(region.url), { credentials: "omit" });`
- `midiSynth.ts:1099` → same
- `universalAudio.ts:338` and `:405` → same

## 5. Test Requirements (add to `audio-system.md`)
- [ ] `saveAsset` returns an `asset://` pointer and `resolveAssetUrl` returns a
      fetchable `blob:` URL for it (web, IndexedDB or in-memory fallback).
- [ ] `resolveAssetUrl` passes through `http`/`blob`/data urls unchanged.
- [ ] A recorded region stored as `asset://<id>` resolves to a live blob URL on
      a second "load" (cache warm), enabling playback after reload.
- [ ] `revokeAssetCache` clears cached URLs without throwing.

## 6. Verification
1. `npx tsc --noEmit`
2. `cd backend && npx tsc --noEmit`
3. `npx vitest run tests/assetStore.test.ts`
4. `npx vitest run` (no regressions)
5. `npm run test:legacy`
6. `npm run build`
