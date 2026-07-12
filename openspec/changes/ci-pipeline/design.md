# Design — CI Pipeline

## Deliverable
A single workflow file: `.github/workflows/ci.yml`.

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  web:
    name: Web / Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Type check (frontend)
        run: npx tsc --noEmit

      - name: Vitest
        run: npx vitest run

      - name: Legacy tests
        run: npm run test:legacy

      - name: Build
        run: npm run build

  backend:
    name: Backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: backend/package.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci

      - name: Type check (backend)
        working-directory: backend
        run: npx tsc --noEmit
```

## Rationale / Decisions

### Trigger
- `push` to `master` — covers the auto-deploy path and the "always commit and push" rule in `AGENTS.md`.
- `pull_request` to `master` — catches regressions before they reach `master`.

### Two jobs, not one
- **`web`** runs the four frontend-gated Phase-3 checks that depend on the root `package.json`: `npx tsc --noEmit`, `npx vitest run`, `npm run test:legacy`, `npm run build`.
- **`backend`** runs only `cd backend && npx tsc --noEmit` (script is `tsc` in `backend/package.json` — invoked as `npx tsc --noEmit` to match the exact Phase-3 command). Splitting isolates native/sqlite-heavy backend type errors from the frontend build and lets each job cache its own `node_modules`.

### Caching
- Root job uses `actions/setup-node` with `cache: npm` (reads `package-lock.json`).
- Backend job sets `cache-dependency-path: backend/package.json` so its lockfile is used for the cache key.

### Install strategy
- `npm ci` is preferred when a `package-lock.json` exists (reproducible, fast). If the repo has no committed lockfile, fall back to `npm install`. (Confirm during implementation; the spec mandates no new deps.)

### No new dependencies
- The workflow references only `actions/checkout@v4` and `actions/setup-node@v4` (standard GitHub Actions, not npm packages). All checked commands already exist in `package.json` (`lint`/`test`/`test:legacy`/`build`) and `backend/package.json` (`build` = `tsc`).

### Map to AGENTS.md Phase 3: Check
| Phase-3 command | Job | Step |
|---|---|---|
| `npx tsc --noEmit` | web | Type check (frontend) |
| `npx vitest run` | web | Vitest |
| `npm run test:legacy` | web | Legacy tests |
| `npm run build` | web | Build |
| `cd backend && npx tsc --noEmit` | backend | Type check (backend) |

## Real file references
- `package.json:66` — `lint`: `npx tsc --noEmit`
- `package.json:67` — `test`: `npx vitest run`
- `package.json:68` — `test:legacy`: `npx tsx --test tests/presets.test.ts tests/types.test.ts`
- `package.json:71` — `build`: `expo export --platform web --clear && node scripts/post-export.js`
- `backend/package.json:7` — `build`: `tsc` (CI uses `npx tsc --noEmit` to match Phase-3)
