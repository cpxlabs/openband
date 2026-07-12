# Proposal — Surface Auth Tier in UI

## Context
The backend enforces subscription tiers through `backend/src/routes/tier.ts` and `backend/src/middleware/tierGuard.ts`. `getTierLimits(tier)` returns a `TierLimits` object (maxTracks, maxProjects, maxStemExports, canUseTriton, canUseJuno, canExportVideo, canPublishToFeed, canCreateRemixes) and `requireFeature`/`requireTier` gate protected endpoints, returning `403` when a tier lacks a feature. However, `src/context/AuthContext.tsx` exposes only `{ session, user, loading, isVisitor, visitorId, signOut, signInAsVisitor, convertVisitorToAccount }` — there is **no tier or plan data** in context. As a result the gating the backend enforces is completely invisible in the UI: a visitor or FREE-tier user has no idea which actions (publish, remix, video export, Triton) are restricted or why they fail.

## Problem Description
- Users cannot see their current plan/tier anywhere in the app.
- Gated actions (publish to feed, create remixes) surface as silent server `403`s with no client-side explanation or upgrade path.
- The `auth` spec already notes "the frontend `AuthContext` does NOT yet expose tier to the UI" — this change closes that gap.

## Objectives
- Extend `AuthContextType` with `tier: PlanTier` and `tierLimits: TierLimits`, defaulting to `FREE` for visitors and authenticated users (until the real tier is fetched).
- Fetch the plan from `GET /api/tier` (`backend/src/routes/tier.ts`, endpoint `/user/tier`) on session load and store it in context.
- Render a plan badge + key limits in `app/tabs/account.tsx` and `app/tabs/settings.tsx`.
- Gate the remix action in `app/tabs/index.tsx` (the only current publish/remix surface) using `tierLimits.canCreateRemixes`, showing an upgrade prompt for FREE tier.
- Update `openspec/specs/auth/spec.md` to require tier surfacing in the UI.

## Scope
**M** — small/medium: context extension + one fetch + two screens + one gating point + spec update. No new backend endpoints (reuse `/user/tier`).

## Out of Scope
- Adding new backend tiers or changing `TierLimits` values.
- Building a full plan-upgrade / billing flow (only an informational prompt).
- Wiring every individual tier-gated backend route on the client (only the visible publish/remix action for now).
