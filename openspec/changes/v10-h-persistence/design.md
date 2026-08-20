# Design: V10 Section H — Persistence / Privacy / Security

## Module
New file `src/lib/persistenceGuard.ts`. Self-contained; no dependency on other V10 sections.

## Types & API
```ts
export type RecordKind = "preview" | "approved" | "lock" | "history" | "meta";

export interface StoredProject {
  id: string;
  contentHash: string;
  locks?: unknown;
  history?: unknown[];
  [k: string]: unknown;
}

export interface LogEntry {
  level: string;
  message: string;
  meta?: Record<string, unknown>;
}

export const SECRET_KEYS: readonly string[];   // fields stripped from logs

export function isEphemeral(kind: RecordKind): boolean;       // "preview" => true
export function shouldPersist(kind: RecordKind): boolean;     // !isEphemeral
export function sanitizeLog(entry: LogEntry): LogEntry;       // strips SECRET_KEYS from meta
export function boundedHistory<T>(items: T[], keep: number): T[];  // last `keep`
export function computeProjectHash(project: { id: string; recipe?: unknown; locks?: unknown }): string;
export function validateStoredProject(project: StoredProject): boolean;  // contentHash matches
export class PrivacyWipe {
  constructor(opts: { onWipe: (scope: "ephemeral" | "all") => void });
  wipeEphemeral(): void;
  wipeAll(): void;
}
```

## Semantics (tests depend on these)
- `isEphemeral("preview") === true`; `isEphemeral("approved"|"lock"|"history"|"meta") === false`.
- `shouldPersist` is the inverse.
- `sanitizeLog` returns a NEW entry; any key in `SECRET_KEYS` (e.g. `token`, `password`,
  `secret`, `authToken`, `apiKey`) found in `meta` is replaced with `"[redacted]"`. Other keys
  preserved. `message` is left untouched (caller must not log secrets in messages).
- `boundedHistory(items, keep)` returns the LAST `keep` items (most recent). If `items.length
  <= keep`, returns a copy unchanged. `keep <= 0` → `[]`.
- `computeProjectHash` is a stable hash of `{id, recipe, locks}` (order-independent key
  stringify). `validateStoredProject` recomputes and compares to `project.contentHash`.
- `PrivacyWipe.wipeEphemeral` calls `onWipe("ephemeral")`; `wipeAll` calls `onWipe("all")`.
  Neither throws; unknown scopes are ignored.

## Safety
Pure, no I/O, no globals. `sanitizeLog` never mutates the input. Hash is deterministic.
