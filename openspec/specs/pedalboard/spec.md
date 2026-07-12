# Pedalboard

## Overview
OpenBand provides a **guitar pedalboard with amp and cabinet modeling** for guitar/bass tracks. A track carries a `TrackAmpChain` (`src/lib/types.ts:1799`) of up to 6 ordered stompbox pedals plus one amp head and one speaker cab. The UI is `src/components/PedalRack.tsx` (six pedal slots + amp selector + cab selector, all with brand-filtered pickers). The audio DSP for pedals is built in `src/lib/pedalboardDsp.ts` — an AudioWorklet `tanh` overdrive processor plus native Web Audio factories for delay, chorus, and tremolo — and is wired into an `AudioNodeGraph`. (There is no `MasterRack.tsx`; the master chain uses the track/bus plugin system, not this pedal DSP.)

## Implementation Notes
`pedalboardDsp.ts` has no prior spec and is intentionally separate from the 19-type track/bus plugin architecture (`audio-plugins` spec). The overdrive/distortion/fuzz pedals share one `AudioWorkletProcessor` (`registerProcessor("pedalboard-processor", ...)`, `WORKLET_CODE`) that applies `Math.tanh(sample * drive)` then `level`, clamped to `[-1, 1]`; `registerPedalboardWorklet` lazily registers the module and `createPedalboardNode` posts `drive`/`level` messages. `createDelayNode` builds a feedback delay, `createChorusNode` an LFO-modulated short delay, `createTremoloNode` an LFO-modulated gain. `connectPedalChain` iterates pedals and, via `pedalFactoryForType`, maps each `type` to a factory, calls `graph.addPlugin(id, name, factory)` and `graph.togglePlugin(id, enabled)`. Pedal/amp/cab data models and presets are `GuitarPedal`, `AmpModel`, `CabModel`, `PEDAL_PRESETS` (`src/lib/types.ts:1805`), `AMP_PRESETS` (`:1904`), `CAB_PRESETS` (`:2207`).

## Requirements

### Requirement: 6-Slot Pedalboard with Amp & Cab
The system MUST render a pedalboard with exactly 6 pedal slots plus one amp selector and one cab selector, backed by a `TrackAmpChain` (`{ pedals: GuitarPedal[]; amp: AmpModel | null; cab: CabModel | null }`). `PedalRack.tsx` MUST render slots `[0..5]`, each showing the assigned `GuitarPedal` (name, brand, enabled LED) or an empty add affordance, plus `AmpSelector` and `CabSelector`.

#### Scenario: Render fixed slot layout
- **Given** a `TrackAmpChain` with two pedals, an amp, and a cab
- **When** `PedalRack` renders
- **Then** six pedal slots are shown (empty slots for unused indices) followed by the amp and cab selectors
- **And** the header shows `trackName` when provided

#### Scenario: Toggle a pedal on/off
- **Given** an enabled pedal in slot `0`
- **When** the user taps the pedal
- **Then** `onChange` is called with `pedals[0].enabled` flipped
- **And** the enabled LED reflects the new state

### Requirement: Per-Pedal DSP
Each pedal `type` MUST map to a Web Audio DSP node built by `src/lib/pedalboardDsp.ts` via `pedalFactoryForType`. Overdrive/distortion/fuzz MUST use the `tanh` AudioWorklet (`createOverdriveFactory` → `createPedalboardNode`) parameterized by `drive` and `level`; `delay` uses `createDelayNode`; `chorus`/`flanger` use `createChorusNode`; `tremolo`/`vibrato` use `createTremoloNode`; `boost` uses a gain node. Unmapped types MUST return `null` (no node inserted).

#### Scenario: Overdrive uses the worklet processor
- **Given** a pedal with `type: "overdrive"` and params `{ drive: 60, level: 55 }`
- **When** `pedalFactoryForType` builds its node
- **Then** an `AudioWorkletNode("pedalboard-processor")` is created via `createOverdriveFactory`
- **And** `drive` and `level` are posted to the processor port

#### Scenario: Worklet registers once
- **Given** an `AudioContext` with `audioWorklet` support
- **When** `registerPedalboardWorklet` is called twice
- **Then** the module is added only on the first call and subsequent calls short-circuit to `true`

#### Scenario: Unknown pedal type yields no node
- **Given** a pedal with an unmapped `type` (e.g. `"wah"`, `"phaser"`)
- **When** `pedalFactoryForType` is called
- **Then** it returns `null` and no node is added to the graph

### Requirement: Reorder Chain
Pedals MUST process in `chain.pedals` array order, and the order MUST be editable (replace/remove per slot) with the audio graph wired in that order. `connectPedalChain` MUST add and toggle each pedal into the `AudioNodeGraph` following array order; disabled pedals are bypassed via `graph.togglePlugin(id, false)`.

#### Scenario: Chain wired in array order
- **Given** `pedals = [Overdrive, Delay, Chorus]`
- **When** `connectPedalChain(graph, pedals)` runs
- **Then** the nodes are added to the graph in that sequence
- **And** each pedal's `enabled` flag drives `graph.togglePlugin`

#### Scenario: Remove a pedal from a slot
- **Given** a chain with a pedal in slot `1`
- **When** the user removes it
- **Then** `onChange` is called with that entry spliced out of `pedals`

### Requirement: Amp & Cab Presets
The system MUST let the user pick one amp and one cab from brand-filterable preset lists. `AMP_PRESETS` (`AmpModel` with `gain/bass/mid/treble/presence/volume/master`) and `CAB_PRESETS` (`CabModel` with `micPosition/room/lowCut/highCut`, plus `speakers`) drive the selectors; selecting sets `chain.amp` / `chain.cab`, and removing sets them to `null`.

#### Scenario: Select an amp from a brand filter
- **Given** the amp picker filtered to a single brand
- **When** the user taps an amp preset
- **Then** `onChange` sets `chain.amp` to that `AmpModel` and closes the picker
- **And** the selector renders its `gain/bass/mid/treble` meters

#### Scenario: Remove the cab
- **Given** a chain with a selected cab
- **When** the user taps the cab remove control
- **Then** `onChange` sets `chain.cab` to `null`

## Test Requirements (Vitest)
- [ ] `PedalRack` renders exactly 6 pedal slots plus amp and cab selectors
- [ ] Toggling a pedal flips `pedals[i].enabled` in the `onChange` payload
- [ ] `pedalFactoryForType("overdrive", ...)` returns a factory building an `AudioWorkletNode`
- [ ] `pedalFactoryForType` maps delay/chorus/tremolo/boost to their factories and returns `null` for unmapped types
- [ ] `registerPedalboardWorklet` adds the module only once across repeated calls
- [ ] `createPedalboardNode` posts `drive`/`level` messages when provided
- [ ] `connectPedalChain` adds pedals in array order and calls `togglePlugin` per `enabled`
- [ ] Removing a slot splices the pedal out of `chain.pedals`
- [ ] Selecting an amp/cab sets `chain.amp`/`chain.cab`; removing sets them to `null`
- [ ] `PEDAL_PRESETS`, `AMP_PRESETS`, and `CAB_PRESETS` are non-empty
