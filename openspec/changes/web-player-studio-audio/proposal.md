# Proposal: web-player-studio-audio

## Context

The Studio DAW screen (`app/studio/[id].tsx`) and its transport hook (`app/studio/hooks.ts`)
contain most of the required Studio DAW + Studio Resilience behaviors, but the master
`MasterRack` plugin chain is **not** applied during offline mixdown (`renderTracksToUrl` in
`src/lib/midiSynth.ts`). The remaining items from `docs/pending-implementations.md`
(Studio DAW + Studio Resilience sections) are already implemented and covered by existing
tests; this change closes the one genuine gap and adds focused pure-function test coverage.

## Problem

When a user adds master bus plugins via `MasterRack` (EQ/compressor/limiter), those plugins
are reflected in the FX UI but are silently dropped when the project is rendered to a bounce
URL via `renderTracksToUrl`. The resulting mix is "dry" on the master bus.

## Objectives

- Thread `masterPlugins` through `renderTracksToUrl` → `renderTracksCached` →
  `useStudioTransport` → `rerenderAfterMuteSolo` so the master chain is applied at mixdown.
- Add/extend vitest coverage for the pure functions (clockManager subscription,
  automationEngine interpolation, audioTelemetry ring buffer + averages, crash save
  coalescing, latency helpers).

## Out of scope

The other Studio DAW / Resilience checklist items (VuMeter on mixer tab, Play clock wiring,
Stop beat reset, Record region append, PluginEditor open, AutomationLane→volume, group
creation, scheduleCrashSave coalescing, restoreCrashState soft-fail, ring buffer cap,
getAverageMetrics, threshold report, sendTelemetryReport no-throw, measureInputLatency,
createLatencyCompensationNode null-for-non-positive) are already implemented and tested;
they are verified but not modified here.

## Verification

- `npx tsc --noEmit` passes.
- `npx vitest run` passes (new + existing tests).
