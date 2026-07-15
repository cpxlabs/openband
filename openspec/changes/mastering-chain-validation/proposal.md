# Proposal: Mastering Chain Validation Hardening

## Context
The `mastering-plugins` spec (`openspec/specs/mastering-plugins/spec.md`) requires a `validateMasteringChain` guard that rejects any mastering chain ending in more than one limiter-type node (`limiter` or `truePeakLimiter`). The spec's Test Requirements are unchecked, and the spec NOTE claims presets #4 (`Loudness Maximizer`), #6 (`EDM Club`), #9 (`Lo-Fi Vibe`) end with a trailing `limiter` → `truePeakLimiter`. Current code review shows those presets already end with a single `truePeakLimiter` (descriptions still say "Limiter → True Peak"), so the fix is to align the descriptions and harden validation to cover all spec scenarios plus add the missing Vitest coverage.

## Problem
- `validateMasteringChain` only checks the last two nodes for consecutive limiters. The spec's Scenario "Reject double terminal limiter" describes `[EQ, Limiter, TruePeakLimiter]` being rejected. This works today, but the implementation should be robust (e.g., reject any chain whose final node is a limiter AND the immediately preceding node is also a limiter, including repeated `truePeakLimiter`).
- Preset descriptions for #4/#6/#9 are stale ("Limiter → True Peak").
- The seven spec Test Requirements (10 presets valid, validate rejects >1 terminal limiter, the 3 presets end with single truePeakLimiter, LUFS -70 floor, LUFS -14 tone, MixManager 4-snapshot deep equal, VisualEQ band drag, bounce ceiling) are unchecked.

## Objectives
1. Harden `validateMasteringChain` to reject any chain where the last two nodes are both limiters (covers `limiter`+`truePeakLimiter` and `truePeakLimiter`+`truePeakLimiter`).
2. Fix the three preset descriptions to match their actual single-`truePeakLimiter` ending.
3. Add/verify Vitest tests covering the spec Test Requirements in `tests/mastering.test.ts` and `tests/lufs.test.ts`.
4. Update `mastering-plugins/spec.md` Test Requirements checkboxes to `[x]` for the covered items.

## Scope
- `src/lib/mastering.ts` (`validateMasteringChain` + 3 preset descriptions)
- `tests/mastering.test.ts`, `tests/lufs.test.ts` (add coverage)
- `openspec/specs/mastering-plugins/spec.md` (update checkboxes + notes)

## Out of scope
- Rewriting the offline DSP render (`applyMasteringChain`) — out of scope; only validation + docs.
- `MasteringSuite`/`LufsMeter` UI changes (already wire `measureLUFS`).
