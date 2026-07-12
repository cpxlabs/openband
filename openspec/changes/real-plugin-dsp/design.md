# Design — Real Plugin DSP

## Audit Table (19 types)

Legend: `OK` = graph matches spec & reads canonical param ids; `APPROX` = roughly right topology but drops declared params / reads wrong ids; `STUB` = topology does not match the effect at all.

| # | Type | File | Branch | Status | Issue |
|---|------|------|--------|--------|-------|
| 1 | `eq` | `mastering.ts:157` | `eq` | **STUB** | Implemented as a single `lowpass` at `p.lowCut`; spec is 8-band (`b0..b7_freq/gain/q/type/enabled` + `master`). Whole EQ is missing. |
| 2 | `compressor` | `mastering.ts:166` | `compressor` | **APPROX** | `DynamicsCompressor` wired, reads `threshold/knee/ratio/attack/release` ✔, but ignores `makeupGain` (no auto make-up → level drop). |
| 3 | `limiter` | `mastering.ts:178` | `limiter` | **APPROX** | Gain + hard-clip waveshaper at `p.ceiling` ✔, but reads `p.headroom` (not in spec), ignores `threshold/attack/release`. |
| 4 | `distortion` | `pluginChain.ts:137` | `distortion` | **APPROX** | tanh-ish waveshaper + I/O gain ✔, but ignores `tone` (no tone filter) and `mix` (no dry/wet). |
| 5 | `reverb` | `pluginChain.ts:151` | `reverb` | **APPROX** | Noise-IR convolver with `decay`+`mix` ✔; ignores `preDelay`, `damping`, `size`, `shimmerPitch`, `modulation`. |
| 6 | `delay` | `pluginChain.ts:175` | `delay` | **APPROX** | Feedback delay ✔ but reads `p.delayTime` (spec id `time` [ms]) and `p.wet` (spec id `mix`); no `sync`, no pre/post handling. |
| 7 | `filter` | `pluginChain.ts:196` | `filter` | **APPROX** | Biquad ✔ but reads `p.type` (spec `mode`), `p.frequency` (spec `freq`), `p.q` (spec `resonance`); resonance never mapped to `Q`. |
| 8 | `modulation` | `pluginChain.ts:209` | `modulation` | **APPROX** | Builds a **tremolo** (osc→gain), ignores `type` (chorus/flanger/phaser) and `mix`. |
| 9 | `utility` | `pluginChain.ts:225` | `utility` | **APPROX** | Gain + phase-invert ✔ but reads `p.volume` (spec `gain`), `p.invert` (spec `phase` semantics differ); ignores `pan`. |
| 10 | `multibandCompressor` | `mastering.ts:205` | `multibandCompressor` | **STUB** | Hard-codes **2 bands** (`crossLow`/`crossHigh`); spec is **3 bands** (`b0/b1/b2_cross`, `..._threshold/ratio/attack/release/makeup/mute`). Merges to a single `ChannelMerger(numChannels)` → collapses stereo to mono. |
| 11 | `stereoImager` | `mastering.ts:244` | `stereoImager` | **APPROX** | Mid/side width ✔ (sum/diff), but ignores `midGain`, `sideGain`, `monoCross`, `balance`. |
| 12 | `deesser` | `mastering.ts:288` | `deesser` | **STUB** | Single static `notch` at `frequency` — not a de-esser. Needs high-shelf **sidechain compressor** keyed to sibilance band. |
| 13 | `tapeSaturator` | `mastering.ts:276` | `tapeSaturator` | **APPROX** | tanh waveshaper at `drive` ✔; ignores `warmth`, `noise`, `wow`, `mix`. |
| 14 | `truePeakLimiter` | `mastering.ts:192` | `truePeakLimiter` | **STUB** | Plain waveshaper clip at `ceiling`; no 4× oversampling (spec `oversample`), no `lookahead`, no `release`, reads `p.gain` (not in spec). |
| 15 | `noiseGate` | `pluginChain.ts:245` | `noiseGate` | **APPROX** | Whole-buffer static RMS gate using `threshold` ✔; ignores `ratio/attack/release/range/hold`; only analyzes `ch[0]`; no envelope following. |
| 16 | `autoPitch` | `pluginChain.ts:341` | `autoPitch` | **APPROX** | Zero-cross pitch detect + global `pitchShift` + `mix` ✔; ignores `speed/formant/vibrato`; treats buffer as single global pitch (no frame analysis). |
| 17 | `bassMono` | `pluginChain.ts:258` | `bassMono` | **APPROX** | Low/high split + mono-sum below crossover ✔; reads `p.frequency` (spec `crossover`); ignores `amount/phase/dryWet`. |
| 18 | `stereoWidener` | `pluginChain.ts:290` | `stereoWidener` | **APPROX** | Sum/diff width at `width` ✔; ignores `midGain/sideGain/crossover/stereoize/mix`. |
| 19 | `clipper` | `pluginChain.ts:321` | `clipper` | **APPROX** | Hard-clip waveshaper at `ceiling` ✔; ignores `threshold/mode/mix`. |

## Param-Id Mismatch (to normalize)

`applyPluginChain` / `applyMasteringChain` must read canonical ids from `PLUGIN_SPECS`. Map the following legacy reads to the canonical ids (keep both read + alias for back-compat during transition):

| Type | Current read (wrong) | Canonical `PLUGIN_SPECS` id |
|------|----------------------|------------------------------|
| `eq` | `p.lowCut` | `b0_freq`…`b7_freq` + `master` (8-band) |
| `delay` | `p.delayTime`, `p.wet` | `time`, `mix` |
| `filter` | `p.type`, `p.frequency`, `p.q` | `mode`, `freq`, `resonance` |
| `utility` | `p.volume`, `p.invert` | `gain`, `phase` |
| `bassMono` | `p.frequency` | `crossover` |
| `limiter` | `p.headroom` | (remove; use `threshold/attack/release`) |
| `truePeakLimiter` | `p.gain` | (remove; use `threshold/oversample/lookahead/release`) |
| `multibandCompressor` | `p.crossLow`, `p.crossHigh`, `p.thresholdLow/Mid/High`, `p.ratioLow/Mid/High`, `p.makeupLow/Mid/High` | `b0_cross`, `b1_cross`, `b2_cross`, `b{0,1,2}_threshold`, `b{0,1,2}_ratio`, `b{0,1,2}_attack`, `b{0,1,2}_release`, `b{0,1,2}_makeup`, `b{0,1,2}_mute` |
| `deesser` | `p.frequency`, `p.q` | `frequency`, `threshold`, `range`, `mode` |
| `stereoImager` | `p.width` only | `width`, `midGain`, `sideGain`, `monoCross`, `balance` |

## Correct Graph Plans (APPROX / STUB only)

Reuse patterns:
- tanh saturator / overdrive — `pedalboardDsp.ts:5` worklet + `mastering.ts:323 makeTapeCurve` (`tanh(x*drive)/tanh(drive)`).
- Delay/chorus/tremolo factories — `pedalboardDsp.ts:76-124` (`createDelayNode`, `createChorusNode`, `createTremoloNode`).
- `pitchShift(semitones)` — `src/lib/timeStretch.ts:1`.
- Phase vocoder / WSOLA — `src/lib/timeStretchVocoded.ts:187,278`.
- Subtractive synth envelopes/filters — `src/lib/subtractiveSynth.ts:267`.

1. **`eq` (STUB→OK):** 8 serial `BiquadFilterNode`s; each band `bN_type` (0 LC,1 LS,2 PK,3 NT,4 HS,5 HC) → filter `type`, `bN_freq`→`frequency`, `bN_gain`→`gain` (dB), `bN_q`→`Q`; skip band when `bN_enabled===0`. Final `master` gain in dB.
2. **`deesser` (STUB→OK):** Split into full-band + sibilance band (`highpass` ~ `frequency`/2 → `bandpass` at `frequency` Q≈1). Sibilance band drives a `DynamicsCompressor` sidechain: `threshold`=`threshold`, `ratio` derived from `range`, `attack`≈0.005, `release`≈0.05. Reduce band by `range` dB; blend with dry. `mode` toggles wideband vs split.
3. **`truePeakLimiter` (STUB→OK):** Upsample by `oversample` (2/4/8 → `2^oversample`); input gain = `threshold`→linear makeup; `DynamicsCompressor` fast attack (`lookahead`/1000) + waveshaper ceiling = `ceiling` (dBTP); downsample back. Honors `release`.
4. **`multibandCompressor` (STUB→OK):** 3-way Linkwitz-Riley-ish crossover using `b0_cross`/`b1_cross`/`b2_cross` (4 output bands: <b0, b0–b1, b1–b2, >b2). Per band `DynamicsCompressor` (`bN_threshold/ratio/attack/release`), `bN_makeup` gain, `bN_mute` bypass; sum bands preserving stereo (merger per channel pair, not collapse).
5. **`distortion` (APPROX):** add `tone` (`lowpass`/`highshelf` after shaper) and `mix` dry/wet via parallel gains.
6. **`reverb` (APPROX):** generate IR with `decay`, `preDelay` (silent leading samples), `damping` (lowpass-shape the noise IR tail), `size` (length scaling); `shimmerPitch` (pitch-shifted IR copy) and `modulation` (LFO on delay between IR taps) optional; `mix` dry/wet.
7. **`filter` (APPROX):** map `mode`→filter type (`lowpass`/`highpass`), `freq`→`frequency`, `resonance`→`Q`.
8. **`modulation` (APPROX):** when `type==="chorus"`→`createChorusNode`; `flanger`→chorus with longer delay + feedback; `phaser`→allpass sweep; always apply `mix` dry/wet.
9. **`utility` (APPROX):** `gain`→gain in dB; `phase` (0/1) inverts via `WaveShaper` sign curve; `pan` via StereoPannerNode.
10. **`tapeSaturator` (APPROX):** tanh shaper at `drive`; `warmth`→subtle lowpass; `noise`→added pink-noise bed; `wow`→slow LFO pitch; `mix` dry/wet.
11. **`stereoImager` / `stereoWidener` / `bassMono` / `clipper` / `limiter` / `noiseGate` / `autoPitch`:** wire the remaining ignored params (`midGain`, `sideGain`, `monoCross`, `balance`, `mix`, `amount`, `phase`, `dryWet`, `range`, `hold`, per-frame formant/vibrato/speed) using the same mid/side + `pitchShift` + envelope-following primitives.

## Non-breaking note
- Keep a thin alias resolver so legacy param objects (e.g. `lowCut`, `delayTime`) still apply during transition; the canonical id wins if both present.
- `tests/lib9.test.ts` passes because its mock `OfflineAudioContext` returns no-op nodes and only checks "output differs" — these tests MUST stay green; new `tests/plugins/*.test.ts` add param-correctness assertions on top, using a richer offline-context mock or real `OfflineAudioContext` where available.

## File / Symbol Map
| Concern | File | Symbols |
|---------|------|---------|
| 19-type dispatch + per-type graphs | `src/lib/pluginChain.ts` | `applyPluginChain`, `applySinglePlugin`, `applyAutoPitch`, helper curve fns |
| Mastering-family graphs | `src/lib/mastering.ts` | `applyMasteringChain`, `makeLimiterCurve`, `makeTapeCurve` |
| Schema (canonical ids) | `src/lib/types.ts` | `PLUGIN_SPECS`, `clampParam`, `getDefaultParams` |
| DSP primitives (reuse) | `src/lib/pedalboardDsp.ts`, `timeStretch.ts`, `timeStretchVocoded.ts`, `subtractiveSynth.ts` | `createChorusNode`, `createTremoloNode`, `pitchShift`, `phaseVocoderStretch`, `wsolaTimeStretch` |
