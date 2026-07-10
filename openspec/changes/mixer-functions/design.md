# Mixer Functions Design

## Test File Organization

### `tests/components5.test.tsx` — Mixer Component Deep Tests (planned 60+ tests)

#### MixManager (6 tests)
- Renders snapshot count and expand/collapse
- `onSave` with name triggers save callback with current state
- `onLoad` triggers load callback with snapshot data
- `onDelete` removes snapshot from list
- A/B comparison selects two snapshots and highlights active
- Renders empty state when no snapshots exist

#### VisualEQ (6 tests)
- Renders 8 frequency bands with drag handles
- Frequency label display per band
- Gain value display per band
- Preset selection updates all bands
- Frequency response curve renders correctly
- Drag handle changes gain value via `onChange`

#### LufsMeter (5 tests)
- Displays integrated LUFS value
- Displays Short-Term LUFS value
- Displays True Peak value
- Target switching renders correct LUFS target label
- Decay when `isPlaying` becomes false

#### BounceDialog (5 tests)
- Format switching (WAV/AIFF/FLAC) updates state
- Bit depth options (16/24/32-bit) present and interactive
- Sample rate options (44.1/48/96 kHz) present and interactive
- Progress bar visible during export
- Close button triggers `onClose`

#### OneKnob (5 tests)
- All 8 types render with correct label
- Value change maps to correct parameter chain via `getOneKnobChain`
- Preset application updates all knob values
- Min/max bounds enforced
- Type switching preserves value if possible

#### MiniMastering (4 tests)
- Renders preset selector with `MASTERING_CHAIN_PRESETS`
- Preset selection calls `onPresetChange` with preset
- EQ band sliders call `onEqChange` with band index and value
- 5 EQ bands display correct frequency labels

#### MasteringVersionManager (5 tests)
- Renders empty state when no versions
- Save creates version with name and notes
- Version selection triggers `onSelect`
- Delete removes version
- Bypass toggle calls `onBypass`

#### Patchbay (4 tests)
- Renders device inputs when devices available
- Drop zone renders for track routing
- Route creation updates UI
- Route deletion removes from display

#### PluginEditor sub-editors (10 tests)
- LimiterEditor: threshold/ceiling/release controls render
- DistortionEditor: drive/tone/mix controls
- MultibandCompEditor: 3 bands with crossover frequencies
- DeesserEditor: frequency/threshold/range, mode switch
- TapeSatEditor: drive/warmth/noise/wow/mix
- TruePeakEditor: oversampling level indicators
- NoiseGateEditor: threshold/ratio/attack/release/hold
- AutoPitchEditor: key/scale selection, amount/speed/formant
- BassMonoEditor: crossover/amount/dryWet, phase invert
- UtilityEditor: gain/pan controls, phase invert

#### AutomationLane (4 tests)
- Points render at correct positions
- Adding point creates new point and calls `onChange`
- Moving point updates value and calls `onChange`
- Linear/exponential curve toggle updates point

#### TrackGroupManager (5 tests)
- Group creation with name and track selection
- Group volume slider updates
- Group mute toggles
- Track assignment to group
- Group deletion

### `tests/lib7.test.ts` — Mixer Library Deep Tests (planned 40+ tests)

#### automix.ts (12 tests)
- `classifyTrack` detects all 10 roles by name (kick, snare, hihat, bass, vocal, lead, pad, keys, guitar, fx)
- `classifyTrack` uses spectral fallback when name is ambiguous
- `classifyTrack` returns "other" when nothing matches
- `autoMix` returns `AutoMixResult` with suggestions per track
- `autoMix` respects ROLE_PROFILES volume range
- `autoMix` sets pan values within stereo field
- `autoMix` applies EQ curve per role
- `autoMix` sets compression ratio per role
- `autoMixWithAnalysis` uses StemAnalysis for classification
- PRESETS structure: rock, hiphop, edm, pop, lofi, jazz — each has correct role profiles
- Each preset has unique volume offsets, pan spreads, and compression targets
- `AutoMixResult` has masterSuggestion with targetLufs and targetPeak

#### audioNodeGraph.ts (8 tests)
- `AudioNodeGraph` constructor initializes empty slots
- `addPlugin` adds slot and returns id
- `removePlugin` removes slot by id
- `togglePlugin` enables/disables without removing
- `movePlugin` reorders slots
- `getChain` returns enabled plugins in order
- `rebuildChain` disconnects all and reconnects enabled
- Multiple add/remove operations maintain internal consistency

#### hardwareIO.ts patchbay (8 tests)
- `getPatchbayState` returns initial empty state
- `createPatchRoute` creates route with device, channel, track, type
- `createPatchRoute` generates unique routeId
- `removePatchRoute` removes route by id
- `updatePatchRoute` updates route configuration
- `getRoutesForTrack` returns all routes for a track
- `getRoutesFromDevice` returns all routes from a device
- Multiple route operations maintain consistent state

#### busRouter.ts graph (6 tests)
- `buildBusRouteGraph` returns object with inputGain, outputGain, connections
- Graph includes track pan/volume nodes
- Bus nodes connect to master output
- Graph handles tracks without bus assignment
- Graph handles all 3 default buses
- `createDefaultBuses` returns buses with correct IDs, names, colors

#### automationEngine.ts scheduling (6 tests)
- `applyAutomationToParam` schedules linear ramp at correct times
- `applyAutomationToParam` schedules exponential ramp at correct times
- `applyAutomationToParam` handles single point
- `applyAutomationToParam` handles multiple points
- `applyAutomationToParam` returns cleanup function
- `buildAutomationSchedule` converts beat times to seconds correctly

## Design Decisions

1. **No new dependencies** — All tests use existing vitest + @testing-library/react setup
2. **No source modifications unless bug found** — Fixes only for bugs discovered during testing
3. **Mock strategy**: Components that render sub-components mock them shallowly; library functions test pure logic directly
4. **Three.js/Web Audio mocking**: Continue using existing patterns from `tests/setup.ts` and `tests/studio.test.tsx`
5. **Patchbay tests**: Mock `enumerateAudioDevices` to return known device list
6. **automix tests**: Pure function tests — no AudioContext needed
7. **audioNodeGraph tests**: Mock AudioContext createGain/createDelay etc.
