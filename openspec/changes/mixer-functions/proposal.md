# Mixer Functions: Tests, Fixes, and Improvements

## Context

The mixer subsystem is the core of OpenBand's audio production workflow, comprising 18+ components and 9 library modules spanning bus routing, automation, effects processing, mastering, and hardware I/O. While the recent comprehensive test suite added broad coverage, the mixer-specific components and library modules remain shallowly tested or untested in production behavior.

## Problem

1. **`automix.ts`** — 0 direct tests despite 413 lines of genre-based mixing logic (ROLE_PROFILES, 6 PRESETS, `classifyTrack`, `autoMix`). Currently only mocked in studio tests.
2. **`audioNodeGraph.ts`** — 1 trivial "is defined" test for 114 lines of plugin chain management.
3. **`MixManager`** — Only 3 tests (render, expand, onLoad). Missing snapshot CRUD, A/B comparison, deep clone verification.
4. **`VisualEQ`** — Only "label" and "preset" tests. Missing frequency band interaction, drag handle positioning, response curve rendering.
5. **`LufsMeter`** — Only 2 basic tests. Missing metering target switching, decay timing, integrated LUFS accumulation.
6. **`BounceDialog`** — Only format switching tests. Missing export format bounds, progress states, bit-depth validation.
7. **`OneKnob`** — Missing all 8 knob type-specific value-to-parameter mapping tests.
8. **`PluginEditor`** — 4 sub-editors tested (Compressor, Reverb, Delay, StereoImager), 14+ untested.
9. **`Patchbay`** — Missing route creation/deletion state management.
10. **`hardwareIO.ts`** — Missing patchbay route CRUD tests (`createPatchRoute`, `removePatchRoute`, `getRoutesForTrack`).
11. **`busRouter.ts`** — Missing `buildBusRouteGraph` audio graph construction tests.
12. **`automationEngine.ts`** — Missing `applyAutomationToParam` Web Audio scheduling tests.

## Objectives

1. Achieve deep behavioral test coverage for all mixer components and library modules
2. Fix any logic bugs discovered during testing
3. Ensure edge cases (empty states, boundary values, concurrent operations) are handled

## Scope

- `tests/components5.test.tsx` — Mixer component deep tests (MixManager, VisualEQ, LufsMeter, BounceDialog, OneKnob, MiniMastering, MasteringVersionManager, Patchbay, PluginEditor sub-editors, AutomationLane, TrackGroupManager)
- `tests/lib7.test.ts` — Mixer library deep tests (automix, audioNodeGraph, hardwareIO patchbay, busRouter graph, automationEngine scheduling)
- Source fixes only for bugs discovered during testing
