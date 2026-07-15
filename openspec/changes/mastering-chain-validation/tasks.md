# Tasks: Mastering Chain Validation Hardening

- [ ] In `src/lib/mastering.ts`, harden `validateMasteringChain`: keep consecutive-limiter rejection, make error message specific, guard empty chain (return `{ valid: true }` for length < 2).
- [ ] Fix the three preset `description` strings (`Loudness Maximizer`, `EDM Club`, `Lo-Fi Vibe`) to reflect single `truePeakLimiter` ending.
- [ ] In `tests/mastering.test.ts`, add a case: `validateMasteringChain([eq, truePeakLimiter, truePeakLimiter])` returns `{ valid: false }`.
- [ ] In `tests/mastering.test.ts`, add a bounce-ceiling test: run `applyMasteringChain` on a full-scale `AudioBuffer` (2ch, 48000Hz, 0.5s, samples = 1.0) using a preset ending in `truePeakLimiter`; assert absolute max sample ≤ 1.0001.
- [ ] Verify `tests/lufs.test.ts` passes (silence `-70` floor, `-14 dBFS` tone ±0.5, true peak ≤ 0). Add a `-14 dBFS` tone test if missing.
- [ ] Check `tests/components*.test.tsx` / `tests/screens.test.tsx` for `VisualEQ` band-drag (updates EQ param) coverage; add a test if missing.
- [ ] Check for `MixManager` 4-snapshot deep-equal coverage; add a test if missing.
- [ ] Update `openspec/specs/mastering-plugins/spec.md`: mark covered Test Requirements `[x]`; add Implementation Notes entry about `validateMasteringChain` semantics and preset description fix.
- [ ] Run `npx tsc --noEmit` and `npx vitest run tests/mastering.test.ts tests/lufs.test.ts` to verify.
