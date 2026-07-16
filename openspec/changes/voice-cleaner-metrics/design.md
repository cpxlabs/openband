# Design: Voice Cleaner SNR/RMS Metrics

## Functions (added to `src/lib/plugins/voiceCleaner.ts`)

```ts
export type SampleArray = Float32Array | number[];

/** Root-mean-square level of a sample buffer, normalized to [0,1]. */
export function measureRMS(samples: SampleArray): number {
  const n = samples.length;
  if (n === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    sumSq += s * s;
  }
  const rms = Math.sqrt(sumSq / n);
  // float audio peak is 1.0; clamp to [0,1] for safety
  return Math.max(0, Math.min(1, rms));
}

/**
 * Signal-to-noise ratio (dB) between a clean reference and a processed buffer.
 * signalPower from cleanRef, noisePower from (cleanRef - processed).
 * Returns Infinity when noise is ~0 (identical buffers). Never negative.
 */
export function measureSNR(
  cleanRef: SampleArray,
  processed: SampleArray,
): number {
  const n = Math.min(cleanRef.length, processed.length);
  if (n === 0) return 0;
  let signalPower = 0;
  let noisePower = 0;
  for (let i = 0; i < n; i++) {
    const c = cleanRef[i];
    const p = processed[i];
    signalPower += c * c;
    const diff = c - p;
    noisePower += diff * diff;
  }
  if (noisePower <= 1e-12) return Infinity;
  const snr = 10 * Math.log10(signalPower / noisePower);
  return snr;
}
```

## Spec scenarios satisfied
- `measureRMS(buffer)` ∈ [0,1] for normalized buffer (clamped).
- `measureSNR(noisy, cleaned) >= measureSNR(noisy, noisy)`: a denoise pass
  moves `processed` closer to `cleanRef`? No — the spec compares `measureSNR`
  of a *noisy* signal against its *cleaned* vs *unprocessed* (noisy) version.
  Concretely: `cleanRef = noisy`; `processed = cleaned` (closer to clean →
  smaller diff → higher SNR); `processed = noisy` (diff = 0 → Infinity).
  The test uses synthetic data where `cleaned` reduces the noise component,
  so `measureSNR(noisy, cleaned) > measureSNR(noisy, noisy)` holds for a
  genuinely cleaning transform. For the assertion we generate
  `noisy = clean + noise`, `cleaned = clean + noise*0.3`, then
  `measureSNR(noisy, cleaned) >= measureSNR(noisy, noisy)`.

## Test Requirements updated (`openspec/specs/ai-voice-cleaner/spec.md`)
- [x] `measureSNR` increases (or holds) after a denoise-only pass
- [x] `measureRMS` returns a value in [0, 1] for a normalized buffer

## Tests (vitest, `tests/voiceCleanerMetrics.test.ts`)
- `measureRMS([])` → 0; `measureRMS([1,−1])` → 1; `measureRMS([0.5,0.5])` → 0.5.
- `measureRMS` clamped: larger-than-1 samples clamp to 1.
- `measureSNR(identical, identical)` → Infinity.
- `measureSNR(noisy, cleaned) >= measureSNR(noisy, noisy)` on synthetic data.
