# Mixer Functions — Task Checklist

## Phase 1: Library Module Deep Tests (`tests/lib7.test.ts`)

### Task 1: automix.ts — classifyTrack + autoMix + PRESETS (12 tests)
- [ ] 1.1 `classifyTrack` detects all 10 roles by name
- [ ] 1.2 `classifyTrack` uses spectral fallback when name is ambiguous
- [ ] 1.3 `classifyTrack` returns "other" when nothing matches
- [ ] 1.4 `autoMix` returns `AutoMixResult` with suggestions
- [ ] 1.5 `autoMix` respects ROLE_PROFILES volume range
- [ ] 1.6 `autoMix` pan values within stereo field
- [ ] 1.7 `autoMix` applies EQ curve per role
- [ ] 1.8 `autoMix` compression ratio per role
- [ ] 1.9 `autoMixWithAnalysis` uses StemAnalysis
- [ ] 1.10 PRESETS structure has 6 genres
- [ ] 1.11 Each preset has unique volume offsets / pan spreads
- [ ] 1.12 `AutoMixResult` has masterSuggestion with targetLufs/targetPeak

### Task 2: audioNodeGraph.ts — AudioNodeGraph CRUD (8 tests)
- [ ] 2.1 Constructor initializes empty
- [ ] 2.2 `addPlugin` adds slot, returns id
- [ ] 2.3 `removePlugin` removes by id
- [ ] 2.4 `togglePlugin` enables/disables
- [ ] 2.5 `movePlugin` reorders
- [ ] 2.6 `getChain` returns enabled in order
- [ ] 2.7 `rebuildChain` disconnect+reconnect
- [ ] 2.8 Multiple add/remove consistency

### Task 3: hardwareIO.ts — patchbay route CRUD (8 tests)
- [ ] 3.1 `getPatchbayState` initial empty
- [ ] 3.2 `createPatchRoute` creates with unique id
- [ ] 3.3 `removePatchRoute` removes by id
- [ ] 3.4 `updatePatchRoute` updates config
- [ ] 3.5 `getRoutesForTrack` returns per track
- [ ] 3.6 `getRoutesFromDevice` returns per device
- [ ] 3.7 Multiple routes maintain state
- [ ] 3.8 Duplicate prevention

### Task 4: busRouter.ts — buildBusRouteGraph (6 tests)
- [ ] 4.1 Returns inputGain/outputGain/connections
- [ ] 4.2 Includes pan/volume nodes per track
- [ ] 4.3 Bus-to-master connections
- [ ] 4.4 Tracks without bus assignment
- [ ] 4.5 All 3 default buses rendered
- [ ] 4.6 `createDefaultBuses` IDs/names/colors

### Task 5: automationEngine.ts — scheduling (6 tests)
- [ ] 5.1 `applyAutomationToParam` schedules linear ramp
- [ ] 5.2 `applyAutomationToParam` schedules exponential ramp
- [ ] 5.3 Handles single point
- [ ] 5.4 Handles multiple points
- [ ] 5.5 Returns cleanup function
- [ ] 5.6 `buildAutomationSchedule` beat→seconds

## Phase 2: Component Deep Tests (`tests/components5.test.tsx`)

### Task 6: MixManager — snapshot CRUD + A/B (6 tests)
- [ ] 6.1 Renders snapshot count
- [ ] 6.2 `onSave` with name
- [ ] 6.3 `onLoad` triggers callback
- [ ] 6.4 `onDelete` removes from list
- [ ] 6.5 A/B comparison selection
- [ ] 6.6 Empty state rendering

### Task 7: VisualEQ — bands, drag, presets (6 tests)
- [ ] 7.1 8 frequency bands render
- [ ] 7.2 Frequency labels
- [ ] 7.3 Gain value display
- [ ] 7.4 Preset selection updates bands
- [ ] 7.5 Response curve renders
- [ ] 7.6 Drag handle gain change

### Task 8: LufsMeter — targets, decay (5 tests)
- [ ] 8.1 Integrated LUFS display
- [ ] 8.2 Short-Term LUFS
- [ ] 8.3 True Peak display
- [ ] 8.4 Target switching
- [ ] 8.5 Decay on stop

### Task 9: BounceDialog — formats, bit depth, rates (5 tests)
- [ ] 9.1 Format switch (WAV/AIFF/FLAC)
- [ ] 9.2 Bit depth options (16/24/32)
- [ ] 9.3 Sample rate options (44.1/48/96)
- [ ] 9.4 Progress bar
- [ ] 9.5 Close button

### Task 10: OneKnob — types, mapping, presets (5 tests)
- [ ] 10.1 All 8 types render
- [ ] 10.2 Value→param chain mapping
- [ ] 10.3 Preset application
- [ ] 10.4 Min/max bounds
- [ ] 10.5 Type switch preserves value

### Task 11: MiniMastering — presets, EQ bands (4 tests)
- [ ] 11.1 Preset selector renders
- [ ] 11.2 `onPresetChange` on select
- [ ] 11.3 EQ bands call `onEqChange`
- [ ] 11.4 5 EQ frequency labels

### Task 12: MasteringVersionManager — versions CRUD (5 tests)
- [ ] 12.1 Empty state
- [ ] 12.2 Save creates version
- [ ] 12.3 Select triggers `onSelect`
- [ ] 12.4 Delete removes version
- [ ] 12.5 Bypass toggle

### Task 13: Patchbay — routes CRUD (4 tests)
- [ ] 13.1 Device inputs render
- [ ] 13.2 Drop zones for tracks
- [ ] 13.3 Route creation
- [ ] 13.4 Route deletion

### Task 14: PluginEditor sub-editors (10 tests)
- [ ] 14.1 LimiterEditor controls
- [ ] 14.2 DistortionEditor controls
- [ ] 14.3 MultibandCompEditor 3 bands
- [ ] 14.4 DeesserEditor mode switch
- [ ] 14.5 TapeSatEditor controls
- [ ] 14.6 TruePeakEditor oversampling
- [ ] 14.7 NoiseGateEditor controls
- [ ] 14.8 AutoPitchEditor key/scale
- [ ] 14.9 BassMonoEditor phase invert
- [ ] 14.10 UtilityEditor gain/pan

### Task 15: AutomationLane — points CRUD (4 tests)
- [ ] 15.1 Points render at positions
- [ ] 15.2 Add point creates + onChange
- [ ] 15.3 Move point updates + onChange
- [ ] 15.4 Curve toggle (linear/exponential)

### Task 16: TrackGroupManager — groups CRUD (5 tests)
- [ ] 16.1 Create group with name
- [ ] 16.2 Volume slider
- [ ] 16.3 Mute toggle
- [ ] 16.4 Track assignment
- [ ] 16.5 Group deletion

## Phase 3: Bug Fixes (if discovered)

### Task 17: Fix any logic bugs found during testing
- [ ] 17.1 `voiceCommands.ts` mute index bug (`muteMatch[3]` → `muteMatch[2]`)
- [ ] 17.2 Any automix edge cases
- [ ] 17.3 Any audioNodeGraph edge cases

## Phase 4: Verification

- [ ] Run `npx vitest run` — all tests pass
- [ ] Run `npm run test:legacy` — legacy tests pass
- [ ] Run `npx tsc --noEmit` — zero errors in new/modified files
- [ ] Code review via code-review subagent
