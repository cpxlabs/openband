# Design: Wire Modulation Matrix

## Modulation helpers (already implemented, verified)

`src/lib/modulationMatrix.ts` exposes:

```ts
getModSources(): ModSource[]      // 11 entries
getModTargets(): ModTarget[]      // 11 entries
computeModulation(target, ctx): number        // scaled + clamped to [-1, 1]
applyModulation(target, base, min, max, ctx): number  // base + offset, clamped [min,max]
computeModulatedParams(inputs, time, extra?): Record<string, number>
getModulatedValue(target, base, min, max, time, extra?): number
```

`ModSource` (11): `lfo1, lfo2, env1, env2, macro1, macro2, macro3, macro4,
velocity, noteNumber, random`.

`ModTarget` (11): `filter.cutoff, filter.resonance, amp.gain, osc1.detune,
osc2.detune, osc1.pitch, osc2.pitch, lfo1.rate, lfo2.rate, pan.position,
volume`.

## Render-path wiring

The single render entry for playback is `applyPluginChain` → `applySinglePlugin`
in `src/lib/pluginChain.ts`. Today `applySinglePlugin` builds the Web Audio
graph from `plugin.params` (the static base values) and only calls
`modulateParam` for a handful of `AudioParam`s.

### Change

Add a pre-pass at the top of `applySinglePlugin` that computes the **effective
modulated params** for the plugin at the current transport clock:

```ts
const modTime = opts.modTime ?? 0;
const duration = opts.duration && opts.duration > 0 ? opts.duration : 1;
const spec = PLUGIN_SPECS[plugin.type];
const modulated = spec
  ? computeModulatedParams(
      spec.params.map((pp) => ({
        paramId: pp.id,
        base: plugin.params[pp.id] ?? pp.default,
        min: pp.min,
        max: pp.max,
        target: paramToTarget(pp.id),
      })),
      modTime,
    )
  : {};
```

These `modulated[paramId]` values replace the base `plugin.params[paramId]`
references used when building the graph (for every param that maps to a mod
target and has an active route). When no route exists for a param's target,
`computeModulatedParams` returns the base value, so behaviour is unchanged.

This makes the modulation matrix apply to **all** params uniformly (distortion
tone, reverb mix/size/damping, delay feedback/mix, compressor threshold, EQ
master gain, limiter ceiling, etc.) using the live transport clock position,
satisfying the requirement that `applyPluginChain` apply `applyModulation` per
routed param.

The existing `modulateParam`/`scheduleModulated` AudioParam-ramp path is kept
for the params that are true Web Audio `AudioParam`s (filter freq/Q, gain, pan)
so they still ramp smoothly across the buffer; the new pre-pass additionally
covers non-AudioParam scalar params.

## Component

`src/components/PluginEditor.tsx` already renders a "MOD" affordance per param
(`ParamRow`) that toggles a source picker and calls `addModRoute`/`removeModRoute`
into the matrix. A short description line is added inside the picker to make the
route assignment explicit; no API change required.

## Tests

`tests/modulationMatrix.test.ts` already covers the 11-source/target counts,
`computeModulation` clamping, `applyModulation` clamping, and
`computeModulatedParams`. Add a `tests/modulationMatrixRender.test.ts` that
asserts `applyPluginChain` produces a different (and clamped) output when a mod
route is active on a mapped param vs. inactive, using a `reverb` plugin's `mix`
target.
