# Proposal — Real LUFS Meter (K-Weighting + True-Peak)

## Context
`src/components/LufsMeter.tsx` is the live loudness feedback surface of the Mastering Suite (`src/components/MasteringSuite.tsx:400`, rendered with `isPlaying={playerStatus.playing && !session.bypassed}`). Its numbers are currently a pure simulation: `simulateLoudness` (`LufsMeter.tsx:24`) and a `setInterval` tick (`LufsMeter.tsx:76`) drive drift via `Math.random()` and `Math.sin(time * …)`, converging toward arbitrary `baseIntegrated = -(4 + Math.random()*6)` targets. There is no `AudioContext`, no `AnalyserNode`, no K-weighting, and no relationship to the actual master audio being played.

The mastering spec already mandates real measurement (`openspec/specs/mastering-plugins/spec.md:49-61`): silence must read `−70.0` floor and a `−14 dBFS` 1 kHz tone must read `−14.0 ± 0.5` LUFS. The current component cannot satisfy those scenarios.

## Problem Description
- Loudness readouts are fabricated, so users get misleading mastering feedback (the meter reacts to `isPlaying` but not to the signal).
- No true-peak measurement (spec requires dBTP via oversampling).
- No K-weighting (pre-filter + RLB) per ITU-R BS.1770, so values are not real LUFS.
- The pure-helper `measureLUFS` math is entangled with React state/interval code, making it impossible to unit-test without a DOM.

## Objectives
- Extract a pure, DOM-free `measureLUFS(samples, sampleRate)` helper into `src/lib/lufs.ts` (stereo-aware; accepts channel-interleaved or per-channel sample arrays) implementing ITU-R BS.1770-4:
  - Stage 1: K-weighting = high-shelf pre-filter (≈ +4 dB @ 1.5 kHz, 0 dB @ 0 Hz) → RLB high-pass (`f0 ≈ 38 Hz`, `Q ≈ 0.5`).
  - Stage 2: mean-square per 400 ms (integrated) and 3 s sliding window (short-term) blocks.
  - Stage 3: gated loudness — absolute gate (`−70 LUFS` floor) then relative gate (`−10 LU` from 2× mean).
  - Stage 4: True-Peak via 4× oversampled peak detection (inter-sample peaks).
- Wire `LufsMeter.tsx` to a real `AnalyserNode` fed from the master audio path (via `universalAudio` `audioSystem` analyser / `OpenBandNative` where available), falling back to the simulation only when no analyser is available (e.g. mocked tests).
- Keep the component's visual contract (`isPlaying`, `testID`, all displayed metrics) unchanged so `MasteringSuite` needs no behavioral edits.

## Scope
Medium. New `src/lib/lufs.ts` (pure DSP), refactor of `LufsMeter.tsx` to consume real analyser data, new `tests/lufs.test.ts`. No new npm dependencies (uses Web Audio `AnalyserNode` at call site and plain `Float32Array` math in the helper).

## Out of Scope
- Replacing the `expo-audio` playback path; the analyser is attached to the existing master `AudioContext` from `audioSystem`.
- Changing `MasteringSuite.tsx` layout beyond passing the analyser/refs through.
- Backend loudness analysis (separate concern).
