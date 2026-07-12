# Proposal — First-Run Onboarding

## Context
OpenBand is a browser/desktop DAW. New users currently land on the Feed (`app/tabs/index.tsx`), which shows a welcome banner and a `+ Novo Projeto` button that opens `NewProject` (the 3-step genre→mood→details wizard in `src/components/NewProject.tsx`). There is no guided first-run flow: nothing connects a brand-new visitor to actually creating and opening their first project, and nothing points them at the transport/record controls once they reach the studio. For a DAW this is a high drop-off risk — the most valuable "aha" moment (hearing your first generated song in the studio) is unreachable without deliberate guidance.

The building blocks already exist:
- `NewProject` collects the full config and emits `onCreate(config)` (`src/components/NewProject.tsx:88`).
- `setupProjectStarter(config)` in `src/lib/projectStarter.ts:47` turns that config into a `ProjectStarterResult` (id + generated tracks).
- The Feed already wires `NewProject.onCreate` → `router.push("/studio/<id>?...")` (`app/tabs/index.tsx:334-358`); the studio (`app/studio/[id].tsx`) already parses that query string (genre, key, bpm, numBars, timeSignature, mood, scratch) to seed a project.

## Problem Description
- No persisted "first run" flag exists anywhere, so we cannot tell a returning user from a brand-new one. `AuthContext` only persists the visitor session (`src/context/AuthContext.tsx`); `projectStore` persists projects but not onboarding state.
- No tutorial/tooltip layer exists (`grep` for `onboarding|coachmark|tooltip` returns only an unrelated comment in `VisualEQ.tsx:428`), so the transport (play), record, and other DAW controls are undiscoverable to first-timers.
- The Feed welcome banner (`app/tabs/index.tsx:513-542`) is a passive CTA, not a guided flow, and disappears once `hasProjects` is true even if the user never actually created anything.

## Objectives
- Add a **persisted first-run flag** so onboarding shows exactly once per visitor/account.
- Add a **gated onboarding flow** that guides a new user: Welcome → reuse `NewProject` to pick genre/mood → opens the studio with the generated project (`setupProjectStarter` + existing Feed→studio route) → shows a few short tooltips for transport/record inside the studio.
- Reuse existing surfaces (`NewProject`, `setupProjectStarter`, the Feed→studio navigation) rather than build new project-creation logic.
- Persist completion in `projectStore` (localStorage) with a fallback hook in `AuthContext`, so it survives reloads and is shared across the web/desktop bridge.

## Scope
- **In scope:** first-run flag + gate; a thin `OnboardingFlow` wrapper reusing `NewProject`; navigation to studio with the generated project; a small studio tooltip/coachmark layer for transport/record; persistence helpers; tests.
- **Out of scope:** redesigning `NewProject` itself; changing `projectStarter.ts`; changing the Feed welcome banner beyond gating; auth/account changes; backend changes.

## Out of Scope / Non-goals
- No multi-step product tour beyond Welcome + NewProject + 2-3 studio tooltips.
- No "skip and never show again" settings UI beyond the natural completion gate (the flag itself is the gate).
