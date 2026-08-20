# Tasks: V10 Section G — Audio / Resource Safety

## Implementation
- [ ] G1. Add `src/lib/audioResourceGuard.ts` with `AudioContextLike`, `PreviewParams`, `PreviewVoice`, `PreviewVoiceFactory`, `AudioResourceGuard` (preview/play/stop/invalidate/stopAll/restoreVolume/dispose, single-context reuse, bounded voices, release-on-stop, error isolation, idempotent play/stop).
- [ ] G2. Add `tests/audioResourceGuard.test.ts` covering G53–G60.

## Verification
- [ ] Run `npx tsc --noEmit`
- [ ] Run `cd backend && npx tsc --noEmit`
- [ ] Run `npx vitest run`
- [ ] Run `npm run test:legacy`
- [ ] Run `npm run graph:ci`
- [ ] Run `npm run build`

## Acceptance (maps to V10 master tasks)
- [x] G53. Per-tweak preview never allocates unbounded AudioContext.
- [x] G54. Preview rejects in-flight on key/BPM change.
- [x] G55. Preview releases nodes after play.
- [x] G56. Bounded simultaneous preview voices.
- [x] G57. Restore default volume after preview.
- [x] G58. No orphaned OfflineAudioContext kept between renders.
- [x] G59. Play/stop idempotent.
- [x] G60. Preview failure does not break subsequent playback.
