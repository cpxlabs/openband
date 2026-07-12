# Design — Remove Dead yjsCRDT

## Step 1 — Confirm importers (already verified)
- `src/lib/crdt.ts` is imported by `src/lib/collaboration.ts:10` and `src/lib/snapshotManager.ts:1`.
- `src/lib/yjsCRDT.ts` has **no importers** in `src/` (grep for `yjsCRDT` / `from "./yjsCRDT"` returns only `tests/lib3.test.ts`).
- `tests/lib3.test.ts` references `yjsCRDT` only in a `describe("yjsCRDT module", …)` block (`lib3.test.ts:546-556`) that imports the module via `vi.importActual("../src/lib/yjsCRDT")` and asserts it exports keys.

## Step 2 — Delete the dead module
- Remove `src/lib/yjsCRDT.ts` entirely.
- This removes the duplicate `CRDTOperation` / `CRDTDocument` / `CRDTSyncMessage` types and the standalone `connectToSync` WebSocket logic (the live sync path is already served by `backend/src/routes/collab.ts` + `presence.ts`).

## Step 3 — Delete the orphan test
- In `tests/lib3.test.ts`, remove the `describe("yjsCRDT module", …)` block at lines 546-556 (the `beforeEach` `vi.importActual("../src/lib/yjsCRDT")` and the "exports modules" `it`). No other test depends on it.

## Step 4 — No behavior change
- `collaboration.ts` and `snapshotManager.ts` keep importing from `./crdt`. Nothing else references `yjsCRDT`, so deleting it cannot alter runtime behavior.
- `tsc` and `vitest` must remain green after deletion (proves the file was truly unreferenced).

## Step 5 — Spec update
- In `openspec/specs/collaboration-crdt/spec.md`:
  - Overview line 4: replace "Two distinct implementations exist: `src/lib/crdt.ts` … while `src/lib/yjsCRDT.ts` is a standalone …" with a single-source statement: only `src/lib/crdt.ts` is the CRDT of record.
  - Implementation Notes line 7: drop the `yjsCRDT.ts` sentence.
  - Requirement "Transport Abstraction (SSE / WebSocket)" line 52-58: remove the `yjsCRDT.connectToSync` WebSocket scenario (the `/collab` SSE transport remains).
  - Test Requirements line 66-67: remove the `yjsCRDT createDocument + applyOperation` and `resolveConflicts` bullets.

## Resulting state
- One CRDT implementation (`crdt.ts`) used by collaboration + snapshot/branching.
- Reduced maintenance surface and a spec that matches reality.
