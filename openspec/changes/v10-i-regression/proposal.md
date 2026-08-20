# Proposal: V10 Section I — Regression Gate

## Context
V10 Sections A–H add exact promotion, seed determinism, locks, variation history, arrangement
preview, concurrency safety, audio/resource safety, and persistence/privacy guards. Section I
is the **regression gate**: it proves the whole V10 surface holds together — every section
module loads, its public API behaves, and the full repository test/build matrix stays green
when all sections are combined.

## Objectives
- Single integration smoke test exercising all V10 section modules end-to-end.
- Confirm the full matrix (tsc, backend tsc, vitest, legacy node:test, graph:ci, build) is green
  with all sections merged.
- Document the regression checklist mapping to V10 master tasks I1–I67.

## Non-goals
No new product behavior. No UI. Pure integration verification.
