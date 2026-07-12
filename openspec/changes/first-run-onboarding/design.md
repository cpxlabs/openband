# Design — First-Run Onboarding

## File / Requirement Mapping

| Concern | File | Symbols / Notes |
|---|---|---|
| First-run flag read/write | `src/lib/projectStore.ts` | `getOnboardingState(): { completed: boolean }`, `setOnboardingCompleted()` (new) — stored under `openband_onboarding` key alongside existing `openband_*` keys |
| Auth-aware flag (fallback) | `src/context/AuthContext.tsx` | expose `hasOnboarded` + `completeOnboarding()` via context; backed by the same `projectStore` helper so web/localStorage + bridge stay in sync |
| Onboarding flow UI | `src/components/OnboardingFlow.tsx` (new) | wraps `NewProject`; renders Welcome step; forwards `onCreate` to the route handler |
| Feed gate | `app/tabs/index.tsx` | on mount, if `!hasOnboarded`, render `<OnboardingFlow>` over the Feed instead of (or above) the existing welcome banner |
| Studio tooltips | `app/studio/[id].tsx` | on mount, if `?fromOnboarding=1`, show short coachmarks for transport (play) + record controls; dismiss writes completion flag |
| Navigation | reuse `app/tabs/index.tsx:334-358` | `router.push("/studio/<id>?title&genre&key&bpm&numBars&timeSignature&mood&fromOnboarding=1")` |

## Behavior Details

### Persisted first-run flag
- Key: `openband_onboarding` in `localStorage` (web) / bridge storage (desktop), mirroring the `STORAGE_PREFIX`/`INDEX_KEY` pattern in `src/lib/projectStore.ts`.
- `getOnboardingState()` returns `{ completed: boolean }`; defaults to `{ completed: false }`.
- `setOnboardingCompleted()` writes `{ completed: true }`.
- `AuthContext` reads this on init (same place it loads the visitor session, `src/context/AuthContext.tsx:116-130`) and exposes `hasOnboarded`; `completeOnboarding()` calls the `projectStore` helper and flips context state. This keeps the flag stable across reloads and consistent with the existing `isVisitor`/visitor-session lifecycle.

### Onboarding flow (`OnboardingFlow.tsx`)
- A `visible`/`onClose` wrapper rendered by the Feed when `!hasOnboarded`.
- Step 1 — Welcome: a short branded card ("Bem-vindo ao OpenBand", one-line value prop, `Começar` button). Reuses existing `Card` / `Button` / `PageHeader` design-system components.
- Step 2 — Reuse `NewProject` (`src/components/NewProject.tsx`): pass `visible`, `onClose`, `onCreate`. The Welcome "Começar" opens `NewProject`. `onStartFromScratch` is forwarded too so the scratch path is onboarding-eligible.
- On `onCreate(config)`: call the **existing** Feed `handleCreateProject` logic (`app/tabs/index.tsx:334`) but append `fromOnboarding=1` to the query string, then `onClose()`. Do **not** duplicate project-creation — defer entirely to `setupProjectStarter` (invoked by the studio) and the Feed's routing.
- TestID `testID="onboarding-flow"` for tests.

### Studio tooltips (coachmarks)
- In `app/studio/[id].tsx`, read `fromOnboarding` from `useLocalSearchParams` (same block as lines 145-167; add `fromOnboarding?: string`).
- When `fromOnboarding === "1"` and `!tooltipDismissed` (local component state), render 2-3 lightweight coachmark overlays pointing at:
  - **Transport / Play** — the play button in the transport bar.
  - **Record** — the record control (uses `useAudioRecorder` already imported, line 191).
  - (Optional) **Add track / tool** — the `tool` quick action.
- Coachmarks use `View` + `Text` + `Pressable` (no new design-system component required; reuse `Card` styling). A `Começar a produzir` button dismisses them and calls `completeOnboarding()`.
- If the studio is reached without `fromOnboarding=1`, no coachmarks render (existing behavior unchanged).

### Gate in Feed
- Replace the unconditional `hasProjects` welcome banner logic (`app/tabs/index.tsx:513-542`) with: if `!hasOnboarded`, show `<OnboardingFlow>` (highest z-index overlay). Once onboarding completes (`hasOnboarded` true), fall back to the existing `!hasProjects` banner. This guarantees onboarding is seen once even if `hasProjects` becomes true via the studio route.

## Data Flow
```
App launch → AuthContext loads visitor session + reads getOnboardingState() → hasOnboarded
Feed mount → if !hasOnboarded → <OnboardingFlow/>
OnboardingFlow: Welcome → <NewProject onCreate={handleCreateProject(+fromOnboarding=1)} />
Feed handleCreateProject → router.push("/studio/<id>?...&fromOnboarding=1")
Studio mount → useLocalSearchParams.fromOnboarding === "1" → coachmarks → dismiss → completeOnboarding()
completeOnboarding() → setOnboardingCompleted() (projectStore) + AuthContext.hasOnboarded = true
Next launch → hasOnboarded true → onboarding never shows again
```
