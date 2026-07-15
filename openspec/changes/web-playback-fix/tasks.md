# Tasks: Web Playback — No Sound & App Freeze

## Phase 1 — Spec (this change)
- [x] `openspec/changes/web-playback-fix/proposal.md`
- [x] `openspec/changes/web-playback-fix/design.md`
- [x] `openspec/changes/web-playback-fix/tasks.md`
- [ ] Commit spec files (after user approval)

## Phase 2 — Implement (after approval)

### A. Gesture-safe audio context
- [ ] Add `resumeForGesture()` to `UniversalAudioSystem` in `src/lib/universalAudio.ts`
      (resume without awaiting; never throws; web-only).
- [ ] Write a guard so `initialize()` does not re-create an already-resumed ctx.

### B. Feed no-sound fix (`app/tabs/index.tsx` + `src/lib/constants.ts`)
- [ ] Add `preloadPreview(id, duration)` / `getCachedPreview(id)` to
      `src/lib/constants.ts` (module cache of blob URLs).
- [ ] Trigger `preloadPreview` on post load / press-in so the URL is ready before tap.
- [ ] Reorder `handlePlay` so `webAudio.unlock()` + `audioSystem.resumeForGesture()`
      run before any `await`; use cached URL; surface play errors instead of
      swallowing (tap-to-retry affordance).
- [ ] Update `src/hooks/useWebAudioPlayer.ts` so `play()` re-throws autoplay
      rejections instead of silently catching.

### C. Studio no-sound + freeze fix (`app/studio/hooks.ts` + engine)
- [ ] Call `audioSystem.resumeForGesture()` at the start of `togglePlay`
      (before any await).
- [ ] Reuse `renderTracksCached` (existing JSON-keyed cache) for engine stems;
      only rebuild when signature changes.
- [ ] Create `src/lib/renderWorker.ts` (Web Worker, CSP-safe, no SharedArrayBuffer)
      that renders per-track stems via `OfflineAudioContext` and returns
      `ArrayBuffer`s.
- [ ] Update `PlaybackEngine.prepare()` (`src/lib/playbackEngine.ts`) to accept
      pre-/worker-rendered buffers; fall back to main-thread if Worker missing.
- [ ] Throttle playhead: remove `setCurrentBeat` from the `onClockTick` hot path;
      isolate an `TransportPlayhead` subscription (ref + `useSyncExternalStore` /
      dedicated context) so the whole Studio does not re-render per tick.
- [ ] Verify `src/components/LiveWaveformCanvas.tsx` rAF is already locally scoped.

### D. Specs update
- [ ] Add autoplay-compliance + freeze-avoidance Test Requirements to
      `openspec/specs/audio-transport.md`.

### E. Tests (vitest, `tests/webPlayback.test.ts` + transport)
- [ ] `resumeForGesture()` resumes suspended ctx, returns ctx, never throws.
- [ ] `handlePlay` ordering: `resumeForGesture()` / `play()` invoked before
      awaited `generatePreviewUrl` resolves (mock clock + spied AudioContext).
- [ ] `togglePlay` does not synchronously `new OfflineAudioContext` on the main
      thread during the call (spy detects off-thread/delegated render).
- [ ] Clock tick updates only playhead component, heavy child render count == 1.
- [ ] `useWebAudioPlayer.play()` rejects when called without user activation.

## Phase 3 — Check (per AGENTS.md, in order)
- [ ] `npx tsc --noEmit`
- [ ] `cd backend && npx tsc --noEmit`
- [ ] `npx vitest run`
- [ ] `npm run test:legacy`
- [ ] `npm run build`
- [ ] code-review subagent

## Phase 4 — Commit & push
- [ ] Commit implementation + tests + spec updates.
- [ ] `git push`.
