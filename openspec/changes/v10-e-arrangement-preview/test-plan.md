# Test Plan: V10 Section E — Arrangement Preview

Tests in `tests/arrangementPreview.test.ts` (vitest). Use `generateArrangement` from
`src/lib/arrangementGenerator.ts` for a known subgenre (e.g. "trap" or "boombap" — verify
which return non-empty `EnergySection[]` via `tests/lib6.test.ts`); build a synthetic
`EnergySection[]` for deterministic unit tests.

## E35 — known subgenre returns arrangement sections
- `generateArrangement(knownSubgenre).length > 0` and each section has `energy` 1..5.

## E36 — selector ≤ max windows
- `selectRepresentativeWindows(sections, { maxWindows: 3, previewBudgetBars: 100 })` → `length <= 3`.

## E37 — within preview budget
- Sum of returned windows' `bars` ≤ `previewBudgetBars`.

## E38 — high-energy selected when available
- Build sections with one `energy: 5` section. Assert at least one returned window's
  `sectionIndex` points to a high-energy (>=4) section.

## E39 — contrast selected when available
- Build sections with varying energy (e.g. 1,5,2,4). Assert a returned window references a
  low/medium-energy section, or that `pickContrast` returns the highest-delta adjacent pair.

## E40 — no-arrangement fallback
- `selectRepresentativeWindows([], { maxWindows: 3, previewBudgetBars: 16 })` returns exactly
  one window, `bars <= 16`, `startBar === 0`.

## E41 — manual section selection
- `clampWindowToContent({ sectionIndex: 2, startBar: 10, endBar: 999 }, totalBars=40)` →
  `endBar === 40`, `bars === 30`. (User-requested window is clamped, not exceeded.)

## E42 — cache invalidation on bpm/key
- `const k = arrangementCacheKey("trap", 120, "C")`. `isRenderCacheValid(k, { bpm: 120, key: "C" })` === true. `isRenderCacheValid(k, { bpm: 140, key: "C" })` === false. `isRenderCacheValid(k, { bpm: 120, key: "G" })` === false. (Unrelated session state like seed is not part of the key, so it does not invalidate.)

## E43 — full arrangement not rendered per tweak
- `shouldRenderFullArrangement(64)` === false; `shouldRenderFullArrangement(112)` === false; `shouldRenderFullArrangement(8)` === true.

## E44 — window boundaries clamped to content
- `clampWindowToContent({ sectionIndex: 0, startBar: -5, endBar: 999 }, 32)` → `startBar >= 0`, `endBar === 32`, `bars === 32`.
- `clampWindowToContent({ sectionIndex: 0, startBar: 20, endBar: 10 }, 32)` → `startBar <= endBar` (clamp so startBar=10,endBar=20 or similar valid ordering).

## Regression
- Existing `tests/lib6.test.ts` (arrangementGenerator usage) stays green (no signature changes to existing functions).
