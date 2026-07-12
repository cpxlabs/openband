## 1. Stem render + automation
- [x] `src/lib/midiSynth.ts` — added `renderTrackStem(track, bpm, duration, buses?)` returning one track's AudioBuffer (MIDI + regions + plugin chain + baked modulation).
- [x] `renderTrackStem` bakes `track.automation`: `volume`→track gain, `pan`→panner, via `applyAutomationToParam(buildAutomationSchedule(points, bpm), 0)` (base value set first).
- [x] `renderTracksToUrl` unchanged (still used by tests/other screens).
- [x] `tests/playbackEngine.test.ts` — stem with `volume` automation lane yields time-varying RMS.

## 2. Stem cache (LRU)
- [x] `src/lib/playbackEngine.ts` — `stems: Map` LRU-capped at 32, `hashTrack` over `{midi, regions, plugins, automation, volume, pan, bpm}`.
- [x] `prepare` reuses cached buffer when hash matches; re-renders only changed tracks.
- [x] Excludes currently-playing stems from eviction (no abrupt cut on large projects).
- [x] `tests/playbackEngine.test.ts` — same content reuses stem; 40 tracks cap at 32.

## 3. Live mix graph + instant mute/solo
- [x] `PlaybackEngine` builds per-track `BufferSource→Gain→StereoPanner→master` on the shared `audioSystem` context.
- [x] Mute/solo sets gain instantly (click-free via `setTargetAtTime`); volume/pan faders use `setTargetAtTime`.
- [x] `app/studio/[id].tsx` web playback uses `PlaybackEngine` with fallback to the `<audio>` blob path on failure/null context.

## 4. Transport: play / pause / seek / loop
- [x] `play(seek)`, `pause()`, `seek(t)`, `setLoop(a,b)` on live sources.
- [x] Playhead from `UniversalAudioSystem.ctx.currentTime` (single clock, no drift).

## 5. Reuse + verification
- [x] Feed/library/MiniPlayer unchanged (still `<audio>`); studio uses the engine.
- [x] `npx tsc --noEmit` clean; `npx vitest run` green (studio/audioPlayback/dsp/modulation/lib9 suites pass — 1010 tests).
- [ ] Manual (Playwright): 12-track latency <150ms, automation audible, scrub to t=45s, 20 plays no leak (not automated — live graph only exercised in real browser).

## Deviations / notes
- **Plugin-param automation deferred** (volume/pan only baked this pass; plugin-param lanes skipped).
- Automation + live faders: when a `volume`/`pan` lane exists, the live fader is left at unity (stem already encodes it) to avoid double-applying; mute/solo always instant.
- Live-graph studio integration is web-only and guarded by a blob fallback; automated tests cover the fallback + engine unit logic, not real-browser audio.
