# Tasks — Wire Modulation Matrix into Plugin Param Path

## 1. PluginEditor integration
- [ ] In `src/components/PluginEditor.tsx`, import `getModSources`, `getModTargets`, `addModRoute`, `removeModRoute`, `getModulationState`, `computeModulation`, `type ModSource`, `type ModTarget` from `src/lib/modulationMatrix`.
- [ ] Add `paramToTarget(paramId)` helper mapping plugin params to `ModTarget | null`.
- [ ] Extend `ParamRow` with optional `modTarget?: ModTarget` + a "⊕" source-picker button that calls `addModRoute`/`removeModRoute`.
- [ ] Show an active-route indicator (from `getModulationState().routes`).

## 2. Apply modulation at playback
- [ ] Accept a playback context (`contextTime`, `velocity?`, `noteNumber?`) into `PluginEditor` (and `ParamRow`) — reuse the studio clock/transport.
- [ ] When `modTarget` is set, display `clamp(baseValue + computeModulation(modTarget, ctx) * (max-min), min, max)`; `onParamChange` keeps writing the user base value.

## 3. OneKnob binding (optional)
- [ ] Add `modTarget?: ModTarget` to `OneKnobProps` (`src/components/OneKnob.tsx`); offset reported `onChange` value by `computeModulation(modTarget, ctx)` when present.

## 4. Tests
- [ ] Add `tests/modulation.test.tsx` (or extend `tests/lib*.test.tsx`): `computeModulation` determinism for a macro route; `addModRoute`/`removeModRoute` round-trip.
- [ ] Add a `PluginEditor` test asserting a mod route can be assigned to a param with a valid `ModTarget`.

## 5. Spec update
- [ ] Add "Modulation Wired into Plugin Params" requirement + test requirement to `openspec/specs/automation-routing/spec.md`.

## Verification
- [ ] `npx tsc --noEmit` clean
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `npx vitest run` passes
