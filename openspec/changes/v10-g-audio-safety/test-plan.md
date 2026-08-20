# Test Plan: V10 Section G — Audio / Resource Safety

Tests in `tests/audioResourceGuard.test.ts` (vitest, node:test-style). Inject a fake context
and factory so no real audio runs.

## Fakes
```ts
const makeCtx = () => {
  const calls: number[] = [];
  return {
    id: 'shared', volume: 1,
    setVolume(v: number) { this.volume = v; calls.push(v); },
    _calls: calls,
  };
};
let created = 0;
const makeFactory = (behaviors: Partial<Record<number, 'throw'>> = {}) => ({
  create(ctx, params) {
    created++;
    const id = created;
    let stopped = false, disposed = false, played = false;
    return {
      id, params,
      play() { if (behaviors[id] === 'throw') throw new Error('boom'); played = true; },
      stop() { stopped = true; },
      dispose() { disposed = true; },
      _state: () => ({ stopped, disposed, played }),
    };
  },
});
```

## G53 — single context reused
- `ctx = makeCtx()`, `g = new AudioResourceGuard({ context: ctx, factory: makeFactory() })`.
  Call `g.preview({})` 6 times. Assert `created === 6` (voices created) but the SAME `ctx` passed
  every time (factory receives `ctx` with `id === 'shared'`); assert `ctx._calls` shows no new
  context allocation. Essentially: the guard holds ONE context (verify via a spy that `factory.create`
  always receives the identical `ctx` object).

## G54 — invalidate on key/BPM change
- `g.preview({ key: 'C', bpm: 90 })` → token `t`. `g.invalidate({ key: 'D' })` → assert voice `t`
  disposed (state.disposed === true) and `g.activeCount === 0`.
- Also `invalidate({ bpm: 120 })` releases a voice whose bpm differs.

## G55 — releases nodes after stop
- `g.preview({})` → `t`. `g.stop(t)` → assert voice.dispose === true and activeCount === 0.

## G56 — bounded voices
- `g = new AudioResourceGuard({ context, factory, maxVoices: 4 })`. Fire 6 `preview({})`.
  Assert `g.activeCount <= 4`. Assert the oldest 2 were disposed (track dispose order).

## G57 — restore default volume
- `g = new AudioResourceGuard({ context, factory, defaultVolume: 0.5 })`. `g.preview({ volume: 1 })`.
  `g.stopAll()` → assert `ctx.volume === 0.5` (restored). Also `g.restoreVolume()` sets ctx.volume to default.

## G58 — no orphans after dispose
- 3 previews, then `g.dispose()` → assert `g.activeCount === 0` and all 3 voices disposed.

## G59 — idempotent play/stop
- `t = g.preview({})`. `g.stop(t)` then `g.stop(t)` again → assert `voice.stop` called exactly once
  (count). `g.play(t)` after stop → no-op (voice.play not called again). Unknown token stop/play → no throw.

## G60 — failure isolation
- factory where the FIRST voice's `play` throws (`behaviors[1] = 'throw'`). `g.preview({})` (throws internally,
  caught). Assert guard still usable: a subsequent `g.preview({})` succeeds (`activeCount >= 1`) and the
  throwing voice was released (disposed). No exception escapes `preview`.

## Regression
- `tests/concurrencyGuard.test.ts`, `tests/arrangementPreview.test.ts`, `tests/variationHistory.test.ts`,
  `tests/lockPolicy.test.ts` stay green (no shared-file changes).
