### Architecture: one live graph, cached stems

The root cause of the latency/responsiveness gaps is the per-action full re-render + `<audio>` element. We keep the single shared `AudioContext` (already owned by `UniversalAudioSystem`) and add a **live mixing graph** + **stem cache**.

```
UniversalAudioSystem (single AudioContext, already exists)
  └─ PlaybackEngine (NEW, per studio session)
       stems: Map<trackId, { buffer: AudioBuffer; hash: string }>   // LRU-capped
       nodes: Map<trackId, { source: AudioBufferSourceNode; gain: GainNode; panner: StereoPannerNode }>
       master: GainNode -> destination
```

### 1. Stem render (offline, once per content change)
Refactor `src/lib/midiSynth.ts` `renderTracksToUrl` so the per-track work it already does (MIDI notes + audio-region decode + plugin chain + baked modulation) is exposed as `renderTrackStem(track, bpm, duration): Promise<AudioBuffer>`. The stem includes, at render time:
- **Automation baked in:** for each entry in `track.automation` (`Record<string, AutomationPoint[]>`), map the key to the right `AudioParam` and call `applyAutomationToParam(param, buildAutomationSchedule(points, bpm), 0)` during the offline render. Keys: `volume`→track gain, `pan`→panner, plus plugin-param ids (reuse `paramToTarget` → resolve the param's `AudioParam` in the plugin graph). `AutomationPoint.time` is in **beats**; `buildAutomationSchedule` converts to seconds via `60/bpm`.
- Plugin chain + modulation already baked (from `wire-modulation-matrix`).

### 2. Stem cache (LRU)
`stems: Map<trackId, {buffer, hash}>`. `hash = JSON.stringify({midiNotes, regions, plugins, automation, volume, pan})` (cheap; enough to detect content change). On play, if a track's hash matches, reuse the cached `AudioBuffer` (no re-render). Cap at e.g. 32 stems; evict oldest (and `revokeTrackedBlob`/disconnect its nodes). This removes the "latency grows with project size" problem — only *changed* tracks re-render.

### 3. Live mix graph (instant mute/solo)
On play, for each audible track create `AudioBufferSourceNode(buffer=stem)` → `GainNode(volume)` → `StereoPanner(pan)` → `master`. Mute/solo = set `gain.gain.value` / `0` immediately (no re-render). Volume/pan sliders = `setTargetAtTime` for click-free updates.

### 4. Transport: play / pause / seek / loop
- **play**: `source.start(0, seekOffset)` for each track; record `startCtxTime = ctx.currentTime - seekOffset`. `currentTime = ctx.currentTime - startCtxTime`.
- **pause**: `source.stop()`, keep `seekOffset`.
- **seek(t)**: stop all, restart sources at `t`.
- **loop region [a,b]**: set `source.loop=true; source.loopStart=a; source.loopEnd=b`.
- **playhead**: derived from the single context clock (`UniversalAudioSystem.ctx.currentTime`) → no drift (extends the `web-player-studio-audio` clock fix).

### 5. Blob lifecycle discipline
Stems are `AudioBuffer`s in the live graph, not blob URLs, so the registry leak class is avoided. Any blob URLs produced (e.g. for export) still go through `createTrackedBlob`/`revokeTrackedBlob`/`markBlobActive`. The old `<audio>`-element path in `useWebAudioPlayer` for studio is replaced; feed/library/MiniPlayer may keep `<audio>` for simple previews OR be migrated to the same engine (Phase 3 of tasks).

### 6. Reuse
- `applyAutomationToParam`, `buildAutomationSchedule`, `interpolateAutomationValue` from `src/lib/automationEngine.ts` (currently unwired — this change wires them).
- `paramToTarget` from `src/lib/modulationMatrix.ts` to resolve automation keys → plugin `AudioParam`s.
- `UniversalAudioSystem` single context + blob helpers from `src/lib/universalAudio.ts`.
