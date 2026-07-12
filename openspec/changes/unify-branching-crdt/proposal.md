# Proposal — Unify Branching CRDT with Collaboration Engine

## Context
`src/lib/projectBranching.ts` defines its own `CrdtOp` interface (`src/lib/projectBranching.ts:22`) and its own private `applyOpToState` (`src/lib/projectBranching.ts:170`) / `nextLamport` / `generateOpId` helpers. This op model is structurally incompatible with the single source of truth used by the live collaboration engine: `src/lib/crdt.ts` defines `CrdtOperation` (`src/lib/crdt.ts:1`) and is consumed by `src/lib/collaboration.ts` (`useCollaboration`, `sendOperation`, `applyToState`), `src/lib/snapshotManager.ts` (imports `CrdtOperation`), and (conceptually) the backend `routes/collab.ts` SSE sync.

Because `BranchState.crdtOperations: CrdtOp[]` (`src/lib/projectBranching.ts:18`) is a different shape than `CrdtOperation[]`, branch fork/merge operations cannot be replayed, merged, or broadcast through the existing collaboration sync engine. The two op logs are effectively siloed.

## Problem Description
- `projectBranching.ts` duplicates CRDT semantics (Lamport clock, op id, apply logic) that already exist in `crdt.ts`.
- Drift between the two `apply*` implementations means branch state and live-collab state can diverge for identical operations.
- Branch op logs are invisible to the SSE collaboration transport, so merging a branch does not propagate to connected collaborators.
- `BranchManager.tsx` (`src/components/BranchManager.tsx`) reads `branch.state.crdtOperations.length` but cannot feed those ops into `useCollaboration`.

## Objectives
- Make `projectBranching.ts` use the `CrdtOperation` type from `crdt.ts` as the single op shape (remove local `CrdtOp`).
- Route branch apply/merge through `crdt.ts` `applyOperation` / `mergeOperations` so branch state and collaboration state share identical semantics.
- Keep `BranchManager.tsx` UI contract unchanged (it only reads `crdtOperations.length` and calls `createBranch` / `switchBranch` / `diffBranches` / `mergeBranch` / `deleteBranch`).
- Add/extend tests proving branch ops are valid `CrdtOperation`s and merge the same way the collaboration engine does.

## Scope
Medium. Type alignment + refactor of `applyOpToState`/`mergeBranch`/op creation to delegate to `crdt.ts`. BranchManager likely needs a `CrdtOperation[]` type import but no behavioral change. No new dependencies, no new CRDT algorithms.

## Out of Scope
- `yjsCRDT.ts` (separate standalone WebSocket CRDT) is not touched.
- Backend `routes/collab.ts` wiring of branch ops over SSE is a follow-up (noted in spec update, not implemented here).
- UI redesign of `BranchManager.tsx` / `CommitModal.tsx` / `VersionHistory.tsx`.
