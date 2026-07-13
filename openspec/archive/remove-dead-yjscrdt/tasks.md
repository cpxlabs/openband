# Tasks — Remove Dead yjsCRDT

## 1. Delete dead module
  - [x] Delete `src/lib/yjsCRDT.ts`.

## 2. Delete orphan test
  - [x] In `tests/lib3.test.ts`, remove the `describe("yjsCRDT module", …)` block (lines 546-556) including its `beforeEach` `vi.importActual("../src/lib/yjsCRDT")` and the "exports modules" `it`. Leave the neighboring `collaboration module` / `timeStretch module` blocks untouched.

## 3. Confirm no behavior change
  - [x] Grep `src/` + `tests/` for `yjsCRDT` — expect zero remaining references.
  - [x] Confirm `src/lib/collaboration.ts` still imports from `./crdt` (`collaboration.ts:10`).
  - [x] Confirm `src/lib/snapshotManager.ts` still imports `type { CrdtOperation }` from `./crdt` (`snapshotManager.ts:1`).
  - [x] Confirm no other file imported `yjsCRDT` symbols (no compile errors expected).

## 4. Spec update
  - [x] Update `openspec/specs/collaboration-crdt/spec.md`: single-source Overview, drop `yjsCRDT.ts` from Implementation Notes, remove the WebSocket `connectToSync` scenario from "Transport Abstraction", and remove the `yjsCRDT` bullets from Test Requirements.

## Verification
  - [x] `npx tsc --noEmit` — frontend type-clean (proves `yjsCRDT` was unreferenced).
  - [x] `cd backend && npx tsc --noEmit` — backend type-clean.
  - [x] `npx vitest run` — all suites pass (esp. `tests/lib3.test.ts` without the removed block).
