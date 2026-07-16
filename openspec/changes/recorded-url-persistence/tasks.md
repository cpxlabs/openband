# Tasks: Recorded-URL Persistence Across Reloads

## Phase 1 — Spec (this change)
- [x] `openspec/changes/recorded-url-persistence/proposal.md`
- [x] `openspec/changes/recorded-url-persistence/design.md`
- [x] `openspec/changes/recorded-url-persistence/tasks.md`
- [ ] Commit spec files (after user approval)

## Phase 2 — Implement (after approval)
- [ ] Create `src/lib/assetStore.ts` with `ASSET_PREFIX`, `saveAsset`,
      `resolveAssetUrl`, `resolveAssetUrlSync`, `revokeAssetCache`, and
      web/native `persistBytes`/`readBytes` (IndexedDB + in-memory fallback).
- [ ] Update `app/studio/[id].tsx` `toggleRecording`: web stores `asset://`
      pointer via `saveAsset` instead of raw `blob:`; add hydration of
      `asset://` urls after `loadProject` + `revokeAssetCache` on unmount.
- [ ] Update `src/lib/midiSynth.ts` (`:825`, `:1099`) and `src/lib/universalAudio.ts`
      (`:338`, `:405`) `fetch(region.url)` → `fetch(await resolveAssetUrl(region.url))`.
- [ ] Add Test Requirements to `openspec/specs/audio-system.md`.
- [ ] Update `docs/pending-implementations.md` (mark recorded-URL persistence DONE).

## Phase 3 — Tests
- [ ] Create `tests/assetStore.test.ts`: save→resolve round-trip, passthrough for
      non-asset urls, cache reuse, `revokeAssetCache` safe.

## Phase 4 — Check (per AGENTS.md, in order)
- [ ] `npx tsc --noEmit`
- [ ] `cd backend && npx tsc --noEmit`
- [ ] `npx vitest run tests/assetStore.test.ts`
- [ ] `npx vitest run` (no regressions)
- [ ] `npm run test:legacy`
- [ ] `npm run build`
- [ ] code-review subagent

## Phase 5 — Commit & push
- [ ] Commit implementation + tests + spec updates.
- [ ] `git push`.
