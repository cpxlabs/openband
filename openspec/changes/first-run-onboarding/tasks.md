# Tasks — First-Run Onboarding

Docs-only change spec (no source edits landed in this change). Implementation checklist recorded for the Apply phase.

## 1. First-run flag + persistence (docs → `src/lib/projectStore.ts`)
- [ ] Add `getOnboardingState(): { completed: boolean }` reading key `openband_onboarding` (mirror `STORAGE_PREFIX`/`INDEX_KEY` pattern, `src/lib/projectStore.ts:40-41`).
- [ ] Add `setOnboardingCompleted(): void` writing `{ completed: true }` under `openband_onboarding` (use `getStorage()` so web + bridge fallback both persist).
- [ ] Guard against undefined storage (reuse the `storageWarned`/`getStorage()` path, `src/lib/projectStore.ts:92-103`).

## 2. Auth-aware flag (docs → `src/context/AuthContext.tsx`)
- [ ] In `AuthProvider` init (alongside visitor-session load, `src/context/AuthContext.tsx:116-130`), read `getOnboardingState()` and seed a `hasOnboarded` state (default `false`).
- [ ] Expose `hasOnboarded` and `completeOnboarding()` in `AuthContextType` (`src/context/AuthContext.tsx:14-23`) and the default context value (`:98-107`).
- [ ] `completeOnboarding()` calls `setOnboardingCompleted()` then sets `hasOnboarded = true`.

## 3. Onboarding flow UI (docs → `src/components/OnboardingFlow.tsx` new)
- [ ] Create `OnboardingFlow` with `visible`, `onClose`, `onCreate` props; `testID="onboarding-flow"`.
- [ ] Welcome step: branded `Card` + `Button` ("Começar") reusing design-system components.
- [ ] Reuse `<NewProject visible onClose onCreate onStartFromScratch />` (`src/components/NewProject.tsx:28`).
- [ ] Welcome "Começar" toggles `NewProject` open; `onCreate` forwards to `props.onCreate` (Feed's `handleCreateProject`) with `fromOnboarding=1` appended, then `onClose()`.

## 4. Feed gate (docs → `app/tabs/index.tsx`)
- [ ] Consume `useAuth()` `hasOnboarded` in `Feed` (import from `../../src/context/AuthContext`).
- [ ] When `!hasOnboarded`, render `<OnboardingFlow>` overlay (z-50) instead of the `!hasProjects` welcome banner (`:513-542`); keep the existing banner as fallback once onboarded.
- [ ] Pass `handleCreateProject` as `onCreate`, appending `&fromOnboarding=1` to the `router.push` query (`app/tabs/index.tsx:334-358`).

## 5. Studio tooltips (docs → `app/studio/[id].tsx`)
- [ ] Add `fromOnboarding?: string` to `useLocalSearchParams` destructure (`:155-167`).
- [ ] Add local `tooltipDismissed` state; when `fromOnboarding === "1"` and not dismissed, render 2-3 coachmark overlays on transport/play + record controls (`useAudioRecorder` already imported, `:191`).
- [ ] Dismiss button ("Começar a produzir") calls `completeOnboarding()` (via `useAuth`) and hides coachmarks. No coachmarks when `fromOnboarding !== "1"` (existing behavior unchanged).

## 6. Tests (new → `tests/onboarding.test.tsx` or `src/...`)
- [ ] First-run: with `openband_onboarding` unset, `getOnboardingState().completed === false`; `OnboardingFlow` is visible on Feed mount for a fresh visitor.
- [ ] Completion persists: after `setOnboardingCompleted()`, reload/second render shows `hasOnboarded === true` and `OnboardingFlow` no longer renders.
- [ ] Navigation: `onCreate` from `OnboardingFlow` produces a `/studio/<id>` route containing `fromOnboarding=1`.

## 7. Verification
- [ ] `npx tsc --noEmit` clean
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `npx vitest run` passes (incl. new onboarding test)
- [ ] `npm run build` succeeds
