### Title
Improve audio playback: unified live stem graph, real-time automation, instant mute/solo, scrubbing

### Problem
The `web-player-studio-audio` change fixed the critical playback bugs (silence, pitch, leaks, drift) but kept the original **static `<audio>`-blob model**: every play / mute / solo / param tweak re-renders the *entire* project through `renderTracksToUrl` (an `OfflineAudioContext`) and plays the resulting WAV via an HTML5 `<audio>` element. This leaves four quality gaps that block OpenBand from feeling like a real DAW:

1. **Latency grows with project size** — `togglePlay`/`rerenderAfterMuteSolo` always call `renderTracksToUrl` from position 0 and `replace` the `<audio>` src. Audio start delay scales with track count / length, so big projects have a noticeable "dead air" before sound.
2. **No instant mute/solo** — muting one track requires a full re-render + replace of the master blob.
3. **Automation lanes are silent** — `TrackDef.automation` (`Record<string, AutomationPoint[]>`) exists and `AutomationLane` visualizes it, but `automationEngine` (`applyAutomationToParam`) is never called from any production screen, so drawn automation does nothing audible.
4. **No real scrub/seek/loop** — seeking restarts the `<audio>` element; loop regions are not supported; playhead is only loosely tied to the blob.

### Why
A DAW's defining feel is *responsive* playback: mute a track and hear it instantly, draw an automation curve and hear it move, scrub to any point and keep playing. The static-blob model cannot deliver this without re-rendering. This change is the natural Phase-2 follow-up to `web-player-studio-audio` and unlocks the modulation work done in `wire-modulation-matrix` to feel live.

### Scope
- Replace the static `<audio>`-blob playback with a **unified live Web Audio graph** owned by `UniversalAudioSystem` (single shared `AudioContext`).
- Render each track **once** to a cached **stem** (`AudioBuffer`), then mix stems through live per-track `GainNode`/`StereoPanner` → master → destination.
- Wire `automationEngine.applyAutomationToParam` so `TrackDef.automation` lanes are baked into stems (offline) at render time.
- Mute/solo/volume/pan become instant by setting live node values (no re-render).
- Add seek/loop on the live graph; playhead derived from the single context clock.
- Keep blob lifecycle / `markBlobActive` / `revokeTrackedBlob` discipline; add an LRU stem cache.

**In scope:** studio playback pipeline, stem cache, automation wiring, transport (play/pause/seek/loop), feed/library/MiniPlayer reuse of the same pipeline.
**Out of scope:** new DSP algorithms (see `real-plugin-dsp`), new modulation sources (see `wire-modulation-matrix`), native `expo-audio` path parity (web-first), collaborative sync.

### Success metric
On web, loading a 12-track project and pressing play starts audio in <150 ms (vs. re-render delay today); toggling mute/solo on any track is inaudible-latency (<30 ms); a drawn volume automation lane is clearly audible; scrubbing to t=45s resumes from that point; playing 20 times does not grow memory (LRU cache bounded).
