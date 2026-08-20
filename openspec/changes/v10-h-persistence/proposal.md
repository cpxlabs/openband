# Proposal: V10 Section H — Persistence / Privacy / Security

## Context
V10 Sections A–G make generation exact, deterministic, lockable, historied, previewable, race-
safe, and audio-safe. Section H hardens the **persistence & privacy** boundary: previews are
ephemeral (never durable), users can wipe local state, approved starters carry an integrity
hash, lock state never desyncs from its project, history storage is bounded, no secrets/PII
leak to logs, and unmount never writes partial state.

Section H adds `src/lib/persistenceGuard.ts`: a small policy module that classifies records as
ephemeral vs durable, sanitizes logs, bounds history, and validates stored-project integrity.

## Objectives
- Preview drafts are never written to durable storage.
- A privacy wipe clears all local/ephemeral state.
- Approved starters persist with a contentHash for integrity.
- Lock state persists alongside its project (no desync).
- Variation history storage is bounded to the keep count.
- No secrets/PII appear in logs.
- Unmount writes nothing partial.

## Non-goals
No real filesystem/DB calls (the UI wires `persist`/`wipe` to `projectStore`/`OpenBandNative`).
No UI. Pure policy + tests.
