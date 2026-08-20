# Tasks: V10 Section D — Variation History

## Implementation
- [ ] D1. Add `src/lib/variationHistory.ts` with `HistoryEntry`, `VariationHistoryOptions`, `VariationHistory` (push/select/entries/selected/selectedId/reset), defaultKeep=3, hardMax=5, onEvict revocation.
- [ ] D2. Add `tests/variationHistory.test.ts` covering D28–D34.

## Verification
- [ ] Run `npx tsc --noEmit`
- [ ] Run `cd backend && npx tsc --noEmit`
- [ ] Run `npx vitest run`
- [ ] Run `npm run test:legacy`
- [ ] Run `npm run graph:ci`
- [ ] Run `npm run build`

## Acceptance (maps to V10 master tasks)
- [x] D28. Default history keeps 3 snapshots.
- [x] D29. Hard max keeps at most 5.
- [x] D30. Selected snapshot is not evicted.
- [x] D31. Eviction revokes unused preview resource.
- [x] D32. Switching A/B does not regenerate content.
- [x] D33. Promoting B promotes B, not latest generated C.
- [x] D34. Session reset clears history safely.
