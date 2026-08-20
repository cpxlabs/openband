# Test Plan: V10 Section C — Locks

Tests in `tests/lockPolicy.test.ts` (vitest, node:test-style). Use `setupProjectStarter`
from `src/lib/projectStarter.ts` to build two `ProjectStarterResult`s from two recipes
(same genre, e.g. "rock", different seed or mood) so tracks differ.

## C17 — rhythm lock preserves drum event hash
- `prev` and `next` = two starters. Compute `computeRoleHashes(prev,"rock").rhythm`.
- `res = applyLocks(prev, next, { rhythm: true }, "rock")`.
- `computeRoleHashes(res,"rock").rhythm === computeRoleHashes(prev,"rock").rhythm`.

## C18 — bass lock preserves bass role hash
- Same as C17 with `{ bass: true }`; assert bass hash preserved.

## C19 — harmony lock preserves harmony hash
- `{ harmony: true }`; harmony hash preserved.

## C20 — melody lock preserves melody hash
- `{ melody: true }`; melody hash preserved.

## C21 — FX lock preserves plugin/preset normalized hash
- `{ fx: true }`; the fx-role tracks' plugin params hash preserved (compare `normalizeTrackContent` of fx tracks between prev and res).

## C22 — multiple locks compose
- `{ rhythm: true, bass: true }`; both rhythm and bass hashes equal prev; harmony/melody/fx equal next.

## C23 — all locks + regenerate ⇒ equivalent snapshot
- `res = applyLocks(prev, next, {rhythm,bass,harmony,melody,fx:true}, "rock")`.
- `computeRoleHashes(res,"rock")` deep-equals `computeRoleHashes(prev,"rock")`.

## C24 — BPM change with locked content (policy)
- `evaluateBpmChange({ rhythm: true, fx: true }, 120, 140).invalidated` contains `"rhythm"` and NOT `"fx"`.
- `evaluateBpmChange({}, 120, 140).invalidated` is empty (no locks ⇒ nothing invalidated ⇒ change allowed).

## C25 — key change with locked harmony (policy)
- `evaluateKeyChange({ harmony: true, rhythm: true }, "C", "G").invalidated` contains `"harmony"` and NOT `"rhythm"`.

## C26 — genre change detects incompatible locks
- Pick a genre whose suggestedTracks lack an `fx` role track (verify via `GENRES`), e.g. a simple genre. `detectIncompatibleLocks(genreId, { fx: true })` includes `"fx"`.

## C27 — incompatible lock never silently discarded
- `detectIncompatibleLocks` returns the incompatible locked roles (not dropped); assert the returned array equals the set of locked-but-absent roles. (Caller is responsible for handling; the function surfaces them.)

## Regression
- Existing `tests/seedDeterminism.test.ts`, `tests/projectStarter.test.ts`, and `tests/components.test.tsx` stay green (no behavior change to generation; only `normalizeTrackContent` export added).
