# Design — Unify Branching CRDT with Collaboration Engine

## Type Alignment

| Current (projectBranching.ts) | Target (crdt.ts) | Notes |
|---|---|---|
| `CrdtOp { id, lamport, author, type: "add"\|"remove"\|"update", path, value?, timestamp }` | `CrdtOperation { id, userId, timestamp, type: "track.add"\|"track.remove"\|"track.update"\|"note.add"\|"note.remove"\|"note.update"\|"mix.update"\|"chord.update", path, value, clientId }` | Replace local `CrdtOp` entirely. |
| `BranchState.crdtOperations: CrdtOp[]` | `BranchState.crdtOperations: CrdtOperation[]` | Update field type in `src/lib/projectBranching.ts:18`. |
| `applyOpToState(state, op)` (private, `:170`) | `applyOperation(state, op)` from `crdt.ts` | Delegate; delete the local impl. |
| `nextLamport()` / `generateOpId()` (`projectBranching.ts`) | `createOperation(userId, type, path, value)` from `crdt.ts` | Delegate op creation; no local clock/id. |

### Mapping branch op semantics → `CrdtOperation`
`projectBranching` currently uses `type: "add" | "remove" | "update"` with `path` like `tracks/<id>` or `tracks/<id>/<field>`. The collaboration engine uses dotted paths (`track.add` at `tracks`, `track.update` at `tracks.<id>`). To unify, branch ops will be emitted with:
- `type`: `"track.add" | "track.remove" | "track.update"` (note namespace is `track.*`, matching `crdt.ts`).
- `path`: dotted, e.g. `tracks.<id>` for add/remove or `tracks.<id>.<field>` for update — so `crdt.ts.applyOperation` resolves the array element by `id` exactly as the collaboration engine does (`src/lib/crdt.ts:115-130`).
- `userId`: the `author` previously stored (`userId` defaults to `"local"` when none supplied).
- `clientId`: produced by `getClientId()` from `crdt.ts`.

## Files / Symbols

| File | Change |
|---|---|
| `src/lib/projectBranching.ts` | Delete `CrdtOp` interface (`:22`). Import `CrdtOperation`, `createOperation`, `applyOperation`, `mergeOperations`, `getClientId` from `./crdt`. Change `BranchState.crdtOperations` to `CrdtOperation[]`. Replace `generateOpId`/`nextLamport` usage inside `applyOperationToBranch` (`:151`) with `createOperation`. Replace `applyOpToState` body (`:170`) with `applyOperation` (note: `applyOperation` returns a new state object; `applyOperationToBranch` must assign `branch.state = applyOperation(branch.state, fullOp)` instead of mutating). `mergeBranch` (`:284`) uses `mergeOperations` to combine `main.state.crdtOperations` and `branch.state.crdtOperations` (replacing the spread concat at `:328`). |
| `src/lib/snapshotManager.ts` | Already imports `CrdtOperation` — no change needed other than confirming `BranchState` re-use is consistent (snapshotManager only consumes `CrdtOperation[]`). |
| `src/components/BranchManager.tsx` | Change the `branch.state.crdtOperations.length` read type import if it references `CrdtOp`; switch to `CrdtOperation` re-export or drop the local import. No behavioral change — `createBranch`/`switchBranch`/`diffBranches`/`mergeBranch`/`deleteBranch` signatures stay the same. |
| `src/lib/crdt.ts` | No change required (it is the source of truth now). |

## Behavior Details

### `applyOperationToBranch`
- Build the op via `createOperation(userId, mappedType, dottedPath, value)`.
- Apply with `branch.state = applyOperation(branch.state, fullOp)` (immutable, matching collaboration semantics).
- Push `fullOp` (a `CrdtOperation`) onto `branch.state.crdtOperations`.

### `mergeBranch`
- Replace line `:328` spread (`main.state.crdtOperations = [...main.state.crdtOperations, ...branch.state.crdtOperations]`) with:
  `main.state.crdtOperations = mergeOperations(main.state.crdtOperations, branch.state.crdtOperations)`.
- This guarantees idempotent merge (duplicate op ids from repeated merges are deduplicated by `mergeOperations`, `src/lib/crdt.ts:48-50`).

### Selective accept (`acceptChanges`)
- Logic at `:295-325` still manipulates `branch.state.tracks` / `branch.state.buses` directly based on `diffBranches` — unchanged, operating on the same `TrackDef[]`/`BusDef[]` shapes.

## Verification
- [ ] `npx tsc --noEmit` clean (projectBranching + BranchManager)
- [ ] `npx vitest run` passes, including new/extended projectBranching tests
- [ ] `npm run build` succeeds
