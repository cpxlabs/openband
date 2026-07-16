# Proposal: Voice Cleaner SNR/RMS Metrics

## Context
The `ai-voice-cleaner` spec requires two pure, deterministic, web-safe helper
functions — `measureRMS(buffer)` and `measureSNR(cleanRef, processed)` — that
measure processing quality with no native dependency. `src/lib/plugins/voiceCleaner.ts`
implements the DSP graph and param spec but is **missing** these two metrics
functions (the only outstanding `[ ]` bullets in the spec's Test Requirements).

## Problem Description
- `measureRMS` — missing. Needed to report the RMS level of a normalized buffer
  in [0,1] (web-safe, no `AudioContext`).
- `measureSNR` — missing. Needed to assert a denoise pass increases/holds SNR
  (`measureSNR(noisy, cleaned) >= measureSNR(noisy, noisy)`).

Both are referenced by `openspec/specs/ai-voice-cleaner/spec.md` (lines 75-86,
Test Requirements 105-106) and are pure numeric-array functions.

## Objectives
1. Add `measureRMS(samples: Float32Array | number[]): number` returning RMS in
   [0,1], deterministic, no DOM.
2. Add `measureSNR(cleanRef, processed): number` returning SNR in dB (finite,
   non-negative for identical buffers → `Infinity` or a large finite value;
   increases/holds after denoise).
3. Add vitest coverage asserting the spec scenarios.
4. Mark the two Test Requirements `[x]` and update `docs/pending-implementations.md`.

## Non-Goals
- No native/WASM inference changes; `applyVoiceCleanerGraph` untouched.
- `getChainLatency` / `serializePlugin` Test Requirements are already satisfied
  elsewhere and out of scope.

## Approach
Add the two functions to `src/lib/plugins/voiceCleaner.ts` (same module as the
graph, matching the archive `next-product-design` plan). `measureRMS` computes
the root-mean-square over the sample array, normalized by the max representable
amplitude (1.0 for float audio). `measureSNR` estimates signal power from
`cleanRef` and noise power from the difference `cleanRef - processed`, returning
`10*log10(signalPower / noisePower)`; guard against zero noise (return
`Infinity` or a large finite cap). Both accept plain numeric arrays so they run
identically on web and desktop.
