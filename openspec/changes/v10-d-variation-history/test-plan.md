# Test Plan: V10 Section D — Variation History

Tests in `tests/variationHistory.test.ts` (vitest, node:test-style). Build `HistoryEntry`s
from `ApprovedStarterSnapshot` (use `src/lib/snapshotPromotion.ts` shape: recipe+seed+version
+ uri + approved + approvalToken + approvedAt). Give each a distinct `id` and `previewUri`.

## D28 — default keeps 3
- `new VariationHistory()` (default opts). `push` 3 distinct entries. `entries.length === 3`.

## D29 — hard max keeps at most 5
- `new VariationHistory()` (hardMax default 5). `push` 6 distinct entries. `entries.length <= 5`.

## D30 — selected snapshot not evicted
- push 6 entries (so eviction occurs). Before the 6th push, `select` entry #2 (an early one).
  After all pushes, assert the selected entry (#2) is still in `entries` (not evicted) and
  `selectedId === "2"`.

## D31 — eviction revokes unused preview resource
- Provide `onEvict` spy. push 6 entries. Assert `onEvict` was called for the evicted entry/entries,
  and the evicted entry's `previewUri` was passed (so caller can revoke the blob URL). Assert
  the SELECTED entry was NOT passed to `onEvict`.

## D32 — A/B switch does not regenerate
- push entries A, B, C. `select("A")` then `select("B")`. Assert `onEvict` was NOT called during
  selects (select never regenerates/revokes). Assert `selectedId` toggles correctly.

## D33 — promote B promotes B not latest C
- push A, B, C (selected becomes C). `select("B")`. `history.selected.id === "B"` (not "C").
  (Promotion is the caller's action on `history.selected`; this proves selection is independent of push order.)

## D34 — session reset clears safely
- Provide `onEvict` spy. push 3 entries. `reset()`. Assert `onEvict` called once per entry (all
  revoked) and `entries.length === 0` and `selected === null`.

## Regression
- `tests/projectStarter.test.ts`, `tests/lockPolicy.test.ts` stay green (no shared-file changes).
