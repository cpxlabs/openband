# Proposal — Wire Modulation Matrix into Plugin Param Path

## Context
`src/lib/modulationMatrix.ts` implements a full 11-source × 11-target modulation engine: `ModSource` (lfo1/2, env1/2, macro1-4, velocity, noteNumber, random), `ModTarget` (filter.cutoff, amp.gain, osc1.detune, volume, etc.), `ModRoute`, and `computeModulation(target, context)` which sums each enabled route's source contribution scaled by `amount` (unipolar/bipolar), clamped to `[-1, 1]`. The `automation-routing` spec's "Modulation Matrix" requirement already mandates this surface and `computeModulation` behavior.

Despite being complete, **`modulationMatrix.ts` has zero importers** — nothing in the app drives modulation. The two obvious integration points are `src/components/PluginEditor.tsx` (the per-plugin deep parameter editor with `ParamRow` sliders and `onParamChange`) and `src/components/OneKnob.tsx` (single-knob control). Neither lets a user assign an LFO/envelope/macro to a param, nor do they apply `computeModulation` to the rendered value during playback.

## Problem Description
- The modulation engine is dead code: no UI assigns sources to targets, and `computeModulation` is never called.
- Users have no way to add movement (LFO wobble, envelope sweep, macro control) to plugin parameters.
- The "Modulation Matrix" requirement in `automation-routing` is unmet on the client.

## Objectives
- Add a modulation-assignment UI inside `PluginEditor` so any `ParamRow` can bind a `ModSource` to its param (target derived from the plugin param path).
- During playback, drive the effective parameter value through `computeModulation` so assigned modulators actually move the value.
- Add a test for `computeModulation` determinism (already partially spec'd) plus assignment add/remove.
- Update `openspec/specs/automation-routing/spec.md` to require the studio/plugin integration.

## Scope
**M** — medium: UI affordance in `PluginEditor`/`OneKnob` + a playback-time value derivation using `computeModulation`. No change to `modulationMatrix.ts` core math (reused as-is).

## Out of Scope
- Rewriting LFO/envelope/macro generators.
- Persisting modulation routes in project serialization (state lives in `modulationMatrix` module singleton for now; can be serialized later).
- Building a dedicated 11×11 matrix grid view (assignment happens inline per-param; the matrix math already supports it).
