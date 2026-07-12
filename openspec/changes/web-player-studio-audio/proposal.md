### Title
Fix web multi-track playback: silence, pitch, leaks, drift

### Problem
On web, the Studio's multi-track playback is effectively broken:
1. **Silent audio-region tracks** — `renderMixdown()` only renders MIDI notes; `url`-based audio regions produce no sound.
2. **Pitch-shift UI has no effect** — `timeStretch.ts` output is not wired into the rendered graph.
3. **Blob URL leak** — `URL.createObjectURL` is called per play with no `revokeObjectURL` on stop/unmount.
4. **Beat drift** — the transport reads one `AudioContext.currentTime` while a separate `<audio>` element tracks its own timeline; two unsynchronized clocks.

### Why
A DAW that plays silence is not a DAW. This is the highest-leverage defect in the repo: it blocks activation, undermines every downstream feature, and makes all other Studio work unverifiable by ear. It is P0 by definition.

### Scope
- Unify Studio multi-track playback **and** feed/library preview through a single `UniversalAudioSystem` instance.
- Fix the four bugs above.
- **In scope:** web playback pipeline, blob lifecycle, transport clock.
- **Out of scope:** Electron-native audio rewrite, mobile-native `expo-audio` path, DSP correctness (see `real-plugin-dsp`).

### Success metric
A new visitor on web loads a demo project containing both MIDI and audio-region tracks, presses play, **hears both**, moves the pitch slider and hears a detectable shift, plays 10 times without memory growth, and the playhead stays aligned with audio for the full timeline.
