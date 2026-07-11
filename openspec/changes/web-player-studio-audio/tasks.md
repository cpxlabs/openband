# Tasks: Web Player Studio Audio Playback Overhaul

## Phase 1: Unified render entry point
- [ ] **1.1** `src/lib/midiSynth.ts` — Extract a `renderTracksToBuffer(tracks, { bpm, mood, buses, semitones, playbackRate }): Promise<AudioBuffer>` from the existing `renderTracksToUrl` body; keep `renderTracksToUrl` as a thin wrapper returning a tracked blob URL.
- [ ] **1.2** `src/lib/universalAudio.ts` — Extend `renderMixdown(tracks, opts)` so it mixes **both** MIDI-note tracks (via `renderTracksToBuffer`) and audio-region `url`s (existing `region.url` handling). Return `{ buffer, hash, url }`.
- [ ] **1.3** `src/lib/universalAudio.ts` — Compute a stable `hash` from `tracks + buses + bpm + mood + semitones + playbackRate` (JSON + djb2 or `crypto.subtle`).
- [ ] **1.4** `app/studio/[id].tsx` — Replace `renderTracksToUrl(...)` in `togglePlay` and `rerenderAfterMuteSolo` with `audioSystem.renderMixdown(tracks, { bpm: initialBpm, mood: projectMood, buses, semitones: pitchShiftSemitones, playbackRate })`.

## Phase 2: Render cache
- [ ] **2.1** `src/lib/universalAudio.ts` — Add `renderCache: Map<string, { url, blob, buffer }>`; on `renderMixdown` return cached `url` when `hash` matches.
- [ ] **2.2** `src/lib/universalAudio.ts` — Register cached blob URLs via `createTrackedBlob` so they join the 15-min / 100-entry eviction.
- [ ] **2.3** `app/studio/[id].tsx` — `rerenderAfterMuteSolo` reuses the cached URL (mute/solo not in hash) and preserves the current playhead (seek to previous `currentTime`) instead of restarting at 0.
- [ ] **2.4** `src/lib/universalAudio.ts` — Add `clearRenderCache()` (revoke all cached tracked URLs) for teardown.

## Phase 3: Real pitch shift
- [ ] **3.1** `src/lib/universalAudio.ts` — Add `applyPitchAndRate(buffer, semitones, playbackRate)` using `pitchShift` (existing) for semitones and `timeStretch` for `playbackRate`; call it inside `renderMixdown` before returning.
- [ ] **3.2** `app/studio/[id].tsx` — Fold `pitchShiftSemitones` into the `renderMixdown` options (remove cosmetic-only usage at `:1651`/`:1654`); keep `webAudio.setPlaybackRate` only when pitch is NOT pre-applied.
- [ ] **3.3** `app/studio/[id].tsx` — When `playbackRate` changes via UI, update the render hash and re-render (debounced) so tempo/pitch stay correct.

## Phase 4: Blob lifecycle hygiene
- [ ] **4.1** `app/studio/[id].tsx` — Replace both direct `URL.revokeObjectURL(currentUrlRef.current)` calls with `audioSystem.revokeTrackedBlob(currentUrlRef.current)`.
- [ ] **4.2** `app/studio/[id].tsx` — Register the pitch-shifted URL via `audioSystem.createTrackedBlob(blob)` (`:498`) instead of bare `URL.createObjectURL`.
- [ ] **4.3** `src/lib/constants.ts` — Add `clearPreviewUrlCache()` that revokes all cached preview URLs.
- [ ] **4.4** `app/tabs/index.tsx` — Call `clearPreviewUrlCache()` in the Feed unmount cleanup effect.

## Phase 5: Clock sync
- [ ] **5.1** `src/lib/clockManager.ts` — Change `startClock(intervalMs, getAudioTime: () => number)`; remove internal `getSharedAudioContext().currentTime` reading.
- [ ] **5.2** `app/studio/[id].tsx` — Pass `() => (isWeb ? webAudio.currentTime : player.currentTime)` as `getAudioTime` when starting the clock.

## Phase 6: Autoplay consolidation
- [ ] **6.1** `app/studio/[id].tsx` — In `togglePlay`, keep `webAudio.unlock()` + `await audioSystem.ensureContext()` at the very top, before async render; treat `ensureContext` rejection as the single `autoplayBlocked` trigger.
- [ ] **6.2** `app/studio/[id].tsx` — Wrap the single `replace`+`play` pair (web and native) in one try/catch that sets `autoplayBlocked` once; remove the duplicate path.

## Phase 7: Plugin effects DSP coverage (applyPluginChain)
- [ ] **7.1** `src/lib/pluginChain.ts` — Implement `applyPluginChain(buffer, plugins, sampleRate)` that handles all 19 `PluginType` values:
  - [ ] 7.1.1 Copy existing 9 handled types from `applyMasteringChain` (eq, compressor, limiter, truePeakLimiter, multibandCompressor, stereoImager, tapeSaturator, deesser).
  - [ ] 7.1.2 Implement `distortion` — WaveShaper with hard-clip curve (`makeDistortionCurve(size, drive)`).
  - [ ] 7.1.3 Implement `reverb` — ConvolverNode with generated noise IR (configurable `decay`, `damping`, `mix`).
  - [ ] 7.1.4 Implement `delay` — DelayNode (configurable `delayTime`, `feedback`, `mix`).
  - [ ] 7.1.5 Implement `filter` — BiquadFilterNode (configurable `type`, `frequency`, `Q`, `gain`).
  - [ ] 7.1.6 Implement `modulation` — OscillatorNode modulating a GainNode (stub: simple LFO tremolo; future: chorus/flanger).
  - [ ] 7.1.7 Implement `utility` — GainNode for volume + channel inverter via WaveShaper with negating curve.
  - [ ] 7.1.8 Implement `noiseGate` — GainNode envelope gated by RMS threshold (simple: gain = 0 when RMS < threshold, gain = 1 when RMS >= threshold, with attack/release smoothing).
  - [ ] 7.1.9 Implement `autoPitch` — Detect pitch via autocorrelation, call `snapToScale`, apply `pitchShift` correction scaled by `amount`, wet/dry mix.
  - [ ] 7.1.10 Implement `bassMono` — ChannelSplitter → sum L+R below crossover freq → ChannelMerger.
  - [ ] 7.1.11 Implement `stereoWidener` — MS matrix with width gain (like `stereoImager` but uses `params.width`).
  - [ ] 7.1.12 Implement `clipper` — WaveShaper with hard-clip at `ceiling` dB.
- [ ] **7.2** `src/lib/mastering.ts` — Refactor `applyMasteringChain` to delegate to `applyPluginChain` (remove duplicated DSP logic).
- [ ] **7.3** `src/lib/midiSynth.ts` — In `renderTracksToUrl` / `renderMixdown` integration, call `applyPluginChain` on each track's `track.plugins` before mixing down.

## Phase 8: Autotune / snapToScale
- [ ] **8.1** `src/lib/pluginChain.ts` — Implement `snapToScale(frequency, key, scale)`:
  - [ ] 8.1.1 Convert frequency to MIDI note: `midiNote = 12 * Math.log2(f / 440) + 69`.
  - [ ] 8.1.2 Determine pitch class: `pitchClass = ((Math.round(midiNote) % 12) + 12) % 12`.
  - [ ] 8.1.3 Define scale intervals map: major `[0,2,4,5,7,9,11]`, minor `[0,2,3,5,7,8,10]`, chromatic `[0..11]`, pentatonicMajor `[0,2,4,7,9]`, pentatonicMinor `[0,3,5,7,10]`.
  - [ ] 8.1.4 Build set of valid MIDI note classes for `key + scale`.
  - [ ] 8.1.5 Find nearest valid pitch class (circular distance).
  - [ ] 8.1.6 Return `{ midiNote, frequency, correction }` where `midiNote = baseOctave + nearestPitchClass` and `correction = targetMidiNote - originalMidiNote`.
- [ ] **8.2** `src/lib/pluginChain.ts` — Wire `snapToScale` into `autoPitch` case in `applyPluginChain`.

## Phase 9: Recording capture → region → playback
- [ ] **9.1** `app/studio/[id].tsx` — After recording completes via `RecordOptions`, store the captured audio URL as a `Region { id, url, startBeat, duration }` in the active track.
- [ ] **9.2** `src/lib/universalAudio.ts` — `renderMixdown` already handles `region.url` (existing code). Ensure recording temp files use `createTrackedBlob` so they participate in blob lifecycle.
- [ ] **9.3** `src/lib/projectStore.ts` — Persist `track.regions` (including recording regions) via `saveProject`.

## Phase 10: Loop marker system
- [ ] **10.1** `src/lib/types.ts` — Add `LoopMarker` interface and `loopMarkers: LoopMarker[]` + `activeLoopMarkerId: string | null` to project data types.
- [ ] **10.2** `src/lib/universalAudio.ts` — Extend `RenderOptions` with `loopStart?: number; loopEnd?: number`. `renderMixdown` constrains render to `loopStart → loopEnd` (beats converted to samples via `bpm`).
- [ ] **10.3** `app/studio/[id].tsx` — Transport integration:
  - [ ] 10.3.1 `togglePlay` reads `activeLoopMarkerId`, computes `loopStartBeat`/`loopEndBeat`, passes to `renderMixdown`.
  - [ ] 10.3.2 During playback, when `currentBeat >= loopEndBeat`, seek to `loopStartBeat` (loop).
  - [ ] 10.3.3 When `activeLoopMarkerId` is `null`, play full project (no looping).
- [ ] **10.4** `app/studio/[id].tsx` — UI:
  - [ ] 10.4.1 Default loop marker (`startBeat=0`, `endBeat=totalBeats`) when none exist.
  - [ ] 10.4.2 `+` button in transport bar adds new marker at current position.
  - [ ] 10.4.3 Timeline horizontal bars for each marker, colored, draggable edges.
  - [ ] 10.4.4 Tap marker to set as active / tap active marker to deactivate.

## Phase 11: Tests
- [ ] **11.1** `tests/lib9.test.ts` — `applyPluginChain` per-type audible change tests:
  - [ ] 11.1.1 All 9 currently-handled types produce different output than input (RMS power change, non-identical samples).
  - [ ] 11.1.2 All 10 new types produce different output than input.
  - [ ] 11.1.3 Empty plugins array returns input unchanged.
  - [ ] 11.1.4 Disabled plugins (enabled=false) are skipped.
- [ ] **11.2** `tests/lib9.test.ts` — `snapToScale` tests:
  - [ ] 11.2.1 A4 (440Hz) in C major → correction 0.
  - [ ] 11.2.2 445Hz in C major → nearest C-major note (A4 or A#4/Bb4 depending on rounding).
  - [ ] 11.2.3 A4 in D minor → correction 0 (A is in D minor scale).
  - [ ] 11.2.4 Chromatic scale always returns correction 0.
  - [ ] 11.2.5 Pentatonic major: non-scale note snaps to nearest pentatonic note.
  - [ ] 11.2.6 Edge: very low frequency (30Hz) snaps correctly.
  - [ ] 11.2.7 Edge: very high frequency (8000Hz) snaps correctly.
- [ ] **11.3** `tests/lib9.test.ts` — Recording round-trip tests:
  - [ ] 11.3.1 Mock `AudioRecorder` data → create region → `renderMixdown` → output buffer is non-silent.
  - [ ] 11.3.2 Recording region `url` tracked via `createTrackedBlob`.
- [ ] **11.4** `tests/lib9.test.ts` — Loop marker logic tests:
  - [ ] 11.4.1 `renderMixdown` with `loopStart`/`loopEnd` produces buffer shorter than full render.
  - [ ] 11.4.2 Default marker spans full project.
  - [ ] 11.4.3 When `activeLoopMarkerId` is null, full project rendered.
  - [ ] 11.4.4 `startBeat >= endBeat` → ignored (full render).
- [ ] **11.5** `tests/components7.test.tsx` — Studio transport + loop marker UI + recording UI:
  - [ ] 11.5.1 `togglePlay` calls `renderMixdown` (mocked `audioSystem`).
  - [ ] 11.5.2 `autoplayBlocked` shown when `ensureContext` rejects.
  - [ ] 11.5.3 Mute/solo preserves playhead (no full re-render from 0).
  - [ ] 11.5.4 Feed unmount calls `clearPreviewUrlCache`.
  - [ ] 11.5.5 Loop marker `+` button renders and adds marker on press.
  - [ ] 11.5.6 Active loop marker constrains transport seek position.
  - [ ] 11.5.7 Recording UI: `RecordOptions` visible → capture → region appears in track.

## Phase 12: Verification
- [ ] **12.1** `npx vitest run` — all new + existing tests pass.
- [ ] **12.2** `npm run test:legacy` — 24 legacy tests pass.
- [ ] **12.3** `npx tsc --noEmit` — zero errors.
- [ ] **12.4** `npx vitest run tests/lib9.test.ts tests/components7.test.tsx` green.
- [ ] **12.5** Code review via `code-review` subagent.
- [ ] **12.6** Commit and push to `master`.
