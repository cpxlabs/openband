# Test Plan: V10 Section H — Persistence / Privacy / Security

Tests in `tests/persistenceGuard.test.ts` (vitest, node:test-style output). No real I/O.

## H61 — preview never persisted
- `isEphemeral("preview") === true`; `shouldPersist("preview") === false`. Approved/lock/history/meta are durable.

## H62 — privacy wipe clears local state
- `let wiped: string[] = []`; `const w = new PrivacyWipe({ onWipe: (s) => wiped.push(s) })`.
  `w.wipeEphemeral()`. assert `wiped === ["ephemeral"]`. `w.wipeAll()` → `wiped` includes "all". Unknown scope no throw.

## H63 — approved starter integrity hash
- `const p = { id: "proj-1", recipe: { genreId: "pop" }, locks: { drums: "locked" } }`.
  `const hash = computeProjectHash(p)`; `const stored = { ...p, contentHash: hash }`.
  `validateStoredProject(stored) === true`. Tamper `stored.recipe = { genreId: "rock" }` →
  `validateStoredProject(stored) === false`. Missing contentHash → false.

## H64 — lock state persisted with project (no desync)
- Two projects with different `locks`; `computeProjectHash` differs when locks differ; identical
  locks+recipe+id → identical hash (so lock state is part of the persisted integrity blob, preventing desync).

## H65 — bounded history storage
- `boundedHistory([1,2,3,4,5], 3)` → `[3,4,5]`. `boundedHistory([1,2], 3)` → `[1,2]` (copy). `keep=0` → `[]`.

## H66 — no secrets in logs
- `const e = { level: "info", message: "ok", meta: { token: "abc", userId: "u1", apiKey: "k" } }`.
  `const s = sanitizeLog(e)`; assert `s.meta.token === "[redacted]"`, `s.meta.apiKey === "[redacted]"`, `s.meta.userId === "u1"`. Assert `e.meta.token` UNCHANGED (no mutation). `SECRET_KEYS` includes token/password/secret/authToken/apiKey.

## H67 — safe unmount without partial write
- A `persistProject` shim that throws if called with a project lacking contentHash (partial). Assert: attempting to persist a preview (`shouldPersist("preview") === false`) short-circuits before any write; and a full approved project with valid hash persists, while one without hash is rejected (no partial write). (Uses `shouldPersist` + `validateStoredProject` as the gate.)

## Regression
- All prior section tests stay green (no shared-file changes): run `tests/seedDeterminism.test.ts`, `tests/lockPolicy.test.ts`, `tests/variationHistory.test.ts`, `tests/arrangementPreview.test.ts`, `tests/concurrencyGuard.test.ts`, `tests/audioResourceGuard.test.ts`.
