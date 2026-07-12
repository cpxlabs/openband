# Proposal — Accessibility Pass

## Context
OpenBand is a React Native (Expo) app rendered on web via `react-native-web`. `react-native-web` maps `accessibilityRole` / `accessibilityLabel` / `accessibilityState` / `aria-*` directly to HTML `role` / `aria-*` attributes, so the app is *already* partly exposed to assistive tech (AT). However, the codebase was authored without an accessibility (a11y) contract: roles and labels are inconsistent, many custom controls (notably `OneKnob`, the studio transport, and Canvas-based widgets) have **no** role or label, and there is no visible focus style. This blocks WCAG 2.1 AA conformance and makes the product unusable for keyboard-only and screen-reader users — a hard requirement for institutional, educational, and public-sector adoption.

## Problem Description
- No OpenSpec a11y spec exists (`openspec/specs/*` has none — audit of `specs/` directory confirmed absence).
- `Button`, `Sidebar`, `Loading`, `Card`, `ProgressBar`, `MiniPlayer` set roles/labels, but the majority of interactive components do not (e.g. `OneKnob`, `Metronome`, `PianoRoll`, `PedalRack`, `Looper`, `Tuner`, `PluginRack`, `PluginEditor`, `AutomationLane`, `TrackGroupManager`, `ChordTrack`, `Sampler`, `Synth`, `Mastering*`).
- `OneKnob.tsx` (`src/components/OneKnob.tsx`) is a drag-only `Pressable` with no `accessibilityRole`, no `accessibilityLabel`/`accessibilityValue`, and **no keyboard operability** — a WCAG 2.1.1 (Keyboard) failure.
- Studio transport (`app/studio/[id].tsx` lines ~1457–1509) is a set of `Pressable` buttons (play/record/stop/seek/undo/redo) with no `accessibilityRole`/`accessibilityLabel` and no documented keyboard path beyond the `CommandPalette` shortcuts.
- `global.css` has no `:focus-visible` style, so keyboard focus is invisible — WCAG 2.4.7 (Focus Visible) failure.
- No tests assert the presence of `accessibilityLabel`/`role`, so regressions are silent.

## Objectives
- Define an **accessibility contract** for the design-system components so every interactive element exposes a correct `accessibilityRole`, `accessibilityLabel`, and (for valued controls) `accessibilityValue`.
- Make the two highest-risk custom controls keyboard-operable: `OneKnob` (arrow-key increment/decrement) and the studio transport (explicit `accessibilityRole="button"` + `accessibilityLabel`, plus retained keyboard shortcuts).
- Add a visible **focus-visible** style to `global.css` and apply it to focusable design-system components (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `input-field`, `OneKnob`, sidebar items).
- Add an `accessibility` OpenSpec spec capturing requirements + the contract, and extend component tests to assert `accessibilityLabel`/`role` on key components.
- Scope **M** (Medium): core design-system components + studio transport + knobs + focus styles + tests. Non-core Canvas widgets (PianoRoll, PedalRack, AutomationLane internals) get the role/label contract but are explicitly enumerated as follow-ups where deep keyboard interaction is out of scope.

## Out of Scope
- Full WCAG audit / VPAT certification (this is the foundational pass).
- Deep keyboard rework of every Canvas widget (PianoRoll note editing, AutomationLane point dragging) — these receive role/label and are tracked as follow-ups.
- Screen-reader announcements for live audio meters (LufsMeter, VuMeter) beyond a `progressbar` role + value.
- Native (iOS/Android)TalkBack/VoiceOver tuning beyond what `react-native-web` already provides for web.
- Changes to `AGENTS.md` workflow (documented separately if needed).
