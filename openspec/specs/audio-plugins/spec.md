# Audio Plugins

## Overview
OpenBand provides a unified audio plugin architecture with **19 effect types** applicable to tracks, send buses, and the master chain. Plugins are implemented as Web Audio API node graphs on web and native processors on desktop/mobile via the Expo/Electron bridge (`OpenBandNative`). All plugins conform to a single `PluginDef` shape and are automatable.

## Implementation Notes
The 19 plugin types are **not** split into per-file modules. Their param schemas and presets are centralized in `src/lib/types.ts` (`PluginType` union at `src/lib/types.ts:94`, `PLUGIN_SPECS` at `src/lib/types.ts:217`), and the Web Audio DSP graph for every type is built inline in a single `applyPluginChain` function in `src/lib/pluginChain.ts:84`. The mastering-family types (eq, compressor, limiter, truePeakLimiter, multibandCompressor, stereoImager, tapeSaturator, deesser) delegate to `applyMasteringChain` in `src/lib/mastering.ts:130`. (`src/lib/pedalboardDsp.ts` is separate — it handles guitar-pedal DSP for `PedalRack`, not these track/bus/master plugins.)

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
Each plugin type MUST declare a static `paramSchema` describing every parameter (name, min, max, default, unit). Invalid param values MUST be clamped, not thrown.

#### Scenario: Clamp out-of-range value
- **Given** an EQ gain param with range `[-24, 24]` dB
- **When** a preset sets `gain: 50`
- **Then** the stored value is clamped to `24`

### Requirement: Plugin Parameter Automation
Every numeric plugin parameter MUST be exposable as an `AutomationLane` target with linear/exponential interpolation.

#### Scenario: Automate reverb mix
- **Given** a Reverb plugin with `mix` param on a track
- **When** the user draws a ramp from `0.0` to `0.8` over bar 4
- **Then** the wet/dry is interpolated per-block during playback
- **And** the lane appears in `AutomationLane.tsx` param dropdown

### Requirement: 19 Plugin Types
The system MUST implement the following effect categories with the listed key parameters:

All schemas live in `PLUGIN_SPECS` (`src/lib/types.ts:217`); all DSP lives in `applyPluginChain` (`src/lib/pluginChain.ts:84`). The `PluginType` key is the `PLUGIN_SPECS` map key.

| # | Type | `PluginType` key | Key Params |
|---|------|-----------|---------------|
| 1 | EQ (8-band) | `eq` | `freq`, `gain`, `Q`, `type` per band |
| 2 | Compressor | `compressor` | `threshold`, `ratio`, `attack`, `release`, `knee` |
| 3 | Limiter | `limiter` | `ceiling`, `release` |
| 4 | Distortion | `distortion` | `drive`, `tone`, `mix` |
| 5 | Reverb | `reverb` | `decay`, `preDelay`, `mix`, `damping` |
| 6 | Delay | `delay` | `time`, `feedback`, `mix`, `sync` |
| 7 | Filter | `filter` | `type`, `freq`, `Q` |
| 8 | Modulation | `modulation` | `rate`, `depth`, `type` (chorus/flanger/phaser) |
| 9 | Utility | `utility` | `gain`, `invert`, `mono` |
| 10 | Multiband Compressor | `multibandCompressor` | `bands[4].threshold/ratio` |
| 11 | Stereo Imager | `stereoImager` | `width`, `freqSplit` |
| 12 | DeEsser | `deesser` | `threshold`, `freq`, `ratio` |
| 13 | Tape Saturator | `tapeSaturator` | `drive`, `bias`, `flutter` |
| 14 | True Peak Limiter | `truePeakLimiter` | `threshold`, `truePeak` |
| 15 | Noise Gate | `noiseGate` | `threshold`, `attack`, `release`, `hysteresis` |
| 16 | Auto-Pitch | `autoPitch` | `key`, `scale`, `amount`, `formant` |
| 17 | Bass Mono | `bassMono` | `freq` (mono below crossover) |
| 18 | Stereo Widener | `stereoWidener` | `amount`, `freq` |
| 19 | Clipper | `clipper` | `ceiling`, `drive` |

#### Scenario: Load plugin preset
- **Given** the Noise Gate plugin with 5 built-in presets
- **When** user selects "Preset → Tight Vocal"
- **Then** all gate params are set from the preset map
- **And** audio reflects the change within one buffer block

### Requirement: Plugin UI Editor
The system MUST render a `PluginEditor.tsx` component that dynamically builds controls from `paramSchema` (knob/slider/toggle) for the selected plugin instance.

#### Scenario: Open editor for selected plugin
- **Given** a track with a selected Compressor plugin
- **When** the user taps the plugin slot
- **Then** `PluginEditor` renders threshold/ratio/attack/release knobs
- **And** edits write back to `track.plugins[i].params`

## Test Requirements (Vitest)
- [ ] Each plugin `paramSchema` clamps values outside range
- [ ] `buildGraph()` connects N plugins in series without feedback loops
- [ ] Bypass flag removes node from active graph
- [ ] Automation interpolation matches expected value at t=0.5
- [ ] All 19 types have a non-empty preset array
