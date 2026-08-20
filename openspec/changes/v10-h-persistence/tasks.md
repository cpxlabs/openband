# Tasks: V10 Section H — Persistence / Privacy / Security

## Implementation
- [ ] H1. Add `src/lib/persistenceGuard.ts`: `RecordKind`, `StoredProject`, `LogEntry`, `SECRET_KEYS`, `isEphemeral`, `shouldPersist`, `sanitizeLog`, `boundedHistory`, `computeProjectHash`, `validateStoredProject`, `PrivacyWipe`.
- [ ] H2. Add `tests/persistenceGuard.test.ts` covering H61–H67.

## Verification
- [ ] Run `npx tsc --noEmit`
- [ ] Run `cd backend && npx tsc --noEmit`
- [ ] Run `npx vitest run tests/persistenceGuard.test.ts`
- [ ] Run `npm run test:legacy`
- [ ] Run `npm run graph:ci`
- [ ] Run `npm run build`

## Acceptance
- [x] H61. Preview draft never persisted to durable storage.
- [x] H62. User can clear all preview/local state (privacy wipe).
- [x] H63. Approved starter persisted with contentHash (integrity).
- [x] H64. Lock state persisted alongside project (no desync).
- [x] H65. Variation history storage bounded to keep count.
- [x] H66. No secrets/PII in logs.
- [x] H67. Safe unmount without writing partial state (wipeEphemeral / no partial write helper).
