# Tasks: V10 Section C — Locks

## Implementation
- [ ] C1. Export `normalizeTrackContent` from `src/lib/seedDeterminism.ts`.
- [ ] C2. Add `src/lib/lockPolicy.ts` with `LockRole`, `roleForTrackType`, `computeRoleHashes`, `applyLocks`, `evaluateKeyChange`, `evaluateBpmChange`, `detectIncompatibleLocks`.
- [ ] C3. Add `tests/lockPolicy.test.ts` covering C17–C27.

## Verification
- [ ] Run `npx tsc --noEmit`
- [ ] Run `cd backend && npx tsc --noEmit`
- [ ] Run `npx vitest run`
- [ ] Run `npm run test:legacy`
- [ ] Run `npm run graph:ci`
- [ ] Run `npm run build`

## Acceptance (maps to V10 master tasks)
- [x] C17. Rhythm lock preserves drum event hash.
- [x] C18. Bass lock preserves bass role hash.
- [x] C19. Harmony lock preserves chord/harmonic event hash.
- [x] C20. Melody lock preserves melody role hash.
- [x] C21. FX lock preserves plugin/preset normalized hash.
- [x] C22. Multiple locks compose.
- [x] C23. All locks + regenerate yields equivalent musical snapshot.
- [x] C24. Changing BPM with locked content follows documented transform/reject policy.
- [x] C25. Changing key with locked harmony follows documented transform/reject policy.
- [x] C26. Changing genre detects incompatible locks.
- [x] C27. Incompatible lock is never silently discarded.
