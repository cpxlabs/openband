# Proposal: V10 Section G — Audio / Resource Safety

## Context
V10 Sections A–F make generation deterministic, lockable, historied, previewable, and
race-safe. Section G hardens the **audio resource** surface of previews: each per-tweak
preview must not leak AudioContexts, must release nodes when stopped, must be bounded in
concurrent voices, must restore volume, must drop in-flight previews on key/BPM change, and
must survive a failed preview without breaking later playback.

Section G adds `src/lib/audioResourceGuard.ts`: a lifecycle guard around preview "voices"
that uses ONE shared audio context, enforces a max voice count, releases nodes, restores
volume, invalidates on key/BPM change, and isolates errors. It is fully decoupled from the
real audio engine via an injectable `PreviewVoiceFactory`, so the UI can wire it to
`UniversalAudioSystem` while tests use fakes.

## Objectives
- One shared AudioContext reused for all previews (never unbounded allocation).
- In-flight preview rejected/released when key or BPM changes.
- Nodes released after play/stop (no leak).
- Bounded simultaneous preview voices (default 4).
- Default volume restored after previews.
- No orphaned context/voice kept between renders.
- play/stop idempotent.
- A failed preview does not break subsequent playback.

## Non-goals
No real Web Audio in tests (factory injected). No UI changes. No schema changes.
