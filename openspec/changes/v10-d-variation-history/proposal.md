# Proposal: V10 Section D — Variation History

## Context
V10 Section A–C give exact, deterministic, lockable generation. Section D adds a bounded
variation history: as the user generates variations (seeds/moods), the last few are kept so
they can A/B compare and promote any of them, without regenerating content. The history is a
ring buffer: default keeps 3 snapshots, hard max 5. The selected snapshot is pinned (never
evicted), and eviction revokes the preview resource of the dropped snapshot so blob URLs /
audio buffers don't leak. Switching A/B only moves a selection pointer — no regeneration.

## Objectives
- `src/lib/variationHistory.ts` with a bounded ring (default 3, hard max 5).
- Selected snapshot pinning; eviction never drops the selected entry.
- Eviction + session reset revoke the preview resource of dropped entries.
- A/B selection is a pointer move, no regeneration.
- Promoting a selected (non-latest) entry promotes that entry, not the latest.

## Non-goals
No UI, no persistence (Section H), no audio playback. Pure state container + tests.
