- [ ] Refactor `UniversalAudioSystem` to enforce a single lazy `AudioContext` (remove secondary contexts in `useUniversalAudio.ts`).
- [ ] Extend `renderMixdown()` to accept audio-region `url` sources and decode + schedule them (currently MIDI-only).
- [ ] Wire `timeStretch.ts` / pitch into the rendered graph so the pitch slider is audible.
- [ ] Add `blobRegistry` + `revokeObjectURL` on stop/unmount/replace; add cleanup in `studio/[id].tsx`.
- [ ] Replace transport clock in Studio with `UniversalAudioSystem.ctx.currentTime`; remove `<audio>`-element time reads.
- [ ] Update feed `MiniPlayer` + library preview to route through the same `audioSystem` pipeline.
- [ ] Add Vitest test: `renderMixdown` with a mock `url` region produces a non-silent buffer (assert RMS > 0).
- [ ] Add Vitest test: blob registry size does not grow across 10 renders.
- [ ] Manual E2E (Playwright): load demo project, hear MIDI + audio, pitch slider audible, playhead aligned at $t=30s$.

## Recording capture → region → playback (verified)
- [x] `app/studio/[id].tsx` — After recording completes, the captured audio URL is stored as a `TrackRegion { id, start, duration, url }` in the armed track (or a new track when none is armed), via `useHistory.setState` (undo/redo).
- [x] `src/lib/universalAudio.ts` — `renderMixdownWeb` handles `region.url` via `fetch`+decode; recording temp files use `createTrackedBlob` so they participate in blob lifecycle.
- [x] `src/lib/projectStore.ts` — Persists `track.regions` (including recording regions) via `saveProject`.

> Verified by the `web-studio-recording` change: hardened `getUserMedia` permission guard (throws `MIC_PERMISSION_DENIED`), `MediaRecorder` fallback on worklet `addModule` failure, empty-buffer (`null`) guard, `createTrackedBlob` registration, `markBlobActive` on the take, transport render refresh via `rerenderAfterMuteSolo`, and `revokeTrackedBlob` on undo/delete. Tests: `tests/lib9.test.ts` (real recording round-trip) and `tests/studio.test.tsx` (web recording smoke: start/stop creates a tracked region; permission-denied creates no region).
