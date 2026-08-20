# Design: V10 Section I — Regression Gate

## Integration smoke test
New file `tests/v10Regression.test.ts` (vitest, node:test-style). It imports every V10 section
module and asserts the combined pipeline behaves:

1. **Seed → generation → lock → history → persistence** happy path:
   - `makeRng(seed)` deterministic.
   - `computeProjectHash` stable; `validateStoredProject` true for a correctly-hashed project.
   - `roleForTrackType` assigns roles; `applyLocks` rejects an incompatible change.
   - `VariationHistory` keeps the latest and evicts beyond keep count (revocation fired).
   - `PrivacyWipe` wipes ephemeral + all without throwing.
2. **Concurrency + audio guard co-exist**:
   - `ConcurrencyGuard` latest-wins; `AudioResourceGuard` bounds voices; both construct without error.
3. **Arrangement preview** `selectRepresentativeWindows` returns bounded, in-content windows.
4. **Promotion exactness** `createPromotionGate` returns a stable gate; `buildApprovedSnapshot`
   derives a token from musical content only (so a reconfigured 2nd project is NOT silently dropped).

All assertions use the REAL public APIs of the merged modules (no mocks of the modules
themselves). The test fails if any module's contract drifts.

## Matrix gate
Run on the merged branch:
- `npx tsc --noEmit`
- `cd backend && npx tsc --noEmit`
- `npx vitest run` (full suite)
- `npm run test:legacy`
- `npm run graph:ci`
- `npm run build`

All must be green.
