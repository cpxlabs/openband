# Test Plan: V10 Section B — Seed Determinism

Tests live in `tests/seedDeterminism.test.ts` (vitest, node:test-style output).

## B11 — same recipe+seed+version => same normalized content hash
- Generate `normalizedContentHash(recipe, "s1", "1")` twice; assert equal.
- Assert `generateDeterministicStarter(recipe, "s1", "1")` JSON is deep-equal across two calls.

## B12 — different seeds => at least one musical dimension differs
- Use a recipe with a mood whose `density != 1.0` (e.g. `calm` 0.8 or `energetic` 1.3).
- Assert `normalizedContentHash(recipe, "s1", "1") !== normalizedContentHash(recipe, "s2", "1")`.
- Assert the generated track midiNote arrays differ between seeds.

## B13 — seed serialization round-trip preserves output
- Assert `generateDeterministicStarter(recipe, String("s1"), "1")` equals `generateDeterministicStarter(recipe, "s1", "1")` (string coercion).
- Assert `normalizeSeed` + `seedFromRecipe` round-trip: a recipe whose `seed` is set yields the same hash as passing that same seed string directly.

## B14 — invalid/missing seed normalized deterministically
- `normalizeSeed(null) === ""`, `normalizeSeed(undefined) === ""`, `normalizeSeed("  ") === ""`.
- `seedFromRecipe(recipeWithoutSeed, "1")` is stable across calls (same recipe => same derived seed => same hash).
- `normalizedContentHash(recipeNoSeed, "", "1")` equals `normalizedContentHash(recipeNoSeed, null, "1")`.

## B15 — generation does not read global Math.random in tested path
- Spy on `Math.random` (vi.spyOn(Math, "random")). Call `generateDeterministicStarter` with an explicit seed. Assert `Math.random` was NOT called.
- Separately assert the default `generateTracksForGenre(...)` (no rng) still works (regression smoke).

## B16 — web/native normalized musical content matches for same recipe
- Two independent calls to `generateDeterministicStarter(recipe, "s1", "1")` produce deeply-equal track structures (proves no platform/clock-dependent input leaks into content). Verified in the same JS runtime; the pure RNG guarantees parity with native.

## Regression guards
- Existing `tests/projectStarter.test.ts` and any midi tests remain green (default `rng = Math.random` preserves prior output shape; track counts unchanged).
