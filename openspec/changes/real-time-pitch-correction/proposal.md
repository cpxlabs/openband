### Title
Real-time pitch correction (auto-tune) per track

### Problem
The `autoPitch` plugin type exists in the 19-type system, but there is no first-class, discoverable **pitch-correction workflow**: no key/scale selection UI, no retune-speed/formant controls surfaced to users, no live pitch display, and no key detection from audio. Producers expect BandLab/Cubasis-style "Tune" — drop a vocal, pick a key, hear it snapped in real time.

### Why
Pitch correction is a headline creator feature and a frequent differentiator vs. free DAWs. The DSP hook (`autoPitch` plugin via `applyPluginChain`) already runs in the playback/bounce path (wired by `real-plugin-dsp` + `wire-modulation-matrix`), so this change is mostly **UX + control surfacing + a live pitch readout**, not new DSP.

### Scope
- A **Tune panel** (per-track) that configures the track's `autoPitch` plugin: `key`, `scale`, `amount` (retune strength), `speed` (glide), `formant`, `mix`.
- **Key/scale detection** helper from an audio region (lightweight: analyze dominant pitch classes over time, propose a key) — optional, best-effort, non-blocking.
- **Live pitch display**: a small readout/overlay showing detected vs. corrected pitch while playing (read from the engine's analyser or a lightweight pitch estimator).
- **Visual Tune affordance** in `PluginEditor` so `autoPitch` is first-class alongside the 19 types.

**In scope:** Tune UI, key/scale config, live readout, key detection helper.
**Out of scope:** new DSP algorithms (reuse `autoPitch`); MIDI note quantize (separate); full score view.

### Success metric
A user loads a vocal region, opens Tune, picks key + scale, enables correction, and hears the performance snapped to scale in real time; the live readout shows pitch tracking; key detection proposes the correct key for a monophonic test tone within ±1 semitone.
