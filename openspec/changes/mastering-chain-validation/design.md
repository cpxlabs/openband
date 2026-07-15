# Design: Mastering Chain Validation Hardening

## `validateMasteringChain` hardening
Current (mastering.ts:111):
```ts
export function validateMasteringChain(chain) {
  const types = Array.isArray(chain) ? chain.map(p => p.type)
                                     : chain.plugins.map(p => p.type);
  const last = types[types.length - 1];
  const secondLast = types[types.length - 2];
  const isLimiter = (t) => t === "limiter" || t === "truePeakLimiter";
  if (isLimiter(last) && isLimiter(secondLast)) {
    return { valid: false, error: "Chain ends with duplicate limiter nodes" };
  }
  return { valid: true };
}
```
This already satisfies Scenario "Reject double terminal limiter" for `[EQ, Limiter, TruePeakLimiter]`. Hardening: keep the same semantics but make the error message specific and add a guard for empty chains. Change error to: `"Chain ends with more than one limiter node (limiter/truePeakLimiter)".` Also explicitly document that a single trailing `truePeakLimiter` is valid.

## Preset description fixes
Update the `description` field (NOT the `plugins` array, which is already correct) for:
- `Loudness Maximizer`: `"EQ → Multiband → True Peak"`
- `EDM Club`: `"EQ → Multiband → Imager → True Peak"`
- `Lo-Fi Vibe`: `"Tape → EQ → True Peak"`

## Tests to add/verify
`tests/mastering.test.ts`:
- `validateMasteringChain` rejects `[eq, limiter, truePeakLimiter]` (already covered) AND `[eq, truePeakLimiter, truePeakLimiter]`.
- `validateMasteringChain` accepts `[eq, compressor, truePeakLimiter]` (covered).
- All 10 presets `buildMasteringChain(preset)` returns `Plugin[]` of matching length with `enabled === true` (covered).
- The 3 affected presets end with single `truePeakLimiter` and second-last is not `limiter` (covered).

`tests/lufs.test.ts` (already covers spec scenarios — verify green):
- `-70` floor on silence
- `-14 dBFS` 1 kHz tone within ±0.5 LUFS
- true peak ≤ 0 dBTP

## Component/screen test alignment
`tests/components*.test.tsx` / `tests/screens.test.tsx` referencing `MasteringSuite`, `MixManager`, `VisualEQ`, `LufsMeter`:
- Ensure `VisualEQ` band drag updates underlying EQ param (spec requirement) — if not yet covered, add a test in `tests/components*.test.tsx`.
- `MixManager` stores/recalls 4 snapshots identically (deep equal) — if not yet covered, add a test.
- Bounce through master chain never exceeds ceiling — add a test in `tests/mastering.test.ts` calling `applyMasteringChain` with a preset ending in `truePeakLimiter` on a full-scale buffer and asserting max sample ≤ ~1.0.
