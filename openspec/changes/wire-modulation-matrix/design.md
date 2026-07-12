# Design — Wire Modulation Matrix into Plugin Param Path

## File / Requirement Mapping

| Change | File | Symbols |
|---|---|---|
| Mod assignment UI | `src/components/PluginEditor.tsx` | extend `ParamRow` (`:25`) to show a "mod" affordance listing `getModSources()` targets; call `addModRoute(source, target, amount)` |
| Target derivation | `src/components/PluginEditor.tsx` | map each `ParamRow` param id to a `ModTarget` (e.g. `volume`→`"volume"`, `cutoff`→`"filter.cutoff"`, `gain`→`"amp.gain"`, `detune`→`"osc1.detune"`); default `null` when no valid target |
| Apply modulation | `src/components/PluginEditor.tsx` | when rendering a value, `effective = baseValue + computeModulation(target, ctx) * range` (clamped) during transport |
| OneKnob binding | `src/components/OneKnob.tsx` | optional: allow a `modTarget?: ModTarget` prop; if set, `onChange` value is offset by `computeModulation(modTarget, ctx)` |
| Test | `tests/lib*.test.tsx` | `computeModulation` determinism; `addModRoute`/`removeModRoute` round-trip |
| Spec update | `openspec/specs/automation-routing/spec.md` | add "Modulation Wired into Plugin Params" requirement |

## Reusing the Engine
`src/lib/modulationMatrix.ts` already provides everything needed:
- `getModSources(): ModSource[]` (`:144`), `getModTargets(): ModTarget[]` (`:148`).
- `addModRoute(source, target, amount?, bipolar?)` (`:160`) → `ModRoute` (enabled by default).
- `removeModRoute(routeId)` (`:181`), `updateModRoute(routeId, updates)` (`:188`).
- `computeModulation(target, context)` (`:247`) — `context = { time, noteOnTime?, gate?, velocity?, noteNumber? }`; returns `[-1, 1]`.
- `setMacroValue(index, value)` (`:200`) for macro-driven control.

No changes to the math. The fix is purely integration: surface assignment + apply during playback.

## PluginEditor Integration
1. **Target mapping** — add a helper inside `PluginEditor.tsx`:
   ```
   function paramToTarget(paramId: string): ModTarget | null {
     if (paramId === "volume" || paramId === "gain") return "volume"; // gain maps to amp.gain where applicable
     if (paramId.includes("cutoff")) return "filter.cutoff";
     if (paramId.includes("resonance")) return "filter.resonance";
     if (paramId.includes("detune")) return "osc1.detune";
     if (paramId === "pan") return "pan.position";
     return null;
   }
   ```
2. **Assignment UI** — extend `ParamRow` with an optional `modTarget?: ModTarget` and a small "⊕" button that opens a source picker (the 11 `getModSources()`). Selecting a source calls `addModRoute(source, modTarget, 0.5)`. Show a tiny indicator when the param has an active route (check `getModulationState().routes`).
3. **Apply during playback** — `PluginEditor` already receives `bpm`. Pass a `playing`/`contextTime` prop (or read a studio-provided clock) so the displayed value becomes:
   ```
   const mod = modTarget ? computeModulation(modTarget, { time: ctxTime, velocity, noteNumber }) : 0;
   const displayed = clamp(baseValue + mod * (max - min), min, max);
   ```
   The `onParamChange` still writes the user's base value; the modulation offset is applied only for visualization/playback, mirroring how `automationEngine` interpolates.

## OneKnob Integration (optional)
Add `modTarget?: ModTarget` to `OneKnobProps`. When present, the committed `onChange` value is offset by `computeModulation(modTarget, ctx)` before being reported. This lets the one-knob processors (drive/width/etc.) be modulated too.

## Test
Add to `tests/lib*.test.tsx` (or `tests/modulation.test.tsx`):
- `computeModulation("volume", { time: 0 })` with `macro1=1`, route `macro1→volume` amount 0.5 unipolar → `0.5` (deterministic, matches existing spec scenario).
- `addModRoute("lfo1", "volume", 0.5)` then `removeModRoute(id)` leaves `getModulationState().routes` without it.

## Spec Update
Add to `openspec/specs/automation-routing/spec.md` a requirement "Modulation Wired into Plugin Params":

> The `PluginEditor` (and optionally `OneKnob`) MUST let a user assign any `ModSource` to a parameter whose `ModTarget` is supported, and MUST apply `computeModulation` to the parameter value during playback so assigned modulators move the value.

And a test requirement: `computeModulation` determinism + route add/remove round-trip in the plugin path.
