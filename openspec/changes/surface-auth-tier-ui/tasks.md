# Tasks — Surface Auth Tier in UI

## 1. Add frontend tier helpers (`src/lib/tier.ts`)
- [x] Create `src/lib/tier.ts` exporting `PlanTier`, `TierLimits`, `FREE_TIER_LIMITS`, `TIER_LIMITS`, `getTierLimits(tier)`, `checkTierAccess(tier, feature)`.
- [x] `getTierLimits("FREE")` returns `canExportVideo:false`; `getTierLimits("TIER1_LIVE")` returns `canExportVideo:true` (and `canCreateRemixes:true`, `canPublishToFeed:true`).
- [x] `checkTierAccess(tier, feature)` returns the boolean limit value for that feature (defaults to `true` for numeric limits).

## 2. Extend AuthContext
- [x] Import `PlanTier` / `TierLimits` / `FREE_TIER_LIMITS` from `../lib/tier` (re-export `PlanTier`/`TierLimits` for API compat).
- [x] Extend `AuthContextType` with `tier: PlanTier` and `tierLimits: TierLimits`.
- [x] Add `tier`/`tierLimits` state defaulting to `FREE` (`maxTracks:4, maxProjects:3, maxStemExports:2, canUseTriton:false, canUseJuno:true, canExportVideo:false, canPublishToFeed:false, canCreateRemixes:false`).
- [x] Add `fetchTier()` that calls `/api/user/tier` and stores `{ tier, limits }`; fail-closed to FREE defaults on error.
- [x] Call `fetchTier()` in the restored-visitor branch, after `getSession()`, and after `convertVisitorToAccount` succeeds.
- [x] Include `tier`/`tierLimits` in the `AuthContext.Provider` value.

## 2. Render plan in account screen
- [x] In `app/tabs/account.tsx`, read `tier`/`tierLimits` from `useAuth()`.
- [x] Insert a `<Divider label="Plano" />` + `Badge` showing the tier and read-only limit rows (maxProjects, maxTracks, canExportVideo).

## 3. Render plan in settings screen
- [x] In `app/tabs/settings.tsx`, read `tier`/`tierLimits` from `useAuth()`.
- [x] Add a "Plano" divider with the tier label + a short limits summary using `card-elevated` rows.

## 4. Gate remix action
- [x] In `app/tabs/index.tsx`, read `tier` from `useAuth()`.
- [x] Guard `handleRemix` via `checkTierAccess(tier, "canCreateRemixes")`; if false, show an upgrade `Alert` and return early.

## 5. Tests
- [x] `tests/tier.test.ts` covers `getTierLimits`/`checkTierAccess` (FREE disables `canExportVideo`; TIER1_LIVE enables it).
- [x] `tests/authTier.test.tsx` covers `AuthProvider` defaults to `FREE` + `canCreateRemixes:false`; `tierLimits` updates after a mocked `/api/user/tier` fetch returns `TIER1_LIVE`.

## 6. Spec update
- [ ] Add "Tier Surfacing (UI)" requirement + test requirement to `openspec/specs/auth/spec.md` (forbidden file — skipped per scope constraints; documented here for the orchestrator).

## Verification
- [x] `npx tsc --noEmit` clean (no errors in scope files)
- [ ] `cd backend && npx tsc --noEmit` clean
- [x] `npx vitest run` passes for all auth/screen/tier suites (8/8 tier tests, 113/113 auth-related)
