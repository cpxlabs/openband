# Design: V10 Section C — Locks

## Module
New file `src/lib/lockPolicy.ts`. Reuses `normalizeTrackContent` (export it from
`src/lib/seedDeterminism.ts`) and `GENRES` / `getTrackType` from `src/lib/projectTemplates.ts`,
and `ProjectStarterResult` from `src/lib/projectStarter.ts`.

## Roles
```ts
export type LockRole = "rhythm" | "bass" | "harmony" | "melody" | "fx";

const TRACK_TYPE_TO_ROLE: Record<string, LockRole> = {
  drums: "rhythm", percussion: "rhythm",
  bass: "bass",
  guitar: "harmony", keys: "harmony", synth_lead: "harmony", pad: "harmony",
  vocal: "melody",
  fx: "fx", sample: "fx",
};

export function roleForTrackType(trackType: string | undefined): LockRole;
```

A result track's role is derived from its genre-template `trackType` at the same index
(`GENRES[genreId].suggestedTracks[idx].trackType`), with `getTrackType(name)` fallback.

## API
```ts
export function computeRoleHashes(result: ProjectStarterResult, genreId: string): Record<LockRole, string>;
export function applyLocks(
  prev: ProjectStarterResult,
  next: ProjectStarterResult,
  locks: Partial<Record<LockRole, boolean>>,
  genreId: string,
): ProjectStarterResult;
export function evaluateKeyChange(
  locks: Partial<Record<LockRole, boolean>>,
  fromKey: string, toKey: string,
): { invalidated: LockRole[] };
export function evaluateBpmChange(
  locks: Partial<Record<LockRole, boolean>>,
  fromBpm: number, toBpm: number,
): { invalidated: LockRole[] };
export function detectIncompatibleLocks(
  genreId: string,
  locks: Partial<Record<LockRole, boolean>>,
): LockRole[];
```

## computeRoleHashes
For each track, compute `normalizeTrackContent(track)` and hash it; group all tracks of the
same role and combine their hashes (id-free). Returns a hash per role (roles with no tracks
hash to `""`).

## applyLocks
Returns a new `ProjectStarterResult` equal to `next`, except for each role `r` where
`locks[r] === true`: the tracks of role `r` are taken from `prev` (verbatim, preserving
their normalized hash). Unlocked roles keep `next`'s regenerated content. This satisfies
C17–C23 (locked role hash preserved; multiple locks compose; all-locks ⇒ result equals
`prev` musically).

## BPM / key policy (C24/C25)
- `evaluateKeyChange`: invalidated = locked roles whose pitch depends on key →
  `harmony`, `melody`, `bass`. `rhythm` and `fx` are unaffected by key.
- `evaluateBpmChange`: invalidated = locked roles that contain notes (timing depends on
  BPM) → `rhythm`, `bass`, `harmony`, `melody`. `fx` is unaffected.
- Policy: a proposed change whose `invalidated` list is non-empty is **rejected** (caller
  keeps the original parameters); the locked role's content is never silently mutated.
  This is the documented transform/reject policy.

## Incompatible locks (C26/C27)
`detectIncompatibleLocks(genreId, locks)` returns every role `r` where `locks[r] === true`
but `GENRES[genreId]` has no track of that role. Callers must handle the returned list
explicitly (keep the lock across a compatible genre, or surface it) — **never silently
discard** a lock.
