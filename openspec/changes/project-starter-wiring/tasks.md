# Tasks: Project Starter Wiring & Validation

- [ ] Update `NewProjectProps.onCreate` to accept `ProjectStarterResult`; `onStartFromScratch?` to accept `ProjectStarterResult`.
- [ ] Refactor `NewProject.handleCreate` to call `setupProjectStarter({ name, genreId: selectedGenre.id, mood, bpm, numBars, timeSignature, key })` and invoke `onCreate(result)`.
- [ ] Refactor `NewProject.handleScratch` to call `setupProjectStarter({ ..., startFromScratch: true })` and invoke `onStartFromScratch?.(result)`.
- [ ] Update all `NewProject` callers to consume `ProjectStarterResult` (map `genre` → `genreId` where referenced).
- [ ] Add `regionDurationFor` formula tests (4/4, 3/4, 6/8) to `tests/projectStarter.test.ts`.
- [ ] Add `numBars` clamp tests (0→1, 200→64) to `tests/projectStarter.test.ts`.
- [ ] Add `bpm` clamp tests (above/below `genre.bpmRange`) to `tests/projectStarter.test.ts`.
- [ ] Add `startFromScratch` empty-tracks + metadata-preserved test to `tests/projectStarter.test.ts`.
- [ ] Update any component/screen tests rendering `NewProject` to expect `ProjectStarterResult` shape.
- [ ] Update `openspec/specs/project-starter/spec.md`: mark the 5 Test Requirements `[x]` and add an Implementation Notes entry about `NewProject` → `setupProjectStarter` wiring.
- [ ] Run `npx tsc --noEmit` and `npx vitest run tests/projectStarter.test.ts` to verify.
