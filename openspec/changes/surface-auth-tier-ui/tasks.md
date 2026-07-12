# Tasks — Surface Auth Tier in UI

## 1. Extend AuthContext
- [ ] Import `PlanTier` / `TierLimits` shapes (mirror from `backend/src/middleware/tierGuard.ts`).
- [ ] Extend `AuthContextType` (`src/context/AuthContext.tsx:14`) with `tier: PlanTier` and `tierLimits: TierLimits`.
- [ ] Add `tier`/`tierLimits` state defaulting to `FREE` (`maxTracks:4, maxProjects:3, maxStemExports:2, canUseTriton:false, canUseJuno:true, canExportVideo:false, canPublishToFeed:false, canCreateRemixes:false`).
- [ ] Add `fetchTier()` that calls `GET /api/tier` and stores `{ tier, limits }`; fail-closed to FREE defaults on error.
- [ ] Call `fetchTier()` in the restored-visitor branch, after `getSession()`, and after `convertVisitorToAccount` succeeds.
- [ ] Include `tier`/`tierLimits` in the `AuthContext.Provider` value.

## 2. Render plan in account screen
- [ ] In `app/tabs/account.tsx`, read `tier`/`tierLimits` from `useAuth()`.
- [ ] Insert a `<Divider label="Plano" />` + `Badge` showing the tier and read-only limit rows (maxProjects, maxTracks, canExportVideo).

## 3. Render plan in settings screen
- [ ] In `app/tabs/settings.tsx`, read `tier`/`tierLimits` from `useAuth()`.
- [ ] Add a "Plano" divider with the tier label + a short limits summary using `card-elevated` rows.

## 4. Gate remix action
- [ ] In `app/tabs/index.tsx`, read `tierLimits` from `useAuth()`.
- [ ] Guard `handleRemix` (~line 316): if `!tierLimits.canCreateRemixes`, show an upgrade `Alert` and return early.

## 5. Tests (new stub)
- [ ] Add `src/context/AuthContext.test.tsx` (or extend existing auth test file): `AuthProvider` defaults to `FREE` + `canCreateRemixes:false`; `tierLimits` updates after a mocked `/api/tier` fetch returns `TIER1_LIVE`.

## 6. Spec update
- [ ] Add "Tier Surfacing (UI)" requirement + test requirement to `openspec/specs/auth/spec.md`.

## Verification
- [ ] `npx tsc --noEmit` clean
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `npx vitest run` passes
