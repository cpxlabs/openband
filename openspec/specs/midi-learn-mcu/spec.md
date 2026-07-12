# MIDI Learn & MCU Control Surface

## Overview
OpenBand supports binding physical MIDI controllers to plugin/track parameters through a **MIDI Learn** flow, and decoding **Mackie Control Universal (MCU)** protocol messages from a control surface (faders, pan, transport). The learn logic lives in `src/lib/midiLearn.ts` (`MidiMapping` at `:1`, `MidiLearnState` at `:8`, `processMidiCC` at `:22`, `startLearning` at `:73`, `saveMappings`/`loadMappings` at `:100`/`:111`). MIDI timing and note scheduling are handled by `src/lib/midiScheduler.ts` (`createLookaheadScheduler` at `:131`, `noteNumberToName` at `:246`) and raw file parsing by `src/lib/midiParser.ts` (`parseMidi` at `:87`, `MidiData` at `:18`).

Today `MidiLearnState.mappings` are persisted only to `localStorage` (`:14`). This spec extends them to be part of the saved project (`midiMap` on `ProjectData` in `src/lib/projectStore.ts:15`) so bindings survive reloads and export/import. MCU decoding MUST be added as a new module `src/lib/midiMcu.ts` that translates MCU universal sysex / pitch/touch messages into `MidiMapping`-compatible events (fader → volume, vpot → pan, transport buttons → play/stop/record).

## Implementation Notes
`processMidiCC` already handles two modes: in `learningMode` it binds the incoming `cc` to the `activeTarget` (`src/lib/midiLearn.ts:29`) and persists via `saveMappings`; otherwise it looks up the `cc` and returns `{ pluginId, paramId, trackId, normalizedValue }` (`:59`). The MCU layer reuses the same `MidiMapping` shape but generates transient mappings for surface controls (e.g. fader touch on channel 1 → `trackId` + `volume` target). Project persistence is via `saveProject`/`loadProject` + `sanitizeProjectData` in `src/lib/projectStore.ts` (`exportProject` at `:191`, `importProject` at `:261`), which MUST be extended to round-trip `midiMap`.

## Requirements

### Requirement: MIDI Learn Binding
The system MUST let a user enter learning mode for a target parameter, capture the next incoming CC, and persist a `MidiMapping` (cc, pluginId, paramId, trackId). The binding flow MUST call `startLearning` then `processMidiCC` on incoming messages.

#### Scenario: Bind CC to parameter
- **Given** `learningMode = false` and no mapping exists
- **When** `startLearning({pluginId, paramId, trackId})` is called then a CC `7` arrives via `processMidiCC(7, 100, state)`
- **Then** `state.mappings` contains one entry with `cc: 7` and the target ids
- **And** `saveMappings` persisted the mapping to `localStorage`

#### Scenario: Active mapping updates CC
- **Given** an existing mapping for a target bound to `cc: 7`
- **When** the user re-learns the same target with CC `10`
- **Then** `state.mappings` still has length 1 and its `cc` is now `10` (`:38`)

### Requirement: MIDI Learn Playback Resolution
When not in learning mode, an incoming CC MUST resolve to the mapped parameter change with a normalized value in `[0,1]` calculated as `value / 127` (`src/lib/midiLearn.ts:27`).

#### Scenario: Resolve mapped CC to param
- **Given** a mapping `{cc: 7, pluginId, paramId, trackId}`
- **When** `processMidiCC(7, 64, state)` is called outside learning mode
- **Then** it returns `{ pluginId, paramId, trackId, normalizedValue: 64/127 }`
- **And** no new mapping is created

#### Scenario: Unmapped CC returns null
- **Given** no mapping for `cc: 99`
- **When** `processMidiCC(99, 10, state)` is called
- **Then** the result is `null` (`:60`)

### Requirement: Persist midiMap in ProjectData
The `midiMap: MidiMapping[]` field MUST be added to `ProjectData` (`src/lib/projectStore.ts:15`) and round-tripped by `saveProject`/`loadProject`/`sanitizeProjectData` so bindings survive reloads and are included in `exportProject`/`importProject`.

#### Scenario: Save with midiMap
- **Given** a project with two `MidiMapping` entries
- **When** `saveProject(id, data)` is called
- **Then** `loadProject(id).midiMap` deep-equals the two mappings
- **And** `exportProject(id)` JSON contains the `midiMap` array

#### Scenario: Import restores midiMap
- **Given** a JSON string containing `midiMap` with one entry
- **When** `importProject(json)` runs
- **Then** `sanitizeProjectData` keeps the entry (not dropped as unknown)
- **And** `loadProject` returns the project with that mapping

### Requirement: MCU Fader / Pan Decode
A new `src/lib/midiMcu.ts` MUST decode MCU standard messages: pitch-wheel-style fader updates on MIDI channel 0 map to track `volume`, V-Pot rotary messages map to track `pan`, and the result MUST be expressed as `MidiMapping`-compatible events consumable by the existing audio graph.

#### Scenario: Fader moves map to track volume
- **Given** an MCU fader touch on channel 1 with value `8192` (center)
- **When** `decodeMcu(message)` runs
- **Then** it yields an event `{ trackId, target: "volume", normalizedValue: 0.5 }`
- **And** the value range `0..16383` maps linearly to `0..1`

#### Scenario: V-Pot maps to pan
- **Given** an MCU V-Pot message for channel 3 with value `64` (center)
- **When** `decodeMcu` runs
- **Then** it yields `{ trackId, target: "pan", normalizedValue: 0.0 }` (center = 0, range `-1..1` → `0..1`)

### Requirement: MCU Transport Decode
`src/lib/midiMcu.ts` MUST decode the MCU global transport buttons (via universal sysex or note-on on the dedicated channel) into `play` / `stop` / `record` actions usable by `createLookaheadScheduler` (`src/lib/midiScheduler.ts:131`).

#### Scenario: Transport play received
- **Given** an MCU "Play" button message
- **When** `decodeMcu` runs
- **Then** it yields `{ action: "play" }`
- **And** the studio invokes `scheduler.start(notes, bpm)` when handling it

#### Scenario: Transport stop received
- **Given** an MCU "Stop" button message
- **When** `decodeMcu` runs
- **Then** it yields `{ action: "stop" }`
- **And** the studio invokes `scheduler.stop()`

### Requirement: MCU Mapping Reuses MIDI Learn
The `midiMap` entries produced by MCU control surfaces MUST be expressible using the same `MidiMapping` shape (`src/lib/midiLearn.ts:1`) where `paramId` is the target name (`"volume"`/`"pan"`), so MCU-bound tracks can be listed alongside learned CC bindings and cleared via `clearMappings` (`:92`).

#### Scenario: MCU fader listed with learned CCs
- **Given** a `midiMap` containing one learned CC and one MCU fader mapping
- **When** `getMappingsForPlugin(state, trackId, pluginId)` is called
- **Then** both entries are returned (`:126`)
- **And** `clearMappings` removes all of them at once

## Test Requirements (Vitest)
- [ ] `startLearning` + `processMidiCC` creates a `MidiMapping` with the captured CC
- [ ] Re-learning an existing target updates the CC without growing `mappings`
- [ ] `processMidiCC` outside learning mode returns `normalizedValue = value/127`
- [ ] Unmapped CC returns `null`
- [ ] `saveProject`/`loadProject` round-trip the `midiMap` field
- [ ] `exportProject` JSON includes `midiMap`; `importProject` restores it via `sanitizeProjectData`
- [ ] `decodeMcu` maps fader `0..16383` → volume `0..1`
- [ ] `decodeMcu` maps V-Pot center (64) → pan 0.0
- [ ] `decodeMcu` emits `play`/`stop` transport actions
- [ ] MCU and learned mappings coexist and are cleared together by `clearMappings`
