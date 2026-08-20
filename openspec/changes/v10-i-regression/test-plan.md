# Test Plan: V10 Section I — Regression Gate

`tests/v10Regression.test.ts` (vitest, node:test-style). Imports real modules from the merged
branch. Must NOT mock the section modules.

## Happy-path pipeline (A–H)
- Build a recipe; `makeRng(seedA)` then `makeRng(seedA)` → identical sequence; `makeRng(seedB)` → different.
- `generateDeterministicStarter(recipe, { seed })` twice with same seed → deep-equal tracks (B).
- `computeProjectHash({id, recipe, locks})` stable; wrap into `StoredProject` with that hash → `validateStoredProject` true (H).
- `roleForTrackType("drums") === "rhythm"`; construct tracks; `applyLocks` with an incompatible
  key change → `incompatible.length > 0` (C).
- `new VariationHistory({ keep: 3, onEvict: spy })`; push 5 → exactly 2 evicted (revocation), selected preserved (D).
- `new PrivacyWipe({ onWipe })`; `wipeEphemeral()` + `wipeAll()` → both scopes fired, no throw (H).
- `new ConcurrencyGuard<number>()`; two `run(delayed)` → only latest applied (F).
- `new AudioResourceGuard({ context, factory, maxVoices: 4 })`; 6 previews → activeCount <= 4 (G).
- `selectRepresentativeWindows(arrangementFor("trap"), { maxWindows: 2, previewBudgetBars: 16 })` →
  windows within content, count <= 2 (E).
- `createPromotionGate(); buildApprovedSnapshot(snapshotA)` then a reconfigured `snapshotB`
  (same musical content, different id/seed) → `buildApprovedSnapshot(snapshotB)` returns a DIFFERENT
  token (proving the same-content token did NOT silently collapse the 2nd project) (A).

## Matrix
- Full `npx vitest run` green.
- `npx tsc --noEmit`, `cd backend && npx tsc --noEmit`, `npm run test:legacy`, `npm run graph:ci` (Errors: 0), `npm run build` green.

## Regression
- All prior section tests still green within the full suite (no shared-file changes beyond the merges).
