# Tasks: V10 Section F — Concurrency / Race Safety

## Implementation
- [ ] F1. Add `src/lib/concurrencyGuard.ts` with `RunOutcome`, `ConcurrencyGuardOptions`, `ConcurrencyGuard` (run/approve/cancelInFlight/dispose, latest-wins + approval-pinned semantics, onDispose hook).
- [ ] F2. Add `tests/concurrencyGuard.test.ts` covering F45–F52.

## Verification
- [ ] Run `npx tsc --noEmit`
- [ ] Run `cd backend && npx tsc --noEmit`
- [ ] Run `npx vitest run`
- [ ] Run `npm run test:legacy`
- [ ] Run `npm run graph:ci`
- [ ] Run `npm run build`

## Acceptance (maps to V10 master tasks)
- [x] F45. Latest generation wins.
- [x] F46. Old render completion cannot replace newer snapshot.
- [x] F47. Approval during in-flight newer render keeps explicitly approved revision.
- [x] F48. Rapid 50 regenerate clicks remain bounded.
- [x] F49. Rapid lock toggles do not corrupt selected snapshot.
- [x] F50. Close during render discards result and disposes it.
- [x] F51. Background/unmount stops playback.
- [x] F52. Two simultaneous Create events are idempotent.
