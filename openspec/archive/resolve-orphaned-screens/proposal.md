# Proposal — Resolve Orphaned Screens (Creative Modes Hub)

## Context
OpenBand ships 13 route screens under `app/` that represent distinct creative
workflows but are absent from the app's primary navigation surface (tabs bar,
`Sidebar`, and `CommandPalette`). They are currently reachable **only** through
the experimental 3D `virtual-studio` screen, which performs a single dynamic
`router.push(selectedFurniture.route)` for a hardcoded furniture list. Because
that 3D surface is not part of the standard shell, the modes are effectively
undiscoverable to real users.

## Problem Description
Confirmed by reading the code (see `design.md` for the exact trace):

- The 13 screens are: `acoustics`, `autotune`, `beatmaker`, `cover-jam`,
  `dj-stage`, `live-room`, `lofi-tape`, `mixing-console`, `spatial-audio`,
  `stem-collider`, `synth-lab`, `vocal-booth`, `explorer`.
- None of them are referenced by a literal `router.push`/`router.replace` in
  app or component code (grep returned zero matches). The only inbound path is
  the dynamic `router.push` inside `app/virtual-studio.tsx` (line 384).
- `explorer` is the exception: it IS a live tab — `app/tabs/explorer.tsx` (5
  lines) re-exports `app/explorer.tsx`, and both `app/tabs/_layout.tsx` and
  `src/components/Sidebar.tsx` register it. So `explorer` is the least
  "orphaned" of the set.
- The remaining 12 are reachable only by first entering the 3D studio, which
  uses Three.js loaded from a CDN and is an experimental surface — not a
  reliable discovery path.
- `openspec/specs/routing-navigation.md` does not list any of these 13 routes,
  so the routing spec is already out of date relative to the code.

This is a classic dead-code-vs-product-surface decision: either (A) ship a real
navigation entry point that surfaces these modes, or (B) prune the screens that
have no real implementation.

## Objectives
- Decide and implement ONE strategy for the 13 screens.
- If hub: provide a single, consistent, primary entry point listing all 13
  modes, each `router.push`-ing to its existing route.
- If hub: register that entry point in the tabs shell and `Sidebar`, and
  register each mode as a `CommandPalette` command.
- If hub: bring `openspec/specs/routing-navigation.md` back in sync with the
  real route graph.
- Add a test proving the hub lists all modes and that navigation reaches a
  target screen.

## Decision / Recommendation
**RECOMMEND OPTION A — Build a "Creative Modes" hub.** Rationale:

1. The screens are real, substantive implementations (287–695 lines each, with
   genuine UI and audio logic), not empty stubs. Pruning them would delete
   shipped product value.
2. The fix is small and additive: a hub screen + two registration edits
   (`tabs/_layout.tsx`, `Sidebar.tsx`) + command registration. No config files
   (`tailwind.config.js`, `metro.config.js`, `tsconfig.json`, `babel.config.js`)
   need to change — Expo Router is file-based, so `app/tabs/modes.tsx` appears
   as a tab automatically.
3. `explorer` is already a tab; the hub will link to it too (route
   `/tabs/explorer`) for a single consistent surface, with no duplication of
   its implementation.
4. Option B (prune) is retained as a fallback only if a mode is found to be a
   non-functional stub during implementation; the spec treats all 13 as keep.

## Out of Scope
- Rewriting the 3D `virtual-studio` screen or its room-routing mechanism.
- Any audio DSP / screen-internal feature work inside the 13 modes.
- Auth, backend, or Supabase changes.
- Modifying build/config files (not required for file-based routing).
