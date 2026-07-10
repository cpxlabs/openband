# OpenSpec Proposal: Comprehensive Feature Test Suite

Establish full test coverage across all application screens, components, and library modules, ensuring every feature is validated by automated tests.

---

## 1. Problem Description

The current test suite (12 files, ~4,000+ tests) covers the majority of design-system components and many core library modules, but significant gaps remain:

### Screens Without Tests
The following app screens have **zero** dedicated tests:
- `app/(auth)/login.tsx` — Login/signup with form validation, auth flows, visitor mode
- `app/tabs/index.tsx` — Feed tab (704 lines) with audio preview playback, social interactions, FlatList rendering
- `app/tabs/library.tsx` — Library tab with project listing, filter tabs (all/favorites/collabs/trash), import/export, NewProject dialog
- `app/tabs/moments.tsx` — Moments tab with MomentCard feed, sample pack cards
- `app/tabs/explorer.tsx` — Standalone explorer page
- `app/tabs/virtual-studio.tsx` — Standalone virtual studio page
- `app/studio/[id].tsx` — The DAW multi-track studio (2,813 lines, the most complex screen in the app). Contains 28+ embedded components, transport controls, clock manager, bus routing, automation, audio playback, MIDI scheduling, and 11 bottom-tab panels (mixer, fx, mastering, groups, buses, mixes, chords, etc.)
- `app/_layout.tsx` — Root layout with SafeAreaProvider, ThemeProvider, AuthProvider, AudioEngineProvider, protected routing guard, web audio autoplay initialization
- `app/live-room.tsx`, `app/lofi-tape.tsx`, `app/beatmaker.tsx`, `app/dj-stage.tsx` — 3D Three.js scenes with dynamic CDN loading, scene lighting, LightControls integration
- `app/explorer.tsx`, `app/virtual-studio.tsx` — Standalone screens

### Components Without Tests
Several exported components from `src/components/index.ts` lack Vitest coverage:
- `RightSidebar` — Right-side panel with additional controls
- `OutputSelector` — Audio output routing selector
- `VoiceCommandButton` — Voice input button
- `MiniPlayer` — Mini audio player overlay
- `QuickActions` / `QuickTools` — Quick action/tool bars
- `ProjectMenu` — Project-level menu (save, export, share)
- `LightControls` — 3D scene lighting controls
- `VuMeter` — Volume unit meter
- `TrackColorPicker` — Track color selection
- `TrapScene` — 3D trap scene component

### Library Modules Without Tests
The following library modules have minimal or no test coverage:
- `apiUrl.ts`, `arrangement.ts`, `arrangementGenerator.ts` — API URL resolution, arrangement logic
- `audioNodeGraph.ts` — Audio node graph management
- `cloudSync.ts` — Cloud sync operations
- `crashRecovery.ts` — Crash recovery mechanisms
- `flags.ts` — Feature flags
- `habboAssets.ts` — 3D habbo-style asset loading
- `harmony.ts` — Music harmony utilities
- `keyboard.ts` — Keyboard shortcut hooks
- `latencyMonitor.ts` — Audio latency monitoring
- `lazyDrumKit.ts` — Lazy-loaded drum kit
- `midiLearn.ts` — MIDI learn functionality
- `midiParser.ts` — MIDI file parsing
- `pedalboardDsp.ts` — Pedalboard DSP processing
- `presence.ts` — Client-side SSE presence
- `projectEncryption.ts` — Project encryption
- `sceneLighting.ts` — 3D scene lighting helpers
- `stateAssetSeparation.ts` — Asset/state separation (OpenBandManifest v2)
- `stemManifest.ts` — Stem manifest utilities
- `subtractiveSynth.ts` — Dual-oscillator subtractive synth engine
- `supabase.ts` (beyond mock fallback) — Supabase client behavior
- `supabaseRemote.ts` — Push/pull/sync operations
- `timelineGestures.ts` — Timeline pinch-zoom/scroll gestures
- `videoExport.ts` — Video export functionality
- `voiceCommands.ts` — Voice command processing
- `wasmInstrumentEngine.ts` — Wasm synth/sampler in AudioWorklet

### Branch Coverage Gaps
Many lib modules tested only shallowly (exports check) lack deep behavioral tests:
- `wasmPluginHost.ts`, `yjsCRDT.ts`, `collaboration.ts`, `timeStretch.ts` (lib3) — exports-only
- `hardwareIO.ts` (lib3) — exports-only
- `openbandFormat.ts` (lib3) — only `createOpenBandArchive` returns Uint8Array

### Missing Edge Cases
Even for tested modules, edge cases are sparse:
- Null/undefined inputs, empty arrays, boundary values (e.g., BPM ranges, volume extremes)
- Network failure scenarios (API timeouts, offline mode)
- Concurrent/race conditions (rapid play/pause, multiple MIDI events)
- Platform-specific behavior (web vs native vs Electron)

---

## 2. Objectives

1. **Achieve >80% screen coverage** — Every app route has at least one test file validating its core behavior
2. **Achieve 100% component coverage** — Every exported component from `src/components/index.ts` has basic rendering + interaction tests
3. **Achieve deep behavioral coverage for all library modules** — Every exported function has at least one positive and one negative test case
4. **Maintain test quality bar** — All tests use Vitest (jsdom), follow existing patterns (describe/it/fireEvent), and pass `npx vitest run` with zero failures
5. **Preserve legacy test suite** — `npm run test:legacy` continues to pass (node:test pattern)
6. **No new dependencies** — All tests use existing testing infrastructure (vitest, @testing-library/react, jsdom)
