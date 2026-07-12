# Tasks — Real LUFS Meter (K-Weighting + True-Peak)

## 1. Pure measurement helper (src/lib/lufs.ts — NEW)
- [ ] Create `src/lib/lufs.ts` exporting `LufsResult` and `measureLUFS(channels, sampleRate)`.
- [ ] Implement `kWeight(samples, sampleRate)`: biquad high-shelf pre-filter (~+4 dB @ 1.5 kHz) → RLB high-pass (~38 Hz, Q 0.5), bilinear transform, processing `Float32Array`.
- [ ] Implement `meanSquareBlocks(samples, sampleRate, blockSec)`: 400 ms (integrated) and 3000 ms (short-term) non-overlapping block energies.
- [ ] Implement `gatedLoudness(z)`: BS.1770 absolute gate (`−70 LUFS`) + relative gate (`−10 LU` from 2× mean).
- [ ] Implement `truePeak(samples, sampleRate)`: 4× linear-oversampled peak → dBTP.
- [ ] `measureLUFS` sums per-channel energies/peaks, returns `{ integrated, shortTerm, truePeak, lra }` with `−70.0` silence floor.

## 2. Wire LufsMeter to real analyser (src/components/LufsMeter.tsx)
- [ ] Import `measureLUFS` from `../lib/lufs`.
- [ ] Add optional `analyser?: AnalyserNode` (or `getSamples` callback) prop; keep `isPlaying` and `testID`.
- [ ] In the active `setInterval` tick (`:76`), when an analyser is present, pull time-domain data, split into channels, call `measureLUFS`, and set `integrated`/`shortTerm`/`truePeak`/`lra`.
- [ ] Retain the `Math.random()`/`Math.sin()` simulation strictly as fallback when no analyser is supplied (preserves mocked/test rendering).
- [ ] Preserve all visual elements: `LUFS_TARGETS`, `MIN/MAX_LUFS` bar scaling, history sparkline, color thresholds.

## 3. Provide master analyser (src/components/MasteringSuite.tsx)
- [ ] Obtain a master `AnalyserNode` from `audioSystem` (`src/lib/universalAudio.ts`) on the playing source.
- [ ] Pass it (or a `getSamples` closure) into `<LufsMeter ... />` at `src/components/MasteringSuite.tsx:400`. No layout/playback logic change.

## 4. Tests (Vitest — NEW tests/lufs.test.ts)
- [ ] Silence (all-zero `Float32Array` channels) ⇒ `integrated` equals `−70.0` (floor) and `truePeak` is `−∞`/very low.
- [ ] `−14 dBFS` 1 kHz sine (generated in-test) across stereo channels ⇒ `integrated` within `−14.0 ± 0.5`.
- [ ] `truePeak` of a full-scale sine returns `≈ 0 dBTP`; an inter-sample overshoot case returns positive dBTP via 4× oversampling.
- [ ] `measureLUFS` is pure: identical input ⇒ identical output (no DOM, no randomness).

## 5. Spec update
- [ ] Update `openspec/specs/mastering-plugins/spec.md` Implementation Notes: note `LufsMeter` now consumes `measureLUFS` from `src/lib/lufs.ts` with real K-weighting + true-peak, satisfying the silence/`-14 dBFS` scenarios; simulation retained only as analyser-unavailable fallback.

## 6. Verification
- [ ] `npx tsc --noEmit` clean
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `npx vitest run` passes (including `tests/lufs.test.ts`)
- [ ] `npm run build` succeeds
