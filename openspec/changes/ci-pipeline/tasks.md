# Tasks — CI Pipeline

## 1. Spec scaffolding (docs)
- [x] Write `openspec/changes/ci-pipeline/proposal.md` (motivation, scope, out of scope)
- [x] Write `openspec/changes/ci-pipeline/design.md` (full `.github/workflows/ci.yml` + rationale + command map)
- [x] Write `openspec/changes/ci-pipeline/tasks.md` (this checklist)

## 2. Deliverable
- [ ] Create `.github/workflows/ci.yml` exactly as specified in `design.md`, with:
  - [ ] `on: push` to `master` and `pull_request` to `master`
  - [ ] `web` job running, in order: checkout → setup-node(20, npm cache) → `npm ci` → `npx tsc --noEmit` → `npx vitest run` → `npm run test:legacy` → `npm run build`
  - [ ] `backend` job running, in order: checkout → setup-node(20, npm cache, `cache-dependency-path: backend/package.json`) → `npm ci` (in `backend/`) → `npx tsc --noEmit` (in `backend/`)
  - [ ] No new npm dependencies introduced

## 3. Local verification (prove each step works before the workflow is trusted)
- [ ] `npx tsc --noEmit` — clean (root)
- [ ] `npx vitest run` — passes
- [ ] `npm run test:legacy` — passes
- [ ] `npm run build` — succeeds
- [ ] `cd backend && npx tsc --noEmit` — clean (backend)

## 4. Process note
- [ ] Update `AGENTS.md` "Phase 3: Check" section (or add a note) stating that **CI must be green before any merge to `master`**; the GitHub Actions run replaces the manual per-step execution but the same five commands are authoritative.

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
