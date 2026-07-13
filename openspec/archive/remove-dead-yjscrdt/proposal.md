# Proposal — Remove Dead yjsCRDT

## Context
`src/lib/crdt.ts` is the operation-based CRDT that is the **single source of truth** for collaborative editing. It is imported and used by:
- `src/lib/collaboration.ts` (`useCollaboration` hook) — `createOperation`, `mergeOperations`, `applyOperation`, `encodeState`, `decodeState` (`collaboration.ts:10`).
- `src/lib/snapshotManager.ts` — `import type { CrdtOperation }` (`snapshotManager.ts:1`).

`src/lib/yjsCRDT.ts` is a **second, self-contained** CRDT implementation (Lamport-clock WebSocket-synced document store, `createDocument` / `applyOperation` / `connectToSync` / `resolveConflicts`). It has **zero importers** anywhere in `src/` — no screen, component, or library imports it. It is dead code that duplicates the functionality already provided by `crdt.ts`.

The only reference to `yjsCRDT` outside the file itself is a throwaway smoke test in `tests/lib3.test.ts:546-556` (`describe("yjsCRDT module", …)`) that merely asserts the module exports keys.

## Problem
Two competing CRDT implementations violate the SDD single-source-of-truth principle, increase maintenance surface, and confuse the spec (`openspec/specs/collaboration-crdt/spec.md` describes "Two distinct implementations" as if both were needed). Deleting the unused one removes dead code with **no behavior change**.

## Objectives
- Delete `src/lib/yjsCRDT.ts`.
- Delete the orphan smoke test in `tests/lib3.test.ts`.
- Confirm `collaboration.ts` and `snapshotManager.ts` remain on `crdt.ts` (no edits required).
- Update `openspec/specs/collaboration-crdt/spec.md` to drop the "two implementations" note and the `yjsCRDT` test requirement.

## Scope
**S** — delete one file + one test block + one spec edit. No logic changes, no dependency changes, no behavior change.

## Out of Scope
- Reworking the `yjsCRDT` WebSocket transport into `crdt.ts` — not needed; `collaboration.ts` + `presence.ts` already handle SSE sync and the offline queue.
- Any change to `crdt.ts`, `collaboration.ts`, or `snapshotManager.ts`.
