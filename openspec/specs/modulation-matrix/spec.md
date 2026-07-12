# Modulation Matrix

## Overview
OpenBand provides an LFO / envelope / macro **modulation matrix** that routes modulation sources to plugin and track parameter targets at audio-block resolution. Sources and targets are fixed enumerations (`ModSource`, `ModTarget` in `src/lib/modulationMatrix.ts:3`, `:16`), and assignments are stored as `ModRoute` entries (`src/lib/modulationMatrix.ts:29`). `PluginEditor.tsx` (`src/components/PluginEditor.tsx`) is where a user assigns a source to a parameter target and where the live modulated value is displayed during playback.

This spec is the canonical feature spec for the modulation matrix. The implementation plan lives in `openspec/changes/wire-modulation-matrix/` (no standalone spec previously existed).

## Implementation Notes
The matrix core is `src/lib/modulationMatrix.ts`. Eleven sources (`MOD_SOURCES` at `:132`: `lfo1`, `lfo2`, `env1`, `env2`, `macro1`–`macro4`, `velocity`, `noteNumber`, `random`) and eleven targets (`MOD_TARGETS` at `:138`: `filter.cutoff`, `filter.resonance`, `amp.gain`, `osc1.detune`, `osc2.detune`, `osc1.pitch`, `osc2.pitch`, `lfo1.rate`, `lfo2.rate`, `pan.position`, `volume`) form the 11×11 grid.

`computeModulation(target, context)` (`:247`) sums every enabled route for that target, evaluating the source (`generateLfo` `:81`, `generateEnvelope` `:106`, or a macro/velocity/note/random lookup) and scaling by `amount`, respecting `bipolar`. `applyModulation(target, baseValue, min, max, context)` (`:348`) maps the normalized `-1..1` modulation offset onto the param's `min..max` range. `addModRoute`/`removeModRoute`/`updateModRoute` (`:160`, `:181`, `:188`) mutate module-level `modulationState.routes`.

In `src/components/PluginEditor.tsx`, `paramToTarget(paramId)` (`:36`) maps a plugin param id to a `ModTarget`; `ParamRow` (`:61`) renders a `MOD●` badge (testID `mod-<paramId>`) when routes are active and a source picker that calls `addModRoute`/`removeModRoute`. `OneKnob.tsx` (`:26`) accepts `modTarget` + `modContext` and folds `computeModulation` into the dragged value.

## Requirements

### Requirement: Source → Target Assignment
The system MUST let a user assign any `ModSource` to any `ModTarget` via `addModRoute(source, target, amount, bipolar)` (`src/lib/modulationMatrix.ts:160`), persisting the route in `modulationState.routes` with a generated `id`, `enabled: true`.

#### Scenario: Assign LFO1 to filter cutoff
- **Given** `PluginEditor` `ParamRow` for a param mapping to `filter.cutoff`
- **When** the user picks `lfo1` from the modulation picker
- **Then** `addModRoute("lfo1", "filter.cutoff", 0.5, false)` creates a route
- **And** the `MOD●` badge shows an active route count

#### Scenario: Clear routes for a target
- **Given** active routes against `filter.cutoff`
- **When** the user taps "clear"
- **Then** each route is removed via `removeModRoute`
- **And** the badge returns to inactive `MOD`

### Requirement: 11 × 11 Source/Target Matrix
The system MUST expose exactly the 11 enumerated sources (`MOD_SOURCES` `:132`) and 11 enumerated targets (`MOD_TARGETS` `:138`), forming the full modulation grid; any source MAY drive any target.

#### Scenario: All sources reachable for a target
- **Given** the modulation picker for any target
- **When** `getModSources()` is enumerated
- **Then** it returns all 11 sources
- **And** `getModTargets()` returns all 11 targets

### Requirement: Compute Modulation At A Time/Context
The system MUST compute the summed modulation amount for a target at a given `context` (`time`, optional `noteOnTime`/`gate`/`velocity`/`noteNumber`) via `computeModulation` (`:247`), returning a clamped value in `[-1, 1]`.

#### Scenario: LFO modulates while playing
- **Given** a route `lfo1 → amp.gain` with `amount` 0.5 at `time = 0.25`
- **When** `computeModulation("amp.gain", { time: 0.25 })` is called
- **Then** the result reflects the sine LFO output scaled by `0.5`, clamped to `[-1, 1]`

#### Scenario: Bipolar vs unipolar scaling
- **Given** a unipolar route (bipolar `false`) with a `0..1` source
- **When** `computeModulation` evaluates it
- **Then** the contribution is `(source * 0.5 + 0.5) * amount`
- **And** a bipolar route contributes `source * amount`

### Requirement: Apply Modulation To Param Range
The system MUST map a modulation offset onto a parameter's `min..max` via `applyModulation(target, baseValue, min, max, context)` (`:348`), so the live displayed/edited value equals `baseValue + normalized * (max - min)`, clamped.

#### Scenario: Modulated value stays in range
- **Given** `baseValue = 50`, `min = 0`, `max = 100`, and `computeModulation` returns `0.5` (`+50%` of range)
- **When** `applyModulation` is called
- **Then** the returned value is `100`
- **And** a `-1` modulation returns `0`

### Requirement: Visual Modulation Indicator In PluginEditor
`PluginEditor` MUST show a visual indicator (the `MOD●` badge, testID `mod-<paramId>`) on any parameter that has an active enabled route, and MUST display the live modulated value (via `applyModulation`) instead of the static base value while `playing`.

#### Scenario: Badge active when routed
- **Given** a route exists for the param's target
- **When** `ParamRow` renders
- **Then** the badge text is `MOD●` styled with the accent color
- **And** `testID="mod-<paramId>"` is present

#### Scenario: Live value shown during playback
- **Given** `mod.playing` is `true` and a route targets the param
- **When** `ParamRow` computes `displayed`
- **Then** `applyModulation` is used with `mod.contextTime`
- **And** the readout reflects the modulated value, not `value`

## Test Requirements (Vitest)
- [ ] `getModSources()` returns 11 sources; `getModTargets()` returns 11 targets
- [ ] `addModRoute` appends an enabled route with generated id
- [ ] `removeModRoute` removes only the matching route
- [ ] `computeModulation` sums enabled routes and clamps to `[-1, 1]`
- [ ] `computeModulation` skips disabled routes and non-matching targets
- [ ] bipolar vs unipolar scaling math is correct
- [ ] `applyModulation` maps offset into `min..max` and clamps
- [ ] `paramToTarget` maps known plugin param ids to correct `ModTarget`
- [ ] LFO waveform output matches `generateLfo` for sine/triangle/square
- [ ] `PluginEditor` `MOD●` badge testID `mod-<paramId>` present when routes active
