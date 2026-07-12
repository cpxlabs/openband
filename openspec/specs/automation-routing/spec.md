# Automation & Routing

## Overview
OpenBand drives parameter automation and signal routing through three cooperating libraries. `automationEngine.ts` interpolates `AutomationPoint` values (linear/exponential) and converts beat positions to seconds. `busRouter.ts` builds a sub-mix bus graph (tracks → buses → master) and auto-assigns tracks to default buses by name. `audioGraphValidation.ts` provides DFS-based DAG cycle detection (`wouldCreateCycle`, `validateGraph`, reachability). `modulationMatrix.ts` routes 11 modulation sources to 11 targets with LFO/envelope/macro generators and `computeModulation`.

## Implementation Notes
`interpolateAutomationValue(points, time)` binary-searches the sorted schedule and linearly or exponentially interpolates between adjacent points (`exponential` requires both endpoints `> 0`). `buildAutomationSchedule(points, bpm)` multiplies beat positions by `60 / bpm`. `buildBusRouteGraph(ctx, tracks, buses, masterGain)` creates per-bus `inputGain`→`outputGain` chains feeding `masterGain` and connects each non-muted track's `trackGain`→`panNode`→(bus or master); `createDefaultBuses` returns drums/instruments/vocals buses and `assignTrackToBus` heuristically maps a track name to one. `audioGraphValidation` builds an `AudioGraph` (`nodes: Map<id, {type, outputs}>`) where buses and tracks output to `master`, then runs a 3-color DFS (`validateGraph`) detecting back-edges; `wouldCreateCycle(graph, from, to)` tentatively adds the edge and re-validates. `modulationMatrix` keeps module-level `modulationState`; `computeModulation(target, context)` sums each enabled route's source value (LFO via `generateLfo`, envelope via `generateEnvelope`, macro/velocity/note/random) scaled by `amount` (unipolar or bipolar), clamped to `[-1, 1]`.

## Requirements

### Requirement: Automation Interpolation
The system MUST interpolate an automation lane value at an arbitrary time using the curve declared between the surrounding points: linear by default, exponential when both endpoints are positive.

#### Scenario: Linear interpolation at midpoint
- **Given** points `[{time:0,value:0,linear}, {time:1,value:1,linear}]`
- **When** `interpolateAutomationValue(points, 0.5)` is called
- **Then** the result is `0.5`

#### Scenario: Exponential interpolation
- **Given** points `[{time:0,value:1,exponential}, {time:1,value:4,exponential}]`
- **When** `interpolateAutomationValue(points, 0.5)` is called
- **Then** the result is `2` (`1 * 4^0.5`)

### Requirement: Beat→Time Schedule Conversion
The system MUST convert automation beat positions into seconds using `60 / bpm` via `buildAutomationSchedule`.

#### Scenario: Convert beats to seconds at 120 BPM
- **Given** a point at `time: 2` (beats) and `bpm: 120`
- **When** `buildAutomationSchedule` runs
- **Then** the resulting `time` is `1.0` seconds

### Requirement: Sub-Mix Bus Graph Builder
The system MUST build a routing graph connecting tracks to buses and buses to master. `createDefaultBuses` MUST return drums/instruments/vocals buses; `assignTrackToBus` MUST map a track name to a bus id by keyword (or `null`).

#### Scenario: Default buses and name-based assignment
- **Given** `createDefaultBuses()`
- **When** `assignTrackToBus("Kick Drum")` is called
- **Then** it returns `"bus-drums"`
- **And** `assignTrackToBus("Lead Vocal")` returns `"bus-vocals"`, `assignTrackToBus("Synth Pad")` returns `"bus-instruments"`

### Requirement: DAG Cycle Detection
The system MUST detect feedback loops in the routing graph. `validateGraph` returns `valid:false` with a `cyclePath` on a back-edge; `wouldCreateCycle(graph, from, to)` MUST return `valid:false` when adding `from→to` would close a cycle, and `valid:true` for an acyclic addition.

#### Scenario: Acyclic addition accepted
- **Given** a graph where track `A` → bus `X` → `master`
- **When** `wouldCreateCycle(graph, "A", "X")` is evaluated
- **Then** the result is `valid: true`

#### Scenario: Back-edge rejected
- **Given** a graph where track `A` → bus `X` → `master`
- **When** `wouldCreateCycle(graph, "X", "A")` is evaluated
- **Then** the result is `valid: false` with a `cyclePath`

### Requirement: Modulation Matrix
The system MUST expose `getModSources` (11 sources: lfo1/2, env1/2, macro1-4, velocity, noteNumber, random) and `getModTargets` (11 targets). `computeModulation(target, context)` MUST sum each enabled route's source contribution scaled by `amount`, bipolar or unipolar, clamped to `[-1, 1]`.

#### Scenario: Macro modulation contribution
- **Given** `macro1` set to `1` and a route `macro1 → volume` (`amount 0.5`, unipolar)
- **When** `computeModulation("volume", { time: 0 })` is called
- **Then** the result equals `0.5` (`(1*0.5+0.5)*0.5`)
- **And** the result is within `[-1, 1]`

### Requirement: Modulation Wired into Plugin Params
The `PluginEditor` (and `OneKnob`) MUST let a user assign any `ModSource` to a parameter whose `ModTarget` is supported: each `ParamRow` exposes a "MOD" affordance that opens a source picker (the 11 `getModSources()`), and selecting a source calls `addModRoute(source, target, 0.5)`. The editor MUST show an active-route indicator when routes target the param. When playback is active (`playing` + a transport `contextTime`), the displayed parameter value MUST be derived through `applyModulation(target, baseValue, min, max, context)` so assigned modulators move the value; `onParamChange` still writes the user's base value.

#### Scenario: Assign a source to a param
- **Given** a `PluginEditor` open on a plugin exposing a `gain` param (target `amp.gain`)
- **When** the "MOD" affordance is opened and `macro1` is selected
- **Then** `getModulationState().routes` contains a route `{ source: "macro1", target: "amp.gain" }`

#### Scenario: Playback-time value derivation
- **Given** `macro1` set to `1` and a route `macro1 → volume` (`amount 0.5`)
- **When** the editor renders with `playing=true` and a base value of `0` in range `[-24, 24]` at `contextTime: 0`
- **Then** `computeModulation("volume", { time: 0 })` equals `0.5` and the displayed value equals `24` (`0 + 0.5 * (24 - (-24))`)

#### Scenario: Follow-up — audio-path hookup (not yet wired)
- **Given** modulation routes are stored in the `modulationMatrix` module singleton
- **When** the audio engine processes a track/plugin chain
- **Then** (FUTURE) `applyPluginChain` applies `applyModulation(target, baseValue, min, max, context)` per routed param using the live transport clock — this hookup is tracked as a follow-up and is not yet connected to the offline `pluginChain` render.

## Test Requirements (Vitest)
- [ ] `interpolateAutomationValue` returns midpoint for linear points at t=0.5
- [ ] `interpolateAutomationValue` returns `value0 * (value1/value0)^frac` for exponential points
- [ ] `buildAutomationSchedule` converts beat positions to seconds at the given bpm
- [ ] `createDefaultBuses` returns 3 buses; `assignTrackToBus` maps known names and returns `null` otherwise
- [ ] `wouldCreateCycle` returns `valid:true` for an acyclic addition and `valid:false` for a back-edge
- [ ] `getModSources` and `getModTargets` each return 11 entries
- [ ] `computeModulation` returns the expected scaled contribution for a macro route, clamped to `[-1, 1]`
- [ ] `applyModulation` offsets a base param value by the modulation amount within `[min, max]`
- [ ] `PluginEditor` exposes a "MOD" affordance per supported param and assigns a route on source selection
