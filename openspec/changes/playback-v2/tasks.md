## 1. Stem render + automation
- [ ] Refactor `src/lib/midiSynth.ts`: extract per-track offline render into `renderTrackStem(track, bpm, duration): Promise<AudioBuffer>` (MIDI + regions + plugin chain + baked modulation, as today).
- [ ] In `renderTrackStem`, for each `track.automation` entry, map the key (`volume`/`pan`/plugin-param id) to its `AudioParam` and call `applyAutomationToParam(param, buildAutomationSchedule(points, bpm), 0)`; for plugin-param keys use `paramToTarget` to find the param's node.
- [ ] Keep `renderTracksToUrl` working (delegates / shim) so existing callers/tests stay green.
- [ ] Add Vitest: a track with a `volume` automation lane produces a stem whose RMS rises/falls over time per the lane (assert via sampling the rendered buffer).

## 2. Stem cache (LRU)
- [ ] Add `stems: Map<trackId,{buffer,hash}>` + `hashTrack(track)` to the playback engine.
- [ ] On play, reuse cached `AudioBuffer` when hash matches; re-render only changed tracks.
- [ ] Cap at 32 stems; evict oldest (disconnect nodes / drop buffer).
- [ ] Add Vitest: same track rendered twice with identical content returns/uses the cached buffer (no second `OfflineAudioContext` decode); changing volume changes the hash and triggers re-render.

## 3. Live mix graph + instant mute/solo
- [ ] Build per-track `AudioBufferSourceNode → GainNode → StereoPannerNode → master` in the shared context.
- [ ] Mute/solo toggles set `gain.gain` immediately (no re-render).
- [ ] Volume/pan sliders use `setTargetAtTime` for click-free live updates.
- [ ] Replace studio's `<audio>`-element playback (`useWebAudioPlayer` for studio) with this graph; remove the full re-render in `togglePlay`/`rerenderAfterMuteSolo` (keep blob-lifecycle discipline).

## 4. Transport: play / pause / seek / loop
- [ ] `play(seekOffset=0)`: `source.start(0, seekOffset)`; track `startCtxTime`.
- [ ] `pause()`: `source.stop()`, preserve `seekOffset`.
- [ ] `seek(t)`: stop + restart sources at `t`.
- [ ] Loop region `[a,b]`: `source.loop=true; loopStart=a; loopEnd=b`.
- [ ] Playhead from `UniversalAudioSystem.ctx.currentTime` (single clock, no drift).

## 5. Reuse + verification
- [ ] Feed `MiniPlayer` + library preview optionally route through the same engine (Phase 3; at minimum keep them working).
- [ ] `npx tsc --noEmit` clean; `npx vitest run` green (existing `audioPlayback`, `dsp`, `modulation`, `lib9`, `studio` suites must stay green).
- [ ] Manual (Playwright): 12-track project plays <150ms; mute/solo instant; automation lane audible; scrub to t=45s resumes; 20 plays no memory growth.

## Notes / dependencies
- Builds on `web-player-studio-audio` (single context, no leaks, clock) and `wire-modulation-matrix` (baked modulation). Those must be merged first.
- Larger than a bug-fix; phase the work (stems+cache → automation → live graph → transport) and verify after each phase.
