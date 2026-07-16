# Proposal: Mixer Console 4-VU-Meter Groups

## Context
The `mixer-console` spec requires: "Console renders 4 VU meter **groups** via
`createVUMeter`" (Test Requirement). The current 3D console
(`app/mixing-console.tsx`) renders 16 per-channel strips + a master section, but
the VU meters are 4 standalone, unlabeled meters (lines 454-458) with no grouping
or bus-color identity. This change makes the 4 VU meters into 4 visually distinct,
labeled **groups** whose colors match the default bus palette from
`createDefaultBuses` (`src/lib/busRouter.ts`): Drums `#ff6482`, Instruments
`#5ac8fa`, Vocals `#ffcc00` (a 4th group uses the accent `#00e5ff`).

This closes the last PARTIAL item in `docs/pending-implementations.md`.

## Problem Description
`app/mixing-console.tsx:454-458` loops 4 times calling `createVUMeter` with no
grouping, no labels, and no bus-color association. The spec's grouping/identity
requirement is unmet.

## Objectives
1. Render 4 VU meter **groups** above the desk, each labeled (DRUMS / BASS / KEYS
   / VOICE) with its bus color.
2. Each group is a `THREE.Group` (so it is a distinct child — satisfies "4 VU
   meter Groups are added to the scene").
3. Group colors are consistent with `createDefaultBuses` palette (drums `#ff6482`,
   instruments `#5ac8fa`, vocals `#ffcc00`, and a 4th accent `#00e5ff`).
4. Keep the existing per-group VU meter texture/animation working.

## Non-Goals
- Wiring live audio levels into the 3D meters (they remain animated decoratively,
  as today).
- Changing channel-strip geometry or the master section.

## Approach
- Add a `VU_GROUPS` constant: `[{ label: "DRUMS", color: 0xff6482 }, { label:
  "BASS", color: 0x5ac8fa }, { label: "KEYS", color: 0xffcc00 }, { label:
  "VOICE", color: 0x00e5ff }]` (hex ints; drums/instruments/vocals mirror the bus
  palette; 4th reuses the app accent).
- Add `createVUMeterGroup(THREE, x, y, z, label, color)` that builds a
  `THREE.Group` containing: a `createVUMeter` meter, a colored label sprite
  (reuse the sprite/CanvasTexture pattern already in the file) showing `label`,
  and a small colored base bar in `color`. Return the group.
- Replace the loop at lines 454-458 with a loop over `VU_GROUPS` calling
  `createVUMeterGroup`, spaced across the desk width.
- Keep `createVUMeter` (single meter) as a helper used inside the group builder.

## Test Requirements (add to `mixer-console/spec.md`)
- [x] Console renders 4 VU meter **groups** (distinct `THREE.Group`s) above the desk.
- [x] Each VU group has a label and a color consistent with the default bus palette.

## Verification
1. `npx tsc --noEmit`
2. `cd backend && npx tsc --noEmit`
3. `npx vitest run` (no regressions)
4. `npm run test:legacy`
5. `npm run build`
