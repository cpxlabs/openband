# Proposal: Wire Modulation Matrix

## Context

The OpenBand modulation matrix (`src/lib/modulationMatrix.ts`) defines 11 mod
sources and 11 mod targets, plus `computeModulation`, `applyModulation`,
`computeModulatedParams`, and `getModulatedValue`. The `PluginEditor` and
`OneKnob` components already expose a "MOD" affordance that creates routes into
the matrix.

However, **modulation is not actually applied at playback time**. Within the
plugin render path (`src/lib/pluginChain.ts` → `applySinglePlugin`), only three
params (`filter.frequency`, `filter.Q`, `utility.gain/pan`, and stereo widener
`width`) call `applyModulation` via `modulateParam`. Every other plugin param
that maps to a mod target (distortion `tone`, reverb `mix`/`size`/`damping`,
delay, compressor, limiter, EQ bands, etc.) is rendered with its static base
value. As a result a user can assign an LFO to e.g. reverb mix and see the
route in the UI, but hear no change during playback.

## Objectives

1. Guarantee `getModSources`/`getModTargets` each return exactly 11 entries
   (already true, but assert in tests).
2. Guarantee `computeModulation` returns a scaled + clamped `[-1, 1]` value and
   `applyModulation` offsets a base value within `[min, max]` and clamps (already
   true — add explicit tests).
3. Wire `applyModulation` into the render path so **every** routed plugin param
   is modulated using the live transport clock (`opts.modTime` / duration), not
   just the hand-picked few.
4. Provide a small helper that, given the current transport time, returns the
   fully modulated param values for a plugin (already exists:
   `computeModulatedParams`).
5. Ensure `PluginEditor`'s "MOD" affordance lets a user assign a modulation
   route per supported param (already implemented — keep it, add a thin
   description block to make the route assignment explicit).

## Out of scope

- Changing the modulation engine animation loop / LFO generation math.
- Changing `src/lib/types.ts`, `tsconfig.json`, `package.json`, tests setup.
- Real-time per-block audio-rate modulation inside the offline render (the
  existing ramp approach in `scheduleModulated` is retained and extended).
