# Tasks — Real Plugin DSP

## 1. Audit (docs, this change)
- [x] Read `src/lib/pluginChain.ts`, `src/lib/mastering.ts`, `src/lib/types.ts`, `src/lib/pedalboardDsp.ts`, `timeStretch.ts`, `timeStretchVocoded.ts`, `subtractiveSynth.ts`, `openspec/specs/audio-plugins/spec.md`, `tests/lib9.test.ts`
- [x] Produce per-type audit table (19 rows) marking each `OK`/`APPROX`/`STUB`
- [x] Document param-id mismatch (`delayTime`→`time`, `wet`→`mix`, `lowCut`, `crossLow`, `headroom`, `gain`, etc.) vs `PLUGIN_SPECS`

## 2. Param-id normalization (no behavior break)
- [ ] Add a small `resolveParam(plugin, canonicalId, legacyAlias?)` helper in `src/lib/pluginChain.ts` (or shared util) that prefers canonical `PLUGIN_SPECS` ids and falls back to legacy aliases.
- [ ] Update `applyPluginChain` branches to read canonical ids: `delay` (`time`,`mix`), `filter` (`mode`,`freq`,`resonance`), `utility` (`gain`,`phase`), `bassMono` (`crossover`).
- [ ] Update `applyMasteringChain` branches: `eq` (8-band ids + `master`), `limiter` (`threshold/attack/release`, drop `headroom`), `truePeakLimiter` (`threshold/oversample/lookahead/release`, drop `gain`), `multibandCompressor` (`b0/b1/b2_cross` + per-band `threshold/ratio/attack/release/makeup/mute`), `deesser` (`frequency/threshold/range/mode`).

## 3. Fix STUB types (correct DSP)
- [ ] `eq`: build 8 serial `BiquadFilterNode`s from band params + `master` gain.
- [ ] `deesser`: sibilance-band sidechained `DynamicsCompressor` (high-shelf key), `range` reduction, `mode` toggle.
- [ ] `truePeakLimiter`: `oversample`× upsample → fast `DynamicsCompressor` (`lookahead`) + `ceiling` waveshaper → downsample; honor `release`.
- [ ] `multibandCompressor`: 3-band crossover → 3 `DynamicsCompressor`s with per-band `attack/release/makeup/mute`; stereo-preserving sum.

## 4. Upgrade APPROX types (wire declared params)
- [ ] `distortion`: add `tone` filter + `mix` dry/wet.
- [ ] `reverb`: `preDelay`, `damping`, `size`, optional `shimmerPitch`, `modulation`; keep `mix`.
- [ ] `modulation`: honor `type` (chorus/flanger/phaser) via `createChorusNode`/phaser; apply `mix`.
- [ ] `utility`: `pan` via `StereoPannerNode`; `phase` invert semantics.
- [ ] `tapeSaturator`: `warmth` lowpass, `noise` bed, `wow` LFO, `mix`.
- [ ] `stereoImager` / `stereoWidener`: `midGain`, `sideGain`, `monoCross`, `balance`, `mix`.
- [ ] `noiseGate`: frame/peak envelope following `attack/release/range/hold`; per-channel.
- [ ] `autoPitch`: per-frame analysis + `speed`/`formant`/`vibrato`; keep `key`/`scale`/`amount`/`mix`.
- [ ] `bassMono`: honor `amount`/`phase`/`dryWet`; `crossover` canonical.
- [ ] `clipper` / `limiter`: honor `threshold`/`mode`/`mix`/`attack`/`release`.

## 5. Tests
- [ ] Create `tests/plugins/eq.test.ts` — 8-band graph actually attenuates/boosts target band; `master` gain applied.
- [ ] Create `tests/plugins/deesser.test.ts` — sibilant band reduced when `threshold`/`range` set; silent band unchanged.
- [ ] Create `tests/plugins/truePeakLimiter.test.ts` — no sample exceeds `ceiling` (true-peak) with `oversample>=2`.
- [ ] Create `tests/plugins/multibandCompressor.test.ts` — 3 bands independently compress; stereo preserved (L/R not collapsed).
- [ ] Create `tests/plugins/paramMapping.test.ts` — legacy alias (`delayTime`,`wet`,`lowCut`,`crossLow`) still applies; canonical id wins when both present; all 19 types produce audible + **param-correct** change.
- [ ] Extend `tests/plugins/*.test.ts` asserting audible change AND param correctness (not only "output differs").
- [ ] Confirm `tests/lib9.test.ts` still passes unchanged (mock context, "output differs" assertions).

## 6. Verification
- [ ] `npx tsc --noEmit` clean
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `npx vitest run` passes (incl. new `tests/plugins/*` + existing `tests/lib9.test.ts`)
- [ ] `npm run build` succeeds
