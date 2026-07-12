# Tasks — Unify Branching CRDT with Collaboration Engine

## 1. Type unification (src/lib/projectBranching.ts)
- [ ] Remove the local `CrdtOp` interface (`src/lib/projectBranching.ts:22`).
- [ ] Import `type CrdtOperation`, `createOperation`, `applyOperation`, `mergeOperations`, `getClientId` from `./crdt`.
- [ ] Change `BranchState.crdtOperations` from `CrdtOp[]` to `CrdtOperation[]` (`src/lib/projectBranching.ts:18`).
- [ ] Update the `applyOperationToBranch` parameter type (`Omit<CrdtOp, ...>`) to `Omit<CrdtOperation, ...>` (`src/lib/projectBranching.ts:153`).

## 2. Delegate op creation to crdt.ts
- [ ] In `applyOperationToBranch` (`:151`), replace `generateOpId()` + `nextLamport()` with `createOperation(author, mappedType, dottedPath, value)`.
  - Map `"add"`→`"track.add"`, `"remove"`→`"track.remove"`, `"update"`→`"track.update"`.
  - Convert `path` from slash form (`tracks/<id>/<field>`) to dotted form (`tracks.<id>.<field>`).
  - Use `getClientId()` for `clientId`.

## 3. Delegate apply/merge to crdt.ts
- [ ] Replace the body of `applyOpToState` (`:170`) so it calls `applyOperation(state, op)` — or inline `branch.state = applyOperation(branch.state, fullOp)` in `applyOperationToBranch` and delete `applyOpToState`.
- [ ] In `mergeBranch` (`:284`), replace the concat at `:328` with `mergeOperations(main.state.crdtOperations, branch.state.crdtOperations)`.

## 4. Update UI type import (src/components/BranchManager.tsx)
- [ ] If `BranchManager.tsx` imports `CrdtOp`/uses it for `branch.state.crdtOperations`, switch to `CrdtOperation` (or drop the import — it only reads `.length`). No signature/behavior change to `createBranch`/`switchBranch`/`diffBranches`/`mergeBranch`/`deleteBranch`.

## 5. Tests (Vitest)
- [ ] Add/extend `src/lib/projectBranching.test.ts`:
  - `createBranch` op log entries are valid `CrdtOperation` (have `clientId`, `userId`, dotted `type`).
  - `applyOperationToBranch` produces a `CrdtOperation` whose shape matches `crdt.ts` `CrdtOperation`.
  - Branch op applied via `applyOperation` yields the same track/bus state as the collaboration engine would.
  - `mergeBranch` is idempotent: merging the same branch twice does not duplicate ops in `main.state.crdtOperations` (proves `mergeOperations` dedup).
  - Existing spec scenarios still pass: deep-clone create, diff added/modified, selective accept, delete refusals.

## 6. Spec updates
- [ ] Update `openspec/specs/project-branching/spec.md` Implementation Notes: state that branch `crdtOperations` now use `CrdtOperation` from `src/lib/crdt.ts` and apply/merge delegate to `applyOperation`/`mergeOperations`; note SSE propagation is a TODO follow-up.
- [ ] Update `openspec/specs/collaboration-crdt/spec.md` Implementation Notes: add that `projectBranching.ts` reuses `CrdtOperation` (single source of truth) so branch ops are collaboration-compatible.

## 7. Verification
- [ ] `npx tsc --noEmit` clean
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `npx vitest run` passes
- [ ] `npm run build` succeeds
