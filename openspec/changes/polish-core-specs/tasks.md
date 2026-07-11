# Tasks — Polish Core Specs

## 1. Spec scaffolding (docs)
- [x] Rewrite `openspec/specs/audio-plugins/spec.md` with corrected real paths + 4 new requirements
- [x] Rewrite `openspec/specs/mastering-plugins/spec.md` with Chain Validation requirement + 3 preset fixes noted
- [x] Create `openspec/specs/project-starter/spec.md`

## 2. Plugin system implementation
- [ ] Add `"Default"` preset to every entry in `PLUGIN_SPECS` (`src/lib/types.ts`) whose `values` equal `getDefaultParams(type)`
- [ ] Add `latencySamples` map per `PluginType` in `src/lib/types.ts` (10 non-zero, 9 zero)
- [ ] Add `getChainLatency(plugins: Plugin[]): number` to `src/lib/pluginChain.ts`
- [ ] Extend `Plugin` interface (`src/lib/types.ts:130`) with optional `stateA`, `stateB`, `activeSlot`
- [ ] Create `src/lib/plugins/presetSerial.ts` with `serializePlugin` / `deserializePlugin`

## 3. Mastering implementation
- [ ] Add `validateMasteringChain(chain): { valid: boolean; error?: string }` to `src/lib/mastering.ts`
- [ ] Fix `MASTERING_CHAIN_PRESETS` #4 (`Loudness Maximizer`), #6 (`EDM Club`), #9 (`Lo-Fi Vibe`) to drop trailing `limiter`, ending with single `truePeakLimiter`

## 4. Project starter implementation
- [ ] Create `src/lib/projectStarter.ts` with `setupProjectStarter(config)` delegating to `generateTracksForGenre`
- [ ] Implement `bpm`→`genre.bpmRange` and `numBars`→`1..64` clamping
- [ ] Implement `scratch` flag returning empty `tracks`

## 5. Tests (new stubs)
- [ ] Create `src/lib/projectStarter.test.ts` — tracks count == suggestedTracks length; regionDuration formula; startFromScratch empty; invalid bpm clamped
- [ ] Create `src/lib/plugins/presetSerial.test.ts` — serialize/deserialize deep-equal round-trip; clamp on deserialize
- [ ] Create `src/lib/mastering.test.ts` — `validateMasteringChain` rejects >1 terminal limiter; the 3 affected presets end with single `truePeakLimiter`; all 10 presets build valid `Plugin[]`
- [ ] (existing suite) confirm all 19 types have non-empty preset + a `"Default"` preset

## 6. Verification
- [ ] `npx tsc --noEmit` clean
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `npx vitest run` passes
- [ ] `npm run build` succeeds

## Missing spec areas still TODO
The following major subsystems from the earlier spec backlog still have no dedicated OpenSpec file. `project-starter` (formerly `project-templates`) is now created by this change; the rest remain TODO:

- [ ] `specs/collaboration-crdt/` — Real-time collaboration & CRDT sync (operation-based merge, SSE/WebSocket, presence cursors). `src/lib/crdt.ts`, `yjsCRDT.ts`, `collaboration.ts`, `presence.ts`, backend `routes/collab.ts`.
- [ ] `specs/project-branching/` — Git-like CRDT fork/merge/diff, named branches, snapshot compaction, A/B commit history UI. `src/lib/projectBranching.ts`, `snapshotManager.ts`, `src/components/BranchManager.tsx`, `CommitModal.tsx`, `VersionHistory.tsx`.
- [ ] `specs/project-storage/` — Project persistence, `.openband` binary archive w/ CRC32, asset separation w/ S3 pointers. `src/lib/projectStore.ts`, `openbandFormat.ts`, `stateAssetSeparation.ts`.
- [ ] `specs/cloud-sync/` — Supabase remote push/pull, hash dedup, storage bucket sync. `src/lib/cloudSync.ts`, `supabaseRemote.ts`, `supabase.ts`, backend `routes/projects.ts`, `stems.ts`, `trash.ts`.
- [ ] `specs/auth/` — Supabase auth, visitor/anon mode, magic-link, account conversion, tier gating. `src/context/AuthContext.tsx`, backend `routes/auth.ts`, `magicLink.ts`, `tier.ts`, `middleware/authMiddleware.ts`, `tierGuard.ts`.
- [ ] `specs/backend-api/` — Full Express surface: stem extraction (Demucs/mock/queue), master bounce, contextual MIDI generator, sessions, remix, export, mixing templates, hydration. `backend/src/app.ts`, `routes/*`, `services/demucs.ts`, `mock.ts`, `queue.ts`, `middleware/upload.ts`.
- [ ] `specs/social-feed/` — Feed timeline, artist moments, sample-pack store, project cards. `app/tabs/index.tsx`, `moments.tsx`, `src/components/FeedPostCard.tsx`, `MomentCard.tsx`, `SamplePackCard.tsx`, `ProjectCard.tsx`.
- [ ] `specs/hardware-io/` — Multi-channel device enumeration, drag-and-drop hardware I/O matrix, output selection. `src/lib/hardwareIO.ts`, `src/components/Patchbay.tsx`, `OutputSelector.tsx`.
- [ ] `specs/wasm-plugins/` — JSON-RPC Wasm plugin loader, unified AudioWorklet synth/sampler engine. `src/lib/wasmPluginHost.ts`, `wasmInstrumentEngine.ts`.
- [ ] `specs/command-palette/` — Central command registry, Cmd+K palette, shortcut engine. `src/lib/commandRegistry.ts`, `keyboard.ts`, `src/components/CommandPalette.tsx`.
- [ ] `specs/waveform-rendering/` — Peak-data generation, Canvas 2D waveform renderer, viewport culling, live waveform. `src/lib/canvasWaveform.ts`, `src/components/WaveformCanvas.tsx`, `LiveWaveformCanvas.tsx`, `WaveformClip.tsx`.
- [ ] `specs/automation-routing/` — Volume/param automation lanes, sub-mix bus graph builder, DAG cycle validation, LFO/envelope/macro modulation matrix. `src/lib/automationEngine.ts`, `busRouter.ts`, `audioGraphValidation.ts`, `modulationMatrix.ts`.
- [ ] `specs/midi-pipeline/` — MIDI file parsing, Web Audio synth bus routing, lookahead sample-accurate scheduler. `src/lib/midiParser.ts`, `midiSynth.ts`, `midiScheduler.ts`.
- [ ] `specs/audio-dsp/` — Subtractive synth, pedal DSP, phase-vocoder WSOLA time-stretch, granular pitch-independent stretch, transient slicing. `src/lib/subtractiveSynth.ts`, `pedalboardDsp.ts`, `timeStretchVocoded.ts`, `timeStretch.ts`, `transientDetection.ts`.
- [ ] `specs/ai-automix/` — Stem analysis (LUFS/spectral/transient), genre auto-mix presets, harmonic assistant, music theory helpers. `src/lib/aiAutoMixAnalysis.ts`, `automix.ts`, `harmonicAssistant.ts`, `harmony.ts`.
- [ ] `specs/studio-resilience/` — Crash recovery, audio underrun/CPU telemetry, latency monitoring. `src/lib/crashRecovery.ts`, `audioTelemetry.ts`, `latencyMonitor.ts`.
- [ ] `specs/immersive-studio/` — Spatial audio, acoustics, scene lighting, asset/avatar systems for themed studio rooms. `app/spatial-audio.tsx`, `acoustics.tsx`, `src/lib/sceneLighting.ts`, `habboAssets.ts`.
