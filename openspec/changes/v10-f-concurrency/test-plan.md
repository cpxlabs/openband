# Test Plan: V10 Section F — Concurrency / Race Safety

Tests in `tests/concurrencyGuard.test.ts` (vitest, node:test-style). Use a controllable
async task: `const delayed = (v: number, ms=0) => () => new Promise<number>(r => setTimeout(()=>r(v), ms))`.

## F45 — latest generation wins
- `g = new ConcurrencyGuard<number>()`. `const a = g.run(delayed(1, 5)); const b = g.run(delayed(2, 1));`
  Await both. `b` (latest id) → `applied === true`; `a` → `applied === false`, `stale === true`.

## F46 — old render cannot replace newer
- Same as F45 with resolvable timing so the OLDER result resolves AFTER the newer; assert the
  older's `applied === false`.

## F47 — approval keeps explicitly approved revision
- `g = new ConcurrencyGuard<number>()`. Run `r1 = g.run(delayed(1, 10))` (id 1). `g.approve(r1.id)`.
  Run `r2 = g.run(delayed(2, 1))` (id 2, resolves first). Await both. `r1.applied === true`
  (approved kept) and `r2.applied === false` (newer discarded because an explicit revision is pinned).

## F48 — rapid 50 clicks bounded
- `g = new ConcurrencyGuard<number>()`. Fire 50 `run(delayed(i))` without awaiting immediately;
  collect outcomes, await `Promise.all`. Count `applied === true` === 1 (only the latest). Assert
  `onDispose` (if provided) was called ~49 times, or simply assert exactly one applied.

## F49 — rapid lock toggles don't corrupt selected snapshot
- Simulate rapid `approve`/`run` toggles: loop 20 times calling `g.run(delayed(i))` then occasionally `g.approve(someId)`. After all settle, assert no exception and that `applied` outcomes are
  consistent (at most one applied when nothing approved, or exactly the approved one when approved).
  Sanctity: `latestId` is monotonic and `applied` flags form a valid set.

## F50 — close during render discards + disposes
- `const disposed = vi.fn(); g = new ConcurrencyGuard<number>({ onDispose: disposed });`
  Start `g.run(delayed(1, 50))` (do not await yet). Call `g.cancelInFlight()`. Await the pending
  outcome → `applied === false`, `stale === true`, and `disposed` was called with that id.

## F51 — unmount stops playback
- `const stop = vi.fn(); g = new ConcurrencyGuard<number>({ onDispose: stop });`
  Start `g.run(delayed(1, 50))` (live). Call `g.dispose()`. Await → `applied === false` and
  `stop` called (playback stopped). `g.isDisposed === true`.

## F52 — two simultaneous Create idempotent
- `const appliedCount = vi.fn();` Use `onDispose` + track applied. Two `run(createStub)` calls
  (createStub resolves a project id). Await both; assert exactly ONE outcome has `applied === true`
  (only one project created).

## Regression
- `tests/projectStarter.test.ts`, `tests/lockPolicy.test.ts`, `tests/variationHistory.test.ts`,
  `tests/arrangementPreview.test.ts` stay green (no shared-file changes).
