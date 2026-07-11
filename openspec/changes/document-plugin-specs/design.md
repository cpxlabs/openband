# Design Notes — Plugin Specs

## Source of Truth
Specs were derived from `docs/features-implementation.md` and the plugin
comparison table in the roadmap. File paths in the spec tables point to the
actual `src/lib/plugins/*` modules agents should read before coding.

## Conventions
- Param ranges use the same min/max as `paramSchema` in code.
- "Clamp not throw" is a hard requirement because presets can be user-edited JSON.
- LUFS math must follow ITU-R BS.1770-4 K-weighting (already in `LufsMeter`).

## Out of Scope
- One Knob simplifiers, Vocal Verb, Shimmer (Phase 2 roadmap — not yet shipped).
- AUv3 (Phase 3 — deferred).
