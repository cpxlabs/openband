# Proposal — Real Plugin DSP

## Context
OpenBand advertises 19 track/bus/master plugin effect types implemented as Web Audio node graphs via `applyPluginChain` (`src/lib/pluginChain.ts:88`) and `applyMasteringChain` (`src/lib/mastering.ts:143`). The `audio-plugins` OpenSpec (`openspec/specs/audio-plugins/spec.md`) requires "correct DSP" for all 19 types, but a code audit shows several are approximate stubs that diverge from their `PLUGIN_SPECS` schemas (`src/lib/types.ts:222`) in two ways:
1. **Wrong DSP topology** — e.g. `deesser` is a single static `notch` filter (a real de-esser is a sidechained compressor keyed to the sibilance band); `truePeakLimiter` is a plain waveshaper clipper with no 4× oversampling or lookahead; `multibandCompressor` is a 2-band crossover while the spec defines a 3-band (`b0/b1/b2_cross`) graph.
2. **Param-id mismatch** — several branches read param ids that do not exist in `PLUGIN_SPECS` (documented in `design.md` audit table), so user edits to real schema params are silently ignored.

## Problem Description
- `pluginChain.ts` reads `p.delayTime`/`p.wet` (delay), `p.type`/`p.frequency`/`p.q` (filter), `p.volume` (utility), `p.frequency` (bassMono) — none of which are the canonical ids in `PLUGIN_SPECS` (`time`, `mix`, `mode`, `freq`, `resonance`, `gain`, `crossover`).
- `mastering.ts` reads `p.lowCut` (eq), `p.headroom` (limiter), `p.gain`/`p.ceiling` (truePeakLimiter), `p.crossLow`/`p.crossHigh` (multibandCompressor), `p.frequency`/`p.q` (deesser) — again non-canonical.
- Whole categories (reverb damping/size/shimmer, modulation chorus/flanger/phaser selection, autoPitch formant/vibrato/speed, tapeSaturator warmth/noise/wow/mix) have params declared but no DSP wired to them.
- The existing `tests/lib9.test.ts` only asserts "output differs from input" (RMS / byte-equality) and uses a mock `OfflineAudioContext`, so the current stubs pass despite being wrong.

## Objectives
- Produce a per-type audit marking each of the 19 DSP graphs `OK` / `APPROX` / `STUB`.
- Define correct Web Audio node graphs for every `APPROX`/`STUB` type, reusing existing real-DSP patterns from `src/lib/pedalboardDsp.ts` (tanh overdrive, delay/chorus/tremolo worklet factories) and `src/lib/timeStretch.ts` (`pitchShift`), `src/lib/subtractiveSynth.ts`, `src/lib/timeStretchVocoded.ts` (phase vocoder / WSOLA).
- Specify a param-id normalization so `applyPluginChain`/`applyMasteringChain` read canonical `PLUGIN_SPECS` ids, mapping legacy aliases for back-compat.
- Specify new/extended tests under `tests/plugins/*.test.ts` that assert **audible, param-correct** behavior (not just "different output"), while keeping `tests/lib9.test.ts` green.

## Out of Scope
- No new plugins / no new `PluginType` keys.
- No UI changes to `PluginEditor.tsx` (schema already correct).
- No changes to `pedalboardDsp.ts` guitar-pedal path or the `wasmPluginHost`/`wasmInstrumentEngine` Wasm path.
- No backend changes.
