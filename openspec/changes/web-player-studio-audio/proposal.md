# Proposal: Web Player Studio Audio Playback Overhaul

## Context

The studio screen (`app/studio/[id].tsx`) is a DAW-style multi-track mixer. On web it renders the project to a WAV blob via `renderTracksToUrl()` (in `src/lib/midiSynth.ts`) and plays it through `useWebAudioPlayer` (an HTML5 `<audio>` wrapper). Five subsystems touch this path: the studio transport (`togglePlay`/`seekRelative`/`stopPlayback`), the real-time `audioSystem` (`src/lib/universalAudio.ts`), the `useWebAudioPlayer` hook, the `clockManager` beat ticker, and the feed's `generatePreviewUrl`/`handlePlay`.

The pipeline works for simple MIDI-only projects but has correctness and robustness gaps that produce silent playback, leaked blob URLs, beat drift, and full re-renders on every interaction.

## Problems

### 1. Audio-region tracks are silent on web
- `renderTracksToUrl()` (`src/lib/midiSynth.ts`) only renders `track.midiNotes`. Imported-audio and recorded regions carry a `url` but are ignored. If a project has only audio regions, `totalBeats === 0` and the function returns `null` → silence.
- `audioSystem.renderMixdown()` *does* handle `region.url`, but the studio transport never calls it.

### 2. Real pitch shifting is not implemented
- `pitchShiftSemitones` state (`app/studio/[id].tsx:316`) only drives visual button highlighting (`:1651`, `:1654`). It is never applied to audio.
- The only pitch path is the `playbackRate`-based compensation in `togglePlay` (`:479-506`), which changes tempo *and* pitch via `webAudio.setPlaybackRate`. Selecting a semitone does nothing audible.

### 3. Blob URL lifecycle is leaky
- `togglePlay` revokes the previous URL with a direct `URL.revokeObjectURL` (`:477`, `:501`), bypassing `revokeTrackedBlob` — the `blobUrlRegistry` entry is orphaned.
- The pitch-shifted URL is created with `URL.createObjectURL` directly (`:498`), never registered, and never auto-evicted.
- `generatePreviewUrl` (`src/lib/constants.ts`) keeps its own 50-entry cache unrelated to `blobUrlRegistry`, never torn down on Feed unmount.

### 4. Full re-render on every interaction
- `togglePlay` and `rerenderAfterMuteSolo` (`:659-715`) always call `renderTracksToUrl` and `replace` from position 0. No caching of the rendered mix; mute/solo restart playback at 0. Latency before audio starts grows with project size.

### 5. Beat tracking drifts
- `clockManager` reads `audioTime = ctx.currentTime` from `audioSystem._audioCtx` (`:34-37`), a *different* context than the HTML5 `<audio>` element actually producing sound. Beat position only approximately matches audible playback.

### 6. Multiple independent AudioContexts
- Real-time `audioSystem._audioCtx`, a fresh `OfflineAudioContext` per `renderTracksToUrl`/`generatePreviewUrl`, plus the HTML5 `<audio>` in `useWebAudioPlayer`, plus a *third* `OfflineAudioContext` during pitch correction. No single shared render/output context.

### 7. Duplicated autoplay handling
- `togglePlay` has two autoplay-failure paths (rejected `ensureContext` and rejected `webAudio.play()`) both surfacing `LoadingModal`. The actual unlock happens in `useWebAudioPlayer`'s `unlock()` heuristic (`:147-160`), called once at the top of `togglePlay` but not guaranteed before async render work.

## Objectives

1. **Play all track types on web** — Route studio playback through a unified render that handles both MIDI notes and audio-region `url`s (reuse `audioSystem.renderMixdown`), so imported/recorded audio plays.
2. **Implement real pitch shift** — Apply `pitchShiftSemitones` (combined with `playbackRate`) during render via `pitchShift`/`timeStretch`; make the semitone UI actually change pitch.
3. **Unify audio contexts** — Funnel studio + feed playback through a single `audioSystem` pipeline; ensure the clock reads the real output context so beats stay synced.
4. **Fix blob lifecycle** — Route every `revokeObjectURL` through `revokeTrackedBlob`; register pitch-corrected URLs via `createTrackedBlob`; tear down preview/feed caches on unmount.
5. **Cache rendered mixes** — Key the rendered blob by a content hash of tracks/buses/mood; only re-render on real changes; preserve playhead across mute/solo (`rerenderAfterMuteSolo` reuses the cached blob).
6. **Consolidate autoplay UX** — Guarantee `ensureContext`/`unlock` runs synchronously inside the gesture before any async render; single `autoplayBlocked` path.
7. **Cover with tests** — Unit tests for `renderMixdown` (audio + MIDI regions), pitch-shift application, blob registry hygiene, and render-cache hits; component tests for studio transport (mocked `audioSystem`).

---

### 8. Plugin effects are not verified to change sound
- `applyMasteringChain` (`src/lib/mastering.ts:130-293`) handles 9 of 19 `PluginType` values (eq, compressor, limiter, truePeakLimiter, multibandCompressor, stereoImager, tapeSaturator, deesser). The remaining 10 types (distortion, reverb, delay, filter, modulation, utility, noiseGate, autoPitch, bassMono, stereoWidener, clipper) are silently ignored — they pass through without any DSP applied.
- Per-track plugins (`track.plugins`/`PluginRack`) are UI-only today: `renderTracksToUrl` in `src/lib/midiSynth.ts` never applies them during render, so plugin settings have zero audible effect on exported/played audio.
- **No sound tests exist** that prove any plugin type actually changes the output buffer. The only coverage is structural (preset exists, params parse).
- **Objective:** Write per-type sound-change tests for `applyMasteringChain` that assert audible output differences (RMS power, spectral centroid shift) for the 9 handled types. Add a new `applyPluginChain(buffer, plugins, sampleRate)` that handles all 19 types (including the 10 currently ignored) and tests for those too.

### 9. Recording capture exists but has no audio playback integration
- `RecordOptions` component (`src/components/RecordOptions.tsx`) captures audio via `useAudioRecorder` from `expo-audio` and stores it as a temp file.
- The captured file is added as a track region with a `url`, but the studio transport never plays audio-region tracks (Problem 1). Recording is therefore silent on web playback.
- **No recording end-to-end tests** exist — no test proves that captured audio → region URL → mixdown produces audible output.
- **Objective:** Integration-test the recording path: mock `useAudioRecorder`, simulate capture → region creation → project persistence → mixdown render → verify output buffer contains audio.

### 10. Autotune-like feature (autoPitch) has no scale-snap algorithm
- `autoPitch` plugin type exists (`types.ts:110`) with params: `amount, speed, key, scale, formant, vibrato, mix` (`types.ts:1343-1467`).
- `pitchShift(buffer, semitones)` utility exists in `src/lib/midiSynth.ts` but there is no scale/key-snap algorithm that maps detected pitch to the nearest note in a scale.
- The `autoPitch` plugin is in `PLUGIN_SPECS` and recognized by `PluginEditor`/`OneKnob`, but applying it to audio does nothing — `applyMasteringChain` ignores type `autoPitch`.
- **Objective:** Add a `snapToScale(frequency, key, scale)` utility, integrate it into `autoPitch` processing in `applyPluginChain`, and test that semitone-shifted output lands on scale degrees.

### 11. No loop/marker system in project transport
- The studio transport has no loop markers — `togglePlay` always plays from start to end, with no way to loop a section.
- `Looper` component is a separate live-looping feature, not project-level loop markers.
- No data structure for loop markers exists in `ProjectData` or `TrackDef`.
- **Objective:** Define `LoopMarker { id, startBeat, endBeat, color, label? }`, add it to the project state, extend the transport render to only render the active loop range, and add UI affordances (default markers, `+` to add, drag to resize). Test that loop markers constrain the rendered output length.
