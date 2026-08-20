# Proposal: V10 Section C — Locks

## Context
V10 Section A guarantees exact promotion (same recipe ⇒ same content). Section B makes
generation deterministic per seed. Section C adds **per-role locks**: the user can pin
rhythm, bass, harmony, melody, or FX so that a regeneration (variation/seed change)
preserves the locked role's exact musical content (normalized hash), while unlocked roles
are freely regenerated.

Today there is no concept of a role lock. Regenerating always rebuilds every track, so any
work the user liked (a drum pattern, a bassline) is lost on the next variation. Section C
introduces `src/lib/lockPolicy.ts` with role hashing, lock application, and a documented
transform/reject policy for BPM/key changes against locked content, plus incompatible-lock
detection on genre change (never silently dropped).

## Objectives
- Define `LockRole` (rhythm/bass/harmony/melody/fx) and a `TrackLock` shape.
- `computeRoleHashes(result)` — canonical id-free hash per role.
- `applyLocks(prev, next, locks)` — locked roles copied verbatim from `prev`; unlocked
  roles taken from `next` (regenerated).
- `evaluateBpmChange` / `evaluateKeyChange` — return which locked roles a proposed change
  would invalidate (transform/reject policy surface).
- `detectIncompatibleLocks(genreId, locks)` — return locked roles absent from a genre
  (so callers can keep or reject them explicitly, never silently discard).

## Non-goals
- No UI. No persistence/serialization of locks (that is Section H). No audio changes.
