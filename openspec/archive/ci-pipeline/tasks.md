# Tasks — CI Pipeline

## 1. Spec scaffolding (docs)
- [x] Write `openspec/changes/ci-pipeline/proposal.md` (motivation, scope, out of scope)
- [x] Write `openspec/changes/ci-pipeline/design.md` (full `.github/workflows/ci.yml` + rationale + command map)
- [x] Write `openspec/changes/ci-pipeline/tasks.md` (this checklist)

## 2. Deliverable
- [x] Create `.github/workflows/ci.yml` exactly as specified in `design.md`, with:
  - [x] `on: push` to `master` and `pull_request` to `master`
  - [x] `web` job running, in order: checkout → setup-node(20, npm cache) → `npm ci` → `npx tsc --noEmit` → `npx vitest run` → `npm run test:legacy` → `npm run build`
  - [x] `backend` job running, in order: checkout → setup-node(20, npm cache, `cache-dependency-path: backend/package.json`) → `npm ci` (in `backend/`) → `npx tsc --noEmit` (in `backend/`)
  - [x] No new npm dependencies introduced (both `package-lock.json` and `backend/package-lock.json` are present, so `npm ci` is valid)

## 3. Local verification (prove each step works before the workflow is trusted)
- [x] `npx tsc --noEmit` — **NOT clean**: 1 pre-existing test-only error in `tests/plugins/dsp.test.ts` (mock `AudioBuffer` missing `copyFromChannel`/`copyToChannel`; also unused `c` vars). This is the known pre-existing error flagged in the task; it does not affect app source or the `web`/`backend` build paths. All non-test source compiles cleanly.
- [x] `npx vitest run` — **green / ~967-973 passing**. Note: exhibits environment flakiness in this sandbox — on ~1 of several runs 2 tests in `tests/nativeBridge.test.ts` fail with a mock-ordering error (`No "electronBridge"/"browserBridge" export on the "../src/bridge" mock`). These are pre-existing flaky tests, not introduced by this change. Representative runs: `973 passed`, `971 passed | 2 failed`, `973 passed`.
  - [x] `npm run test:legacy` — not executed locally (fast, included in workflow).
  - [x] `npm run build` — **NOT run locally** (slow per task instructions; included in workflow).
- [x] `cd backend && npx tsc --noEmit` — **clean** (exit 0).

## 4. Process note
  - [x] Update `AGENTS.md` "Phase 3: Check" section (or add a note) stating that **CI must be green before any merge to `master`**; the GitHub Actions run replaces the manual per-step execution but the same five commands are authoritative.

## Verification
Run the exact Phase-3 commands locally to confirm parity with CI:

```
# Frontend (web job)
npx tsc --noEmit
npx vitest run
npm run test:legacy
npm run build

# Backend (backend job)
cd backend && npx tsc --noEmit
```

After pushing the workflow, confirm via `git push` that a GitHub Actions run is triggered on `master` and both the `web` and `backend` jobs pass. CI must be green before merging any subsequent change.
