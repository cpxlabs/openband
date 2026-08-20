# Proposal: V10 Creative Iteration

## Context & Problem
The Creative Iteration feature area (exact promotion, seed determinism, locks, variation history, arrangement preview, concurrency/race safety, audio/resource safety, persistence/privacy/security) had no OpenSpec specs. The Section A pure core (`src/lib/snapshotPromotion.ts`) was built ahead of full specs (PR #17, now merged) — a deviation from the Specification-Driven Development loop. This change retroactively establishes proper planning/docs and specifies the remainder.

The recent CI fix that installs backend dependencies inside the vitest step is unrelated to this work but has unblocked the verification matrix.

## Objectives
1. **A. Exact promotion** — fully specified here; immediate implementation target.
2. **B. Seed determinism** — planned phase.
3. **C. Locks** — planned phase.
4. **D. Variation history** — planned phase.
5. **E. Arrangement preview** — planned phase.
6. **F. Concurrency / race safety** — planned phase.
7. **G. Audio / resource safety** — planned phase.
8. **H. Persistence / privacy / security** — planned phase.
9. **I. Regression** — planned phase.

Sections B–I are planned phases and must be specced in detail before their own implementation.
