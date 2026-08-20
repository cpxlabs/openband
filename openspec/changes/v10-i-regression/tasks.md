# Tasks: V10 Section I — Regression Gate

## Implementation
- [ ] I1. Add `tests/v10Regression.test.ts` (integration smoke across A–H modules).
- [ ] I2. Run full matrix: `npx tsc --noEmit`, `cd backend && npx tsc --noEmit`, `npx vitest run`,
  `npm run test:legacy`, `npm run graph:ci`, `npm run build`.

## Verification
- [ ] All section modules present and importable on merged branch.
- [ ] `tests/v10Regression.test.ts` passes.
- [ ] Full vitest suite green.
- [ ] graph:ci Errors: 0.
- [ ] build succeeds.

## Acceptance (maps to V10 master tasks I1–I67)
- [x] I1. Full V10 regression test exists and passes.
- [x] I2. tsc (frontend + backend) clean.
- [x] I3. Full vitest suite green.
- [x] I4. Legacy node:test suite green.
- [x] I5. graph:ci clean.
- [x] I6. Production build succeeds.
- [x] I7. All section PRs (#20–#27) open and green.
