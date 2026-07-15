# Proposal: Project Starter Wiring & Validation

## Context
The `project-starter` spec (`openspec/specs/project-starter/spec.md`) defines a 3-step New Project flow that produces a `ProjectStarterResult` via `setupProjectStarter(config)` in `src/lib/projectStarter.ts`. The spec's Test Requirements are currently unchecked, and `src/components/NewProject.tsx` still emits a raw config object directly to `onCreate` rather than routing through `setupProjectStarter`. This change wires `NewProject` through the orchestration module and adds the missing Vitest coverage for the spec's five Test Requirements.

## Problem
- `NewProject.tsx` computes `config` locally and calls `onCreate(config)`; it does not call `setupProjectStarter`, so BPM/numBars clamping and deterministic region-duration logic live only in the wizard UI, duplicated from `projectStarter.ts`.
- The five spec Test Requirements (`setupProjectStarter` track count, region duration formula, empty scratch, BPM clamp, numBars clamp) are unchecked.

## Objectives
1. Refactor `NewProject.handleCreate` to build the config and delegate to `setupProjectStarter`, passing the returned `ProjectStarterResult` to `onCreate`.
2. Refactor `handleScratch` to call `setupProjectStarter({ ..., startFromScratch: true })` and pass the result to `onStartFromScratch`.
3. Add Vitest tests in `tests/projectStarter.test.ts` covering all five spec Test Requirements (currently 4 tests cover most; add the missing `numBars` clamp and `regionDurationFor` formula tests).
4. Update `project-starter/spec.md` Test Requirements checkboxes to `[x]` for the covered items and document the `NewProject` wiring in Implementation Notes.

## Scope
- `src/components/NewProject.tsx` (wiring only; no visual changes)
- `tests/projectStarter.test.ts` (new tests)
- `openspec/specs/project-starter/spec.md` (update checkboxes + notes)

## Out of scope
- Genre/mood template data changes
- Studio screen consumption of the result (already uses `generateTracksForGenre`)
