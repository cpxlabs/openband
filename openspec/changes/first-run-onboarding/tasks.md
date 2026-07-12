# Tasks — First-Run Onboarding

Docs-only change spec (no source edits landed in this change). Implementation checklist recorded for the Apply phase.

## 1. First-run flag + persistence (implemented in `src/lib/projectStore.ts`)
- [x] Add `getOnboardingState(): { completed: boolean }` reading key `openband_onboarding` (mirror `STORAGE_PREFIX`/`INDEX_KEY` pattern, `src/lib/projectStore.ts:40-41`).
- [x] Add `setOnboardingCompleted(): void` writing `{ completed: true }` under `openband_onboarding` (use `getStorage()` so web + bridge fallback both persist).
- [x] Guard against undefined storage (reuse the `storageWarned`/`getStorage()` path, `src/lib/projectStore.ts:90-103`).

## 2. Auth-aware flag (implemented in `src/context/AuthContext.tsx`)
- [x] In `AuthProvider` init (alongside visitor-session load), read `getOnboardingState()` and seed a `hasOnboarded` state (default `false`).
- [x] Expose `hasOnboarded` and `completeOnboarding()` in `AuthContextType` and the default context value.
- [x] `completeOnboarding()` calls `setOnboardingCompleted()` then sets `hasOnboarded = true`.

## 3. Onboarding flow UI (implemented in `src/components/OnboardingFlow.tsx` new)
- [x] Create `OnboardingFlow` with `visible`, `onClose`, `onCreate`, `onStartFromScratch` props; `testID="onboarding-flow"` forwarded.
- [x] Welcome step: branded `Card` + `Button` ("Começar") reusing design-system components.
- [x] Reuse `<NewProject visible onClose onCreate onStartFromScratch />` (`src/components/NewProject.tsx`).
- [x] Welcome "Começar" toggles `NewProject` open; `onCreate` forwards to `props.onCreate` with `fromOnboarding=1` appended by the Feed handler, then `onClose()`.

## 4. Feed gate (implemented in `app/tabs/index.tsx`)
- [x] Consume `useAuth()` `hasOnboarded` in `Feed`.
- [x] When `!hasOnboarded`, render `<OnboardingFlow>` overlay (z-50); keep the existing `!hasProjects` welcome banner as fallback once onboarded.
- [x] Pass `handleOnboardingCreate` as `onCreate`, appending `&fromOnboarding=1` to the `router.push` query via `handleCreateProject(config, true)`.

## 5. Studio tooltips (implemented in `app/studio/[id].tsx`)
- [x] Add `fromOnboarding?: string` to `useLocalSearchParams` destructure.
- [x] Add local `tooltipDismissed` state; when `fromOnboarding === "1"` and not dismissed, render a coachmark overlay on the transport/play + record controls.
- [x] Dismiss button ("Começar a produzir") calls `completeOnboarding()` (via `useAuth`) and hides coachmarks. No coachmarks when `fromOnboarding !== "1"`.

## 6. Tests (new → `tests/onboarding.test.tsx`)
- [x] First-run: with `openband_onboarding` unset, `getOnboardingState().completed === false`; `OnboardingFlow` is visible on first render for a fresh visitor.
- [x] Completion persists: after `setOnboardingCompleted()`, `getOnboardingState().completed === true`; `AuthProvider` shows `hasOnboarded === true` and `completeOnboarding()` persists the flag.
- [x] Navigation: `onCreate` from `OnboardingFlow` produces a `/studio/<id>` route containing `fromOnboarding=1`.

## 7. Verification
- [x] `npx tsc --noEmit` clean for all changed source files (pre-existing `typeof` parse error in the full `src/components/index.ts` graph is unrelated to this change — `components.test.tsx` fails identically without these edits).
- [ ] `cd backend && npx tsc --noEmit` clean
- [x] `npx vitest run tests/onboarding.test.tsx` — 8/8 pass.
- [ ] `npm run build` succeeds
