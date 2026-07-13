# Proposal — CI Pipeline

## Context
The OpenSpec SDD loop (see `AGENTS.md`) defines a mandatory **Phase 3: Check** gate that every change must pass before commit/merge: a fixed sequence of `npx tsc --noEmit`, `cd backend && npx tsc --noEmit`, `npx vitest run`, `npm run test:legacy`, and `npm run build`. Today these checks are run only manually by the agent, and there is **no** `.github/workflows` directory — so a regression can land on `master` with zero automated signal. The repo auto-deploys to Vercel on push to `master` (`AGENTS.md` › Vercel Deploy), which makes a silent break especially costly: a failed `npm run build` ships a broken production web bundle.

## Problem Description
- No `.github/workflows` directory exists (verified: `ls .github/workflows` → No such file or directory).
- No CI config of any kind (`**/*.yml`, `.github`, `ci` all empty).
- The five Phase-3 checks are only enforced by convention in `AGENTS.md`; nothing blocks a push that does not run them.
- Vercel deploys automatically on every push to `master`, so an unverified push can deploy broken code without review.

## Objectives
- Add `.github/workflows/ci.yml` that runs the exact Phase-3 checks on every push to `master` (and on pull requests targeting `master`).
- Split the work into two jobs: a **web/frontend** job (root `package.json` checks) and a **backend** job (`backend/package.json` checks), so failures are isolated and cacheable.
- Use `actions/checkout` + `actions/setup-node` with Node 20 and npm dependency caching; install with `npm ci` (or `npm install` when no lockfile is present).
- Introduce **no new dependencies** — the workflow only orchestrates existing scripts.
- Document in the spec that CI must be green before any merge to `master`.

## Out of Scope
- No new test frameworks, linters, or tooling beyond what `package.json` / `backend/package.json` already declare.
- No Vercel project config changes, no deployment gating beyond what already exists.
- No Windows/macOS matrix (single `ubuntu-latest` runner is sufficient for the web build + backend tsc; native Android/iOS/Electron builds remain manual).
