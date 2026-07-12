# Design — Real LUFS Meter (K-Weighting + True-Peak)

## New file: `src/lib/lufs.ts` (pure, testable)

| Symbol | Signature | Purpose |
|---|---|---|
| `kWeight(samples, sampleRate)` | `(Float32Array, number) => Float32Array` | Applies pre-filter (biquad high-shelf) → RLB high-pass (biquad) in series. Returns filtered samples. |
| `meanSquareBlocks(samples, sampleRate, blockSec)` | `(Float32Array, number, number) => Float32Array` | Non-overlapping block mean-square energies (400 ms integrated, 3000 ms short-term). |
| `gatedLoudness(z: Float32Array[])` | `(number[]) => number` | BS.1770 absolute gate (`−70`) + relative gate (`−10 LU` from 2× mean); returns LUFS. |
| `truePeak(samples, sampleRate)` | `(Float32Array, number) => number` | 4× oversampled linear-interp peak → dBTP (`20*log10`). |
| `measureLUFS(channels: Float32Array[], sampleRate)` | `(Float32Array[], number) => { integrated: number; shortTerm: number; truePeak: number; lra: number }` | Orchestrates: per-channel K-weight → block energies → combined gated loudness (integrated over full buffer, short-term over last 3 s) → combined true-peak → LRA from short-term block distribution. Silence ⇒ integrated `−70.0` floor; `−14 dBFS` tone ⇒ `−14.0 ± 0.5`. |

### Algorithm specifics
- **Pre-filter (high-shelf):** `b0,b1,b2 / a0,a1,a2` coefficients for `fc ≈ 1500 Hz`, gain `+4 dB`, `Q ≈ 0.707`, bilinear-transformed at `sampleRate`.
- **RLB high-pass:** `fc ≈ 38 Hz`, `Q ≈ 0.5`, same biquad transform.
- **Loudness units:** `LUFS = −0.691 + 10*log10(meanSquare)` where `−0.691` is the BS.1770 2-channel offset constant; per-channel energies summed then averaged across channels before log.
- **Gating:** absolute gate drops blocks `< −70 LUFS`; relative gate computes `−10 LU` below `2 × mean` of remaining blocks (iterate once). If no blocks survive, return `−70.0`.
- **True-Peak:** upsample each channel 4× via linear interpolation of the sample buffer, take max `|x|`, convert to dB. Implemented without DOM/AudioWorklet — pure typed-array math.

### Type contract
```ts
export interface LufsResult {
  integrated: number; // LUFS, floor −70.0
  shortTerm: number;  // LUFS (last 3s window)
  truePeak: number;   // dBTP
  lra: number;        // LU
}
export function measureLUFS(channels: Float32Array[], sampleRate: number): LufsResult;
```

## Refactor: `src/components/LufsMeter.tsx`
- Import `measureLUFS` from `../lib/lufs`.
- Add an optional `analyser?: AnalyserNode` prop (or accept a `getSamples: () => { channels: Float32Array[]; sampleRate: number }` callback). When provided and `isPlaying`, on each tick pull `getByteTimeDomainData`/`getFloatTimeDomainData` from the master `AnalyserNode`, split into channels, call `measureLUFS`, and set `integrated`/`shortTerm`/`truePeak`/`lra` from the result.
- Retain `LUFS_TARGETS`, `MIN/MAX_LUFS` scaling, bar rendering, history sparkline, and `testID` — pure visual contract unchanged.
- Keep the `Math.random()`/`Math.sin()` simulation ONLY as a documented fallback when no `analyser`/`getSamples` is passed (so existing tests and the mocked environment still render). Real measurement path takes precedence whenever an analyser exists.

## Wiring (src/components/MasteringSuite.tsx)
- Obtain a master `AnalyserNode` from `audioSystem` (`src/lib/universalAudio.ts`) attached to the currently-playing source, and pass it (or a `getSamples` closure) to `<LufsMeter analyser={...} isPlaying={...} />`. No change to the surrounding layout/playback logic.

## Files / Symbols

| File | Change |
|---|---|
| `src/lib/lufs.ts` | NEW: `measureLUFS`, `kWeight`, `meanSquareBlocks`, `gatedLoudness`, `truePeak`, `LufsResult`. |
| `src/components/LufsMeter.tsx` | Add `analyser?`/`getSamples` prop; use `measureLUFS` in the active tick; keep simulation fallback; preserve `isPlaying`/`testID`. |
| `src/components/MasteringSuite.tsx` | Provide master analyser/getSamples to `LufsMeter` (`:400`). |

## Verification
- [ ] `npx tsc --noEmit` clean
- [ ] `npx vitest run` passes, including `tests/lufs.test.ts`
- [ ] `npm run build` succeeds
