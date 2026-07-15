# Tasks: web-player-studio-audio

- [x] **T1** — Add `masterPlugins?: Plugin[]` param to `renderTracksToUrl` in
      `src/lib/midiSynth.ts` and apply `applyPluginChain` to the rendered master buffer
      (fall back to dry mix on error).
- [x] **T2** — Add `masterPlugins?: Plugin[]` param to `renderTracksCached` in
      `app/studio/hooks.ts`, include it in the cache key, and forward it to
      `renderTracksToUrl`.
- [x] **T3** — Add `masterPlugins?: Plugin[]` to `useStudioTransport` params and pass it to
      `renderTracksCached` inside `togglePlay`.
- [x] **T4** — Pass `masterPlugins` into `useStudioTransport(...)` and into the
      `renderTracksCached(...)` call inside `rerenderAfterMuteSolo` in
      `app/studio/[id].tsx`.
- [x] **T5** — Add vitest tests for pure functions in `tests/studio-audio-pure.test.ts`
      (clockManager, automationEngine, audioTelemetry ring buffer + averages, crash save
      coalescing, latencyMonitor).
- [x] **T6** — Run `npx tsc --noEmit` and `npx vitest run`; ensure no regressions.
- [x] **T7** — Fix async test callback in `tests/studio-audio-pure.test.ts`
       (crash save coalescing `it` was missing `async`) so `tsc --noEmit` passes.

## Verification checklist

```
npx tsc --noEmit
npx vitest run
```
