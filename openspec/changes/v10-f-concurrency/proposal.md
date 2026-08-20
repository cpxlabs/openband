# Proposal: V10 Section F — Concurrency / Race Safety

## Context
V10 Sections A–E make generation deterministic, lockable, historied, and previewable. Section
F hardens the **async** surface: generation/render are asynchronous, and the UI fires many
rapid events (regenerate clicks, lock toggles, close, unmount, double Create). Without a
guard, an older in-flight render can overwrite a newer snapshot, a close can leave a ghost
render applied, and rapid clicks spawn unbounded work or duplicate projects.

Section F introduces `src/lib/concurrencyGuard.ts`: a latest-wins / approval-pinned
coordinator for async generation tasks, with bounded work, stale-render rejection, safe
close-during-render disposal, unmount playback stop, and idempotent simultaneous Create.

## Objectives
- Latest generation wins; older in-flight completions are rejected (stale).
- An explicitly approved revision is kept even if a newer render completes.
- Rapid clicks (e.g. 50) stay bounded — only one final result is applied.
- Closing during render discards the result and disposes it (no ghost apply).
- Unmount/background stops playback via an `onDispose` hook.
- Two simultaneous Create events are idempotent (one applied).

## Non-goals
No UI. No real audio (playback stop is delegated via `onDispose` callback). Pure coordinator + tests.
