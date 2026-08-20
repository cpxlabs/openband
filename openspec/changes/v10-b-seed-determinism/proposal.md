# Proposal: V10 Section B — Seed Determinism

## Context
V10 Section A guarantees that an approved snapshot's musical content hash equals the
promoted project's hash, and that promotion does not regenerate. Section B hardens the
generation layer so that the *same* recipe + seed + generator version always yields the
*same* normalized musical content, and so generation never reads the global
`Math.random` in tested variation paths.

Today `generateMidiForTrack` (`src/lib/projectTemplates.ts`) calls `Math.random()` inside
the mood-density branch (note filtering at `density < 1.0`, note duplication/jitter at
`density > 1.0`). No seeded PRNG exists anywhere in `src/`. This means two creations with
the same recipe can produce different notes/timing, breaking reproducibility and any
future A/B or variation feature that must compare content across seeds.

## Objectives
- Introduce a pure, seedable PRNG (`makeRng`) with no `Math.random` dependency.
- Thread the seeded RNG into `generateTracksForGenre` / `generateMidiForTrack` (optional
  `rng` param, defaulting to `Math.random` so existing behavior is unchanged).
- Provide canonical seed normalization (`normalizeSeed`) and a deterministic starter
  generator (`generateDeterministicStarter`) that derives an RNG from `version + seed`.
- Provide `normalizedContentHash(recipe, seed, version)` that hashes the generated
  musical content (notes, plugins, regions, pan/volume) — content only, ids excluded.
- Guarantee web/native produce identical normalized content for the same recipe+seed.

## Non-goals
- No change to existing callers that do not pass an `rng` (behavior preserved).
- No new UI. No persistence changes. Section B is pure library + tests.
