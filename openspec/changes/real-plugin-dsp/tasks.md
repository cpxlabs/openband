# Tasks — Real Plugin DSP

## 1. Audit (docs, this change)
- [x] Read `src/lib/pluginChain.ts`, `src/lib/mastering.ts`, `src/lib/types.ts`, `src/lib/pedalboardDsp.ts`, `timeStretch.ts`, `timeStretchVocoded.ts`, `subtractiveSynth.ts`, `openspec/specs/audio-plugins/spec.md`, `tests/lib9.test.ts`
- [x] Produce per-type audit table (19 rows) marking each `OK`/`APPROX`/`STUB`
- [x] Document param-id mismatch (`delayTime`→`time`, `wet`→`mix`, `lowCut`, `crossLow`, `headroom`, `gain`, etc.) vs `PLUGIN_SPECS`

## 2. Param-id normalization (no behavior break)
- [x] Add a small `resolveParam(plugin, canonicalId, legacyAlias?)` helper in `src/lib/pluginChain.ts` (or shared util) that prefers canonical `PLUGIN_SPECS` ids and falls back to legacy aliases.
- [x] Update `applyPluginChain` branches to read canonical ids: `delay` (`time`,`mix`), `filter` (`mode`,`freq`,`resonance`), `utility` (`gain`,`phase`), `bassMono` (`crossover`).
- [x] Update `applyMasteringChain` branches: `eq` (8-band ids + `master`), `limiter` (`threshold/attack/release`, drop `headroom`), `truePeakLimiter` (`threshold/oversample/lookahead/release`, drop `gain`), `multibandCompressor` (`b0/b1/b2_cross` + per-band `threshold/ratio/attack/release/makeup/mute`), `deesser` (`frequency/threshold/range/mode`).

## 3. Fix STUB types (correct DSP)
- [x] `eq`: build 8 serial `BiquadFilterNode`s from band params + `master` gain.
- [x] `deesser`: sibilance-band sidechained `DynamicsCompressor` (high-shelf key), `range` reduction, `mode` toggle.
- [x] `truePeakLimiter`: `oversample`× upsample → fast `DynamicsCompressor` (`lookahead`) + `ceiling` waveshaper → downsample; honor `release`.
- [x] `multibandCompressor`: 3-band crossover → 3 `DynamicsCompressor`s with per-band `attack/release/makeup/mute`; stereo-preserving sum.

## 4. Upgrade APPROX types (wire declared params)
- [x] `distortion`: add `tone` filter + `mix` dry/wet.
- [x] `reverb`: `preDelay`, `damping`, `size`, optional `shimmerPitch`, `modulation`; keep `mix`.
- [x] `modulation`: honor `type` (chorus/flanger/phaser) via `createChorusNode`/phaser; apply `mix`.
- [x] `utility`: `pan` via `StereoPannerNode`; `phase` invert semantics.
- [x] `tapeSaturator`: `warmth` lowpass, `noise` bed, `wow` LFO, `mix`.
- [x] `stereoImager` / `stereoWidener`: `midGain`, `sideGain`, `monoCross`, `balance`, `mix`.
- [x] `noiseGate`: frame/peak envelope following `attack/release/range/hold`; per-channel.
- [x] `autoPitch`: per-frame analysis + `speed`/`formant`/`vibrato`; keep `key`/`scale`/`amount`/`mix`.
- [x] `bassMono`: honor `amount`/`phase`/`dryWet`; `crossover` canonical.
- [x] `clipper` / `limiter`: honor `threshold`/`mode`/`mix`/`attack`/`release`.

## 5. Tests
- [x] Create `tests/plugins/eq.test.ts` — 8-band graph actually attenuates/boosts target band; `master` gain applied.
- [x] Create `tests/plugins/deesser.test.ts` — sibilant band reduced when `threshold`/`range` set; silent band unchanged.
- [x] Create `tests/plugins/truePeakLimiter.test.ts` — no sample exceeds `ceiling` (true-peak) with `oversample>=2`.
- [x] Create `tests/plugins/multibandCompressor.test.ts` — 3 bands independently compress; stereo preserved (L/R not collapsed).
- [x] Create `tests/plugins/paramMapping.test.ts` — legacy alias (`delayTime`,`wet`,`lowCut`,`crossLow`) still applies; canonical id wins when both present; all 19 types produce audible + **param-correct** change.
- [x] Extend `tests/plugins/*.test.ts` asserting audible change AND param correctness (not only "output differs").
- [x] Confirm `tests/lib9.test.ts` still passes unchanged (mock context, "output differs" assertions).

## 6. Verification
- [x] `npx tsc --noEmit` clean
- [x] `cd backend && npx tsc --noEmit` clean
- [x] `npx vitest run` passes (incl. new `tests/plugins/*` + existing `tests/lib9.test.ts`)
- [x] `npm run build` succeeds
