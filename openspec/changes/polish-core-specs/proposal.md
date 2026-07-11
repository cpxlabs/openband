# Proposal — Polish Core Specs

## Context
The `audio-plugins` and `mastering-plugins` OpenSpec files were scaffolded from a high-level brief but contain gaps between what the spec describes and what the code must guarantee. The `project-starter` subsystem (the 3-step New Project flow) has no dedicated spec at all. This change closes those gaps by (1) rewriting the two existing specs with corrected real file paths and newly specified implementation targets, and (2) adding a `project-starter` spec.

## Problem Description
- `audio-plugins/spec.md` never required a `"Default"` preset per type, plugin serialization round-trip, per-plugin A/B state, or reported latency — all of which the runtime now needs for stable transport and collaboration.
- `mastering-plugins/spec.md` lacks a chain-validation rule even though `MASTERING_CHAIN_PRESETS` #4, #6, #9 currently ship a double terminal limiter (`limiter`→`truePeakLimiter`) that must be rejected.
- `project-starter` has no spec despite being a core onboarding surface (`NewProject.tsx` + `projectTemplates.ts`).

## Objectives
- Rewrite `openspec/specs/audio-plugins/spec.md` with corrected paths (`src/lib/types.ts`, `src/lib/pluginChain.ts`) and 4 new requirements: Default Preset Per Type, Plugin Preset Serialization, Per-Plugin A/B Compare, Reported Latency.
- Rewrite `openspec/specs/mastering-plugins/spec.md` with a Chain Validation requirement and the 3 affected presets documented for update.
- Create `openspec/specs/project-starter/spec.md` covering config inputs, track generation, start-from-scratch, and deterministic defaults.
- Provide tests: `src/lib/projectStarter.test.ts`, `src/lib/plugins/presetSerial.test.ts`, `src/lib/mastering.test.ts`.

## Out of Scope
- No new plugin DSP behavior; only schema/serialization/latency metadata and validation gates.
- UI rewrites of `NewProject.tsx` / `PluginEditor.tsx` beyond what the spec requires.
- Backend changes (covered by separate `backend-api` spec area, still TODO).
