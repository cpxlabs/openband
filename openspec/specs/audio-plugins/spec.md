# Audio Plugins

## Overview
OpenBand provides a unified audio plugin architecture with **19 effect types** applicable to tracks, send buses, and the master chain. Plugins are implemented as Web Audio API node graphs on web and native processors on desktop/mobile via the Expo/Electron bridge (`OpenBandNative`). All plugins conform to a single `Plugin` shape (`src/lib/types.ts:130`) and are automatable.

## Implementation Notes
The 19 plugin types are **not** split into per-file modules. Their param schemas and presets are centralized in `src/lib/types.ts` (`PluginType` union at `src/lib/types.ts:94`, `PluginTypeSpec` at `src/lib/types.ts:125`, `PLUGIN_SPECS` at `src/lib/types.ts:217`, `clampParam` at `src/lib/types.ts:1635`, `applyPluginPreset` at `src/lib/types.ts:1656`). The Web Audio DSP graph for every type is built by `applyPluginChain` / `buildPluginGraph` in `src/lib/pluginChain.ts` (`buildPluginGraph` at `:84`, `applyPluginChain` at `:88`). The mastering-family types (eq, compressor, limiter, truePeakLimiter, multibandCompressor, stereoImager, tapeSaturator, deesser) delegate to `applyMasteringChain` in `src/lib/mastering.ts:130`. (`src/lib/pedalboardDsp.ts` is separate — it handles guitar-pedal DSP for `PedalRack`, not these track/bus/master plugins.)

## Requirements

### Requirement: Unified Plugin Interface
The system MUST provide a consistent plugin interface allowing any effect to be inserted, reordered, bypassed, and parameterized on any `TrackDef` or bus.

#### Scenario: Insert plugin into track chain
- **Given** a track with an empty `plugins` array
- **When** a user selects "Add Plugin → EQ"
- **Then** an `EQ` plugin instance is appended to `track.plugins`
- **And** the audio graph is rebuilt with the new node in series

#### Scenario: Bypass without removal
- **Given** an active plugin on a track
- **When** the user sets `enabled = false`
- **Then** audio routes around the plugin
- **And** the plugin remains in `track.plugins` for re-enable

#### Scenario: Reorder chain
- **Given** plugins `[Compressor, Reverb]` on a track
- **When** the user drags Reverb before Compressor
- **Then** `track.plugins` order is updated
- **And** the audio graph reconnects in the new order

### Requirement: Parameter Schema & Validation
Each plugin type MUST declare a static param schema describing every parameter (id, label, min, max, step, default, unit) via `PLUGIN_SPECS[type].params`. Invalid param values MUST be clamped via `clampParam`, not thrown.

#### Scenario: Clamp out-of-range value
- **Given** an EQ gain param with range `[-18, 18]` dB
- **When** a preset sets `gain: 50`
- **Then** the stored value is clamped to `18`

### Requirement: Plugin Parameter Automation
Every numeric plugin parameter MUST be exposable as an `AutomationLane` target with linear/exponential interpolation.

#### Scenario: Automate reverb mix
- **Given** a Reverb plugin with `mix` param on a track
- **When** the user draws a ramp from `0.0` to `0.8` over bar 4
- **Then** the wet/dry is interpolated per-block during playback
- **And** the lane appears in `AutomationLane.tsx` param dropdown

### Requirement: 19 Plugin Types
The system MUST implement the following effect categories with the listed key parameters. Each type declares a `PluginTypeSpec` (param schema + presets) and a DSP builder.

All schemas live in `PLUGIN_SPECS` (`src/lib/types.ts:217`); all DSP lives in `applyPluginChain` / `buildPluginGraph` (`src/lib/pluginChain.ts:84`). The `PluginType` key is the `PLUGIN_SPECS` map key.

| # | Type | `PluginType` key | Key Params | File / Module |
|---|------|-----------|---------------|---------------|
| 1 | EQ (8-band) | `eq` | `freq`, `gain`, `Q`, `type` per band | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 2 | Compressor | `compressor` | `threshold`, `ratio`, `attack`, `release`, `knee` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 3 | Limiter | `limiter` | `ceiling`, `release` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 4 | Distortion | `distortion` | `drive`, `tone`, `mix` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 5 | Reverb | `reverb` | `decay`, `preDelay`, `mix`, `damping` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 6 | Delay | `delay` | `time`, `feedback`, `mix`, `sync` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 7 | Filter | `filter` | `type`, `freq`, `Q` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 8 | Modulation | `modulation` | `rate`, `depth`, `type` (chorus/flanger/phaser) | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 9 | Utility | `utility` | `gain`, `invert`, `mono` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 10 | Multiband Compressor | `multibandCompressor` | `bands[4].threshold/ratio` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 11 | Stereo Imager | `stereoImager` | `width`, `freqSplit` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 12 | DeEsser | `deesser` | `threshold`, `freq`, `ratio` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 13 | Tape Saturator | `tapeSaturator` | `drive`, `bias`, `flutter` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 14 | True Peak Limiter | `truePeakLimiter` | `threshold`, `truePeak` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 15 | Noise Gate | `noiseGate` | `threshold`, `attack`, `release`, `hysteresis` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 16 | Auto-Pitch | `autoPitch` | `key`, `scale`, `amount`, `formant` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 17 | Bass Mono | `bassMono` | `freq` (mono below crossover) | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 18 | Stereo Widener | `stereoWidener` | `amount`, `freq` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |
| 19 | Clipper | `clipper` | `ceiling`, `drive` | schema: `src/lib/types.ts` PLUGIN_SPECS; DSP: `src/lib/pluginChain.ts` applyPluginChain |

#### Scenario: Load plugin preset
- **Given** the Noise Gate plugin with built-in presets
- **When** user selects a preset from the dropdown
- **Then** all params are set from the preset map via `applyPluginPreset`
- **And** audio reflects the change within one buffer block

### Requirement: Plugin UI Editor
The system MUST render a `PluginEditor.tsx` component that dynamically builds controls from the param schema (knob/slider/toggle) for the selected plugin instance.

#### Scenario: Open editor for selected plugin
- **Given** a track with a selected Compressor plugin
- **When** the user taps the plugin slot
- **Then** `PluginEditor` renders threshold/ratio/attack/release knobs
- **And** edits write back to `track.plugins[i].params`

### Requirement: Default Preset Per Type
Every plugin type MUST ship a `"Default"` preset whose `values` exactly equal the param defaults produced by `getDefaultParams(type)` / `clampParam`. For all 19 types, `PLUGIN_SPECS[type].presets` MUST contain an entry where `name === "Default"` and `values` deep-equals the schema defaults.

#### Scenario: Default preset round-trips to defaults
- **Given** the EQ plugin type
- **When** the `"Default"` preset is applied via `applyPluginPreset`
- **Then** the resulting params equal `getDefaultParams("eq")`
- **And** `presets.find(p => p.name === "Default")` exists for all 19 types

### Requirement: Plugin Preset Serialization (round-trip)
The system MUST provide `serializePlugin(plugin: Plugin): string` (JSON.stringify of `{ type, params, enabled, order, id }`) and `deserializePlugin(json: string): Plugin` which JSON.parses the string, re-applies `clampParam` per param schema (`applyPluginPreset`), and reconstructs a valid `Plugin`. A serialize→deserialize cycle MUST produce a deep-equal object (ignoring derived fields like `color` when not present).

#### Scenario: Round-trip preserves params
- **Given** a Reverb plugin with `mix: 0.4`, `decay: 2.0`
- **When** `deserializePlugin(serializePlugin(plugin))` is called
- **Then** the result deep-equals the original plugin
- **And** any out-of-range param in the JSON is clamped on deserialize

### Requirement: Per-Plugin A/B Compare
The `Plugin` interface MAY carry `stateA: Record<string, number>`, `stateB: Record<string, number>`, and `activeSlot: 'A' | 'B'`. The system MUST allow storing current params into `stateA`, tweaking live params to `stateB`, then toggling `activeSlot` to restore the `A` params (and back) without recreating the plugin instance.

#### Scenario: Toggle between A and B states
- **Given** a plugin with `activeSlot: 'A'` and `stateA` saved
- **When** the user tweaks params and saves them as `stateB`, then toggles `activeSlot` to `'A'`
- **Then** `params` are restored to `stateA` values
- **And** toggling back to `'B'` restores the `stateB` values

### Requirement: Reported Latency
Each plugin type MUST declare a `latencySamples` value reflecting its lookahead/processing delay. FFT-based and delay-compensating effects get non-zero latency: `reverb`, `delay`, `multibandCompressor`, `truePeakLimiter`, `limiter`, `tapeSaturator`, `stereoImager`, `deesser`, `modulation`, `noiseGate`. The following get `0`: `eq`, `filter`, `utility`, `distortion`, `bassMono`, `stereoWidener`, `autoPitch`, `clipper`. The transport MUST sum enabled-chain latency via `getChainLatency(plugins): number`.

#### Scenario: Sum enabled chain latency
- **Given** an enabled chain `[Delay, EQ, Reverb]`
- **When** `getChainLatency` is computed
- **Then** the result equals `latencySamples["delay"] + latencySamples["reverb"]` (EQ contributes 0)
- **And** disabled plugins are excluded from the sum

## Test Requirements (Vitest)
- [ ] Each plugin `paramSchema` (PLUGIN_SPECS) clamps values outside range (`clampParam`)
- [ ] `buildPluginGraph()` filters disabled and returns the series without feedback loops
- [ ] Bypass flag removes node from active graph (`buildPluginGraph` / `applyPluginChain`)
- [ ] Automation interpolation matches expected value at t=0.5
- [ ] All 19 types have a non-empty preset array
- [ ] All 19 types have a `"Default"` preset whose values equal schema defaults
- [ ] `serializePlugin` / `deserializePlugin` round-trip is deep-equal
- [ ] Per-plugin A/B toggle restores saved state without recreating the instance
- [ ] `latencySamples` sums across the enabled chain via `getChainLatency`
