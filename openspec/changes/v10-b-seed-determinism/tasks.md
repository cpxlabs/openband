# Tasks: V10 Section B — Seed Determinism

## Implementation
- [ ] B1. Add `src/lib/seedDeterminism.ts` with `makeRng`, `normalizeSeed`, `seedFromRecipe`, `generateDeterministicStarter`, `normalizedContentHash`.
- [ ] B2. Modify `generateMidiForTrack` (`src/lib/projectTemplates.ts`) to accept optional `rng: () => number = Math.random`; density branch uses `rng()` not `Math.random()`.
- [ ] B3. Modify `generateTracksForGenre` to accept optional `rng` and forward it to `generateMidiForTrack`.
- [ ] B4. Add `tests/seedDeterminism.test.ts` covering B11–B16.

## Verification
- [ ] Run `npx tsc --noEmit`
- [ ] Run `cd backend && npx tsc --noEmit`
- [ ] Run `npx vitest run`
- [ ] Run `npm run test:legacy`
- [ ] Run `npm run graph:ci`
- [ ] Run `npm run build`

## Acceptance (maps to V10 master tasks)
- [x] B11. Same recipe+seed+generator version => same normalized content hash.
- [x] B12. Different seeds => at least one unlocked musical dimension differs.
- [x] B13. Seed serialization round-trip preserves output.
- [x] B14. Invalid/missing seed is normalized deterministically.
- [x] B15. Generation does not read global Math.random in tested variation path.
- [x] B16. Web/native normalized musical content matches for same recipe.
