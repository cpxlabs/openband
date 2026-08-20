# Design: V10 Section F — Concurrency / Race Safety

## Module
New file `src/lib/concurrencyGuard.ts`. No dependencies on other V10 sections (self-contained).

## API
```ts
export interface RunOutcome<T> {
  id: number;
  result: T;
  applied: boolean;   // should this result be used (latest, or the approved one)
  stale: boolean;     // !applied
}

export interface ConcurrencyGuardOptions {
  onDispose?: (id: number) => void;  // called for every result that is NOT applied
                                    // (and for live tasks on dispose/cancel)
}

export class ConcurrencyGuard<T = unknown> {
  constructor(opts?: ConcurrencyGuardOptions);
  get latestId(): number;
  get isDisposed(): boolean;
  run(task: () => Promise<T>): Promise<RunOutcome<T>>;
  approve(id: number): void;          // pin an explicit revision as the kept one
  cancelInFlight(): void;             // mark all live + pending results stale
  dispose(): void;                    // mark disposed; cancels in-flight; stops playback via onDispose
}
```

## Semantics
- Each `run(task)` gets a monotonically increasing `id` and is awaited. On resolution:
  - `applied = !disposed && (id === approvedId || (approvedId === null && id === latestId))`.
  - If not applied, `onDispose(id)` is called (caller disposes the rejected result / stops playback).
- **Latest wins (F45/F46):** with no approval, only the highest `id` is applied; earlier
  completions are stale and disposed.
- **Approval pins (F47):** `approve(id)` makes `id` the only applied one — even if a newer
  render completes afterward, the approved revision is kept and the newer is stale.
- **Bounded rapid clicks (F48):** 50 `run` calls → only the final `id` (latest) is applied;
  the other 49 are stale. No unbounded work beyond the started tasks (each resolves once).
- **Close during render (F50):** `cancelInFlight()` (called by close) marks all live + future
  pending results stale; any resolving task is disposed via `onDispose`.
- **Unmount/background (F51):** `dispose()` sets `disposed = true`, cancels in-flight, and
  invokes `onDispose` for every live task so the caller can stop playback.
- **Idempotent simultaneous Create (F52):** two `run(createTask)` calls → only the latest
  (or approved) is applied, so a single project is created.

## Determinism / safety
No timers, no global state beyond the instance. `onDispose` is the only side effect. The
class is fully synchronous in its bookkeeping; only the wrapped `task` is async.
