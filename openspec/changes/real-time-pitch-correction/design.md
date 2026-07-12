### Architecture: surface `autoPitch` + add Tune UI + live readout

The `autoPitch` plugin already exists in `PLUGIN_SPECS` (`src/lib/types.ts`) with params `amount, speed, key, scale, formant, vibrato, mix`, and `applyPluginChain` renders it during playback/bounce. This change wires user-facing control + feedback around it.

### 1. Tune panel (per track)
- New component `src/components/TunePanel.tsx` (or a mode inside `PluginEditor` for `autoPitch`): renders controls bound to the track's `autoPitch` plugin params via existing `onParamChange(pluginId, paramId, value)`.
- Key selector: 12 keys × major/minor/scale presets (reuse `projectTemplates` scale data if present). Scale options: chromatic, major, minor, pentatonic, dorian, etc.
- `amount` (0–100 retune strength), `speed` (ms glide / "retune speed"), `formant` (preserve vocal character), `mix` (dry/wet).
- On open, ensure the track has an `autoPitch` plugin instance (create via `getDefaultParams("autoPitch")` if missing) and enable it.

### 2. Key/scale detection (best-effort)
- `src/lib/keyDetection.ts` — `detectKey(buffer: AudioBuffer): { key: number; scale: string; confidence: number }`.
  - Lightweight autocorrelation / pitch-class histogram over windowed frames; map dominant pitch class → nearest key; confidence from histogram peak. Runs off the main thread where possible (or debounced). Returns a *suggestion*, never auto-applies.
- Triggered from Tune panel "Detect key" button on a selected region; fills the key selector.

### 3. Live pitch readout
- `src/lib/pitchEstimate.ts` — `estimatePitch(frame: Float32Array, sampleRate): number | null` (autocorrelation). Reuse the existing live `AnalyserNode` in `MasteringSuite`/`PlaybackEngine` (expose an analyser from `PlaybackEngine` if needed).
- Tune panel shows detected pitch (note name) + corrected target while playing; small overlay on the track or in the panel.

### 4. Integration
- `PluginEditor` lists `autoPitch` in `EDITOR_MAP` (or routes to `TunePanel`) so it is first-class.
- Studio toolbar / track header gains a "Tune" entry that opens `TunePanel` for the selected track.
- Key detection + live readout are web-first; native falls back to the static config (no live analyser).

### Reuse
- `PLUGIN_SPECS.autoPitch`, `getDefaultParams` (types.ts)
- `applyPluginChain` (already bakes autoPitch into playback/bounce)
- `PlaybackEngine` single context + (optional) analyser
- `timeStretch.pitchShift` is unrelated (that's global pitch); autoPitch is scale-snap.
