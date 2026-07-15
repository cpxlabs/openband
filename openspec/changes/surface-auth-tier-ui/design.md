# Design — Surface Auth Tier in UI

## File / Requirement Mapping

| Change | File | Symbols |
|---|---|---|
| Add tier helpers | `src/lib/tier.ts` | new file: `PlanTier`, `TierLimits`, `TIER_LIMITS`, `FREE_TIER_LIMITS`, `getTierLimits(tier)`, `checkTierAccess(tier, feature)` (mirrors `backend/src/middleware/tierGuard.ts`) |
| Add tier types + state | `src/context/AuthContext.tsx` | `AuthContextType` gains `tier`, `tierLimits`; imports `PlanTier`, `TierLimits`, `FREE_TIER_LIMITS` from `../lib/tier` (re-exported for API compat) |
| Fetch tier on load | `src/context/AuthContext.tsx` | new `fetchTier()` called inside the existing `useEffect` session-resolution path and after `convertVisitorToAccount` |
| Render plan badge | `app/tabs/account.tsx` | uses `tier`/`tierLimits` from `useAuth()`; shows badge + maxProjects/maxTracks/export limits |
| Render plan info | `app/tabs/settings.tsx` | new "Plano" divider with `tier` label + limits summary |
| Gate remix action | `app/tabs/index.tsx` | `handleRemix` checks `tierLimits.canCreateRemixes`; FREE tier shows upgrade `Alert` and returns early |
| Spec update | `openspec/specs/auth/spec.md` | add "Tier Surfacing (UI)" requirement + test requirement |

## Shared Types
The `PlanTier` and `TierLimits` shapes already live in `backend/src/middleware/tierGuard.ts` (`PlanTier = "FREE" | "TIER1_LIVE" | "TIER2_STUDIO"`, `TierLimits { maxTracks, maxProjects, maxStemExports, canUseTriton, canUseJuno, canExportVideo, canPublishToFeed, canCreateRemixes }`). Define these once in `src/lib/tier.ts` (single source of truth), export `getTierLimits(tier)` and `checkTierAccess(tier, feature)` (returning the boolean value of a `TierLimits` key, defaulting to `true` for numeric limits and `false` for unknown). `src/context/AuthContext.tsx` imports `PlanTier`, `TierLimits`, and `FREE_TIER_LIMITS` from `../lib/tier` (and re-exports `PlanTier`/`TierLimits` to preserve its public API) and default state to:

```
tier: "FREE",
tierLimits: FREE_TIER_LIMITS,
```

## Fetch Flow
`GET /api/tier` is served by `backend/src/routes/tier.ts` at `/user/tier` and reads the tier from the `x-user-tier` header, defaulting to `FREE`. Because the frontend does not yet send that header, the response will always be `FREE` until tier assignment is wired into auth. The client fetch must therefore tolerate the header default and still store the returned `{ tier, limits }`. On success, `setTier(data.tier)` and `setTierLimits(data.limits)`. On failure, keep the `FREE` defaults (fail-closed, matching backend).

The fetch is invoked:
1. After `supabase.auth.getSession()` resolves (both success and the `catch` path still default to FREE),
2. Inside the restored-visitor branch (visitors are always FREE),
3. After a successful `convertVisitorToAccount`.

## UI Rendering
- **account.tsx**: insert a new `<Divider label="Plano" />` block in the profile section showing a `Badge` with `tier` text, plus two read-only rows (`Projetos: tierLimits.maxProjects`, `Trilhas: tierLimits.maxTracks`, `Exportar vídeo: tierLimits.canExportVideo ? "Sim" : "Não"`). Use existing `Badge`/`Divider` components from `src/components`.
- **settings.tsx**: add a "Plano" divider near "Informações" showing the `tier` label and a short limits summary. Reuse `card-elevated` rows like the existing version rows.

## Gating Remix
In `app/tabs/index.tsx`, `handleRemix` (line ~316) currently always navigates to `/studio/...?...&remix`. Add an early guard:

```
if (!tierLimits.canCreateRemixes) {
  Alert.alert("Plano necessário", "Remix requer o plano Live ou Studio. Faça upgrade para continuar.");
  return;
}
```

Pull `tierLimits` from `useAuth()` at the top of the screen.

## Spec Update
Add to `openspec/specs/auth/spec.md` under Requirements a new "Tier Surfacing (UI)" requirement:

> The frontend `AuthContext` MUST expose the active `tier` and `tierLimits` and render them in the account/settings screens, and MUST gate the remix/publish action when `canCreateRemixes`/`canPublishToFeed` is false.

And a test requirement: `AuthProvider` defaults to `FREE` tier with `canCreateRemixes: false` and updates `tierLimits` after a successful `/api/tier` fetch.
