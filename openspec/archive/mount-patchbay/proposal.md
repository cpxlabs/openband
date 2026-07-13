# Proposal — Mount Patchbay in Studio Routing Panel

## Context
`src/components/Patchbay.tsx` is fully built and exported from `src/components/index.ts`, but it is **never mounted anywhere** in the app — a grep across `app/` returns zero imports. It is a drag-and-drop matrix that lets users map hardware input channels (`HardwareChannel`) to DAW tracks, backed by `src/lib/hardwareIO.ts` (`enumerateAudioDevices`, `getHardwareChannels`, `createPatchRoute`, `removePatchRoute`, `getPatchbayState`). The `hardware-io` spec documents the enumeration + CRUD + output-selection, and the component already calls those functions directly (`Patchbay.tsx:33-74`), so the data layer is ready — it just needs a home.

The studio already mounts a sibling hardware component, `OutputSelector` (`app/studio/[id].tsx:2892`), toggled from a toolbar button (`setShowOutputSelector`, line 1573). There is no equivalent entry point for the patchbay.

## Problem Description
- A complete, designed feature (`Patchbay`) is invisible to users because it has no mount site.
- Hardware I/O routing (input channel → track) is unreachable from the UI even though the backend/IO layer supports it.
- The `hardware-io` spec's matrix-routing capability is effectively unexercised by the app shell.

## Objectives
- Mount `Patchbay` in the studio, gated behind a new toolbar button in the same transport/toolbar area that currently toggles `OutputSelector`.
- Feed it the live `trackIds` (the studio's track list) and wire `onRouteCreated`/`onRouteRemoved` to the existing `hardwareIO` CRUD so routes persist in `patchState` (already done inside the component, but surface callbacks for studio-side bookkeeping/telemetry).
- Add/extend a test that the patchbay renders when mounted and reflects created routes.
- Update `openspec/specs/hardware-io/spec.md` to require the patchbay to be mounted in the studio.

## Scope
**S/M** — small-to-medium: a toolbar toggle + a mounted component + one test + spec edit. No changes to `hardwareIO.ts` or `Patchbay.tsx` internals (they already query their own data).

## Out of Scope
- Changing device-enumeration behavior (native no-ops remain no-ops).
- Adding audio actually routed from hardware into tracks at playback (matrix persistence/UI only; signal wiring is a separate audio-engine task).
- Output device selection rework (already handled by `OutputSelector`).
