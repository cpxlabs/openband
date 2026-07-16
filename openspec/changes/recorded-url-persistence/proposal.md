# Proposal: Recorded-URL Persistence Across Reloads

## Context
Recorded audio in the Studio is currently stored as a `blob:` URL inside
`TrackRegion.url` (created via `createTrackedBlob` in `app/studio/[id].tsx:458`).
`blob:` URLs are memory-only and are **revoked by the browser on page reload**,
so any project that is saved (`saveProject` → JSON) and reloaded loses its
recorded regions: the region exists in the project JSON but its `url` points at a
dead `blob:`, and playback/render (`fetch(region.url)` in `src/lib/midiSynth.ts`
and `src/lib/universalAudio.ts`) fails.

`openspec/specs/audio-system.md` lists this as a known follow-up gap
("recorded `url`s are not persisted across reloads"). This change closes it.

## Problem Description
1. `toggleRecording` stores `uri = createTrackedBlob(blob)` (a `blob:` URL) in
   the region. Saved to project JSON as-is.
2. On reload, `loadProject` returns the JSON; the region `url` is still the old
   `blob:`, which no longer resolves → silent/error on play and on `renderTracksToUrl`.
3. Same gap on native: `recorderState.url` is a temp file that the bridge
   `saveProject` (localStorage/JSON) does not carry forward.

## Objectives
1. Introduce a durable **asset store** that persists recorded audio bytes and
   returns a stable, reload-safe pointer (`asset://<id>`).
2. Store the `asset://<id>` pointer (not the raw `blob:` URL) in `TrackRegion.url`
   for recorded regions, so the project JSON round-trips.
3. On project load, **hydrate** `asset://` pointers back into live `blob:` URLs
   (cached in memory; revoked on unmount) so playback/render work after reload.
4. Keep the audio engine's `fetch(region.url)` path working by resolving
   `asset://` to a live `blob:` URL before fetch/decode.

## Non-Goals
- Cloud sync of recorded assets (separate `cloud-sync` concern; the `asset://`
  pointer is already cloud-agnostic and can be lifted later).
- Changing the region schema type — `url: string` stays; we only change its
  *value* convention for recorded regions.
- Native filesystem path migration beyond what the bridge already supports.

## Approach
- **Asset store** (`src/lib/assetStore.ts`): `saveAsset(blob): Promise<string>`
  returns `asset://<id>` (id = deterministic or random). Web: persist bytes in
  IndexedDB (`openband_assets` store). Native: persist via
  `OpenBandNative.writeFile(documentsPath/assets/<id>.wav)` and return pointer.
  `loadAssetUrl(id): Promise<string>` returns a live `blob:` URL from stored
  bytes (web: read IndexedDB → `URL.createObjectURL`; native: read file → blob).
  `resolveAssetUrl(url)`: if `url` starts with `asset://`, return a cached live
  `blob:` URL (creating one on first use), else return `url` unchanged.
- **Record flow** (`app/studio/[id].tsx`): web path persists the recorded blob
  via `saveAsset` and stores `asset://<id>` in the region `url` (instead of the
  raw `blob:`). Native keeps file-path behavior but also routes through the store
  so the pointer is consistent.
- **Hydration** (`app/studio/[id].tsx` / `useStudioTransport` or load effect):
  after `loadProject`, scan `tracks` for `asset://` urls and call
  `resolveAssetUrl` to populate the live-blob cache; revoke on unmount.
- **Engine resolution**: in `midiSynth.ts` and `universalAudio.ts` render paths,
  wrap `fetch(region.url)` with `resolveAssetUrl(region.url)` so `asset://`
  pointers resolve to a fetchable `blob:` URL. (Pure, no behavior change for
  `http`/`blob` urls.)
- **Tests**: vitest for `assetStore` (save→resolve round-trip in fake-indexeddb
  or in-memory mock; `resolveAssetUrl` passthrough for non-asset urls; cache
  reuse).

## Risks
- IndexedDB unavailable (private mode) → fail soft: fall back to in-memory
  `blob:` URL for the session (pointer won't survive reload, but won't crash).
- Blob URL leak → revoke cached URLs on studio unmount.
