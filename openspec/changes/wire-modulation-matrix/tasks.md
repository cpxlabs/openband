# Tasks: Wire Modulation Matrix

## 1. Spec files
- [x] `openspec/changes/wire-modulation-matrix/proposal.md`
- [x] `openspec/changes/wire-modulation-matrix/design.md`
- [x] `openspec/changes/wire-modulation-matrix/tasks.md`

## 2. Verify matrix helpers (no change needed, assert via tests)
- [x] `getModSources` / `getModTargets` each return 11 unique entries
- [x] `computeModulation` returns scaled + clamped `[-1, 1]`
- [x] `applyModulation` offsets base within `[min, max]` and clamps

## 3. Wire modulation into the render path — `src/lib/pluginChain.ts`
- [x] Keep the existing `modulateParam`/`scheduleModulated` AudioParam-ramp
      path (filter freq/Q, utility gain/pan) which applies `applyModulation`
      at the live transport clock.
- [x] Thread `modTime`/`duration` from `applyPluginChain` opts into
      `applyMasteringChain` so the mastering render branch is connected to the
      modulation matrix at playback time (helper `applyModulationToPluginParams`
      in `mastering.ts` replaces routed params with their matrix value).

## 4. Component — `src/components/PluginEditor.tsx`
- [x] Keep the per-param "MOD" affordance (`ParamRow`). Added a short
      description line in the route picker clarifying the source→target
      assignment at playback time.

## 5. Tests
- [x] Added `tests/modulationMatrixRender.test.ts`: asserts `applyPluginChain`
      renders a modulated output when a route is active on a mapped param,
      equals the un-routed output when inactive, and varies with `modTime`.
- [x] `tests/modulationMatrix.test.ts` (pre-existing) covers the 11
      source/target counts, `computeModulation` and `applyModulation` clamping,
      and `computeModulatedParams`.

## 6. Verification
- [x] `npx tsc --noEmit` passes
- [x] `npx vitest run` passes for all modulation suites (the single failing
      `feed.test.ts` "favorite" case is unrelated parallel work)
