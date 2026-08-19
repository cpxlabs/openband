# Design: V10 Section B — Seed Determinism

## Module
New file `src/lib/seedDeterminism.ts`. Modifies `src/lib/projectTemplates.ts`
(`generateTracksForGenre`, `generateMidiForTrack`) to accept an optional `rng`.

## API
```ts
// Pure, seedable PRNG. Deterministic for a given seed string; never reads Math.random.
export function makeRng(seed: string): () => number;

// Normalizes a seed: null/undefined/"" -> ""; otherwise trimmed string. (B14)
export function normalizeSeed(seed: string | null | undefined): string;

// Stable seed when none supplied: derives from normalized recipe + version. (B11/B14)
export function seedFromRecipe(recipe: Recipe, version: string): string;

// Deterministic starter tracks for a recipe+seed+version. (B11/B12/B15/B16)
export function generateDeterministicStarter(
  recipe: Recipe,
  seed: string,
  version: string,
): TrackDef[];

// Hash of the generated musical content (ids excluded). (B11/B12/B16)
export function normalizedContentHash(
  recipe: Recipe,
  seed: string,
  version: string,
): string;
```

## PRNG
`makeRng` uses mulberry32 seeded by a 32-bit FNV-1a hash of the seed string. Output is in
`[0,1)`. Pure and identical on web and native for the same seed.

## Generation wiring
- `generateMidiForTrack(..., rng: () => number = Math.random)` — the density branch
  (`density < 1.0` filter, `density > 1.0` duplicate+jitter) uses `rng()` instead of
  `Math.random()`. All other note math is already deterministic.
- `generateTracksForGenre(..., rng: () => number = Math.random)` forwards `rng` into
  `generateMidiForTrack`. Default `Math.random` preserves existing output exactly.
- Track/plugin/region **ids** (`Date.now()` / `nextRegionId()`) remain as-is — they are
  transient and excluded from `normalizedContentHash` (per Section A `normalizedRecipe`).

## Determinism
`generateDeterministicStarter` builds `rng = makeRng(\`${version}::${normalizeSeed(seed) || seedFromRecipe(recipe, version)}\`)`
and calls `generateTracksForGenre` with it. Same `recipe+seed+version` ⇒ identical RNG
sequence ⇒ identical notes/timing/plugins ⇒ identical `normalizedContentHash`.

## Hash
`normalizedContentHash` generates the tracks, then serializes a canonical, id-free
structure (per-track: name, volume, pan, regions [start/duration], plugins [type/params],
midiNotes [pitch/start/duration/velocity] sorted by start then pitch) plus
`{version, seed, recipe: normalizedRecipe(recipe)}`, and hashes it. Ids/timestamps are
never included, so the hash is stable across runs and platforms.

## Seed variation (B12)
For moods with `density != 1.0` (e.g. calm 0.8, energetic 1.3), the seeded RNG decides
which notes survive/duplicate, so different seeds produce different normalized content.
B12 tests use such a mood.
