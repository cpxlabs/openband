# Pending Implementations (from OpenSpec specs)

Compiled from `openspec/specs/*.md` (unchecked Test Requirements, Known Gaps, and Follow-ups).

## Auth (`auth/spec.md`)
- [ ] `getTierLimits("FREE")` disables `canExportVideo`; `TIER1_LIVE` enables it
- [ ] `checkTierAccess` returns the boolean limit for a feature
- [ ] Visitor session round-trips through `localStorage`
- [ ] `convertVisitorToAccount` clears the visitor session on success
- [ ] `AuthProvider` defaults to `FREE` tier (`canCreateRemixes:false`) and updates tierLimits after `/api/user/tier` fetch
- Follow-up: surfacing tier in account/settings UI + gating remix/publish (`surface-auth-tier-ui` change)

## Automation & Routing (`automation-routing/spec.md`)
- [ ] `interpolateAutomationValue` linear/exponential midpoint
- [ ] `buildAutomationSchedule` beats→seconds at given bpm
- [ ] `createDefaultBuses` + `assignTrackToBus` name-based mapping
- [ ] `wouldCreateCycle` acyclic/back-edge
- [ ] `getModSources`/`getModTargets` each return 11 entries
- [ ] `computeModulation` scaled + clamped contribution
- [ ] `applyModulation` offsets base within [min,max]
- [ ] `PluginEditor` "MOD" affordance per supported param + route assignment
- **Follow-up (not yet wired):** `applyPluginChain` does NOT apply `applyModulation` per routed param using the live transport clock — offline `pluginChain` render not connected to modulation matrix (`wire-modulation-matrix` change).

## Studio Resilience (`studio-resilience/spec.md`)
- [ ] `scheduleCrashSave` coalesces rapid calls (latest wins)
- [ ] `restoreCrashState` fails soft when IndexedDB unavailable
- [ ] Ring buffer caps `count` at `ringBufferSize`; `getLatestMetrics` latest
- [ ] `getAverageMetrics` averages + `peakCpu`
- [ ] Threshold report callback fires above thresholds
- [ ] `sendTelemetryReport` resolves `false` without throwing (endpoint now mounted)
- [ ] `measureInputLatency` = `(outputLatency+baseLatency)*1000`
- [ ] `createLatencyCompensationNode` returns `null` for non-positive delay
- Resolved: Telemetry `/api/telemetry` route mounted (was Known Gap).

## Social Feed (`social-feed/spec.md`)
- [ ] FeedPostCard/MomentCard/SamplePackCard/ProjectCard render from mock data
- [ ] Genre filter reduces visible posts
- [ ] Sort mode reorders posts
- [ ] Like increments local count
- **Not persisted:** Likes/remixes/favorites need backend `/api/feed` (`backend/src/routes/feed.ts` + `src/lib/feedApi.ts`).

## Cloud Sync (`cloud-sync/spec.md`)
- [ ] `uploadAsset` dedups identical SHA-256 bytes (`duplicated:true`, 64-char hash)
- [ ] `uploadAsset` yields different hashes for different bytes
- [ ] `syncNow`/`useCloudSync` push path no-throw under mock client
- [ ] `fetchCloudProjects` returns mapped `state_json` rows
- [ ] `syncProject` records conflict when remote `commitId` differs

## Collaboration CRDT (`collaboration-crdt/spec.md`)
- [ ] `mergeOperations` retains two distinct ops
- [ ] Concurrent same-path ops last-writer-wins
- [ ] `encodeState`→`decodeState` round-trips op list
- [ ] `applyOperation` applies `track.add`/`track.update`
- [ ] `usePresence` throttles cursor sends
- [ ] `usePresence` SSE subscribe + POST cursors + receive remote
- [ ] `mergeRemoteCursor` keys by userId, excludes local

## Mixer Console (`mixer-console/spec.md`)
- [ ] `VuMeter` fill proportional to level, clamped [0,1]
- [ ] `VuMeter` color thresholds (green<0.94, yellow 0.94-0.99, red>=1.0)
- [ ] `VuMeter` peak-hold indicator only when `peakLevel>0.01`
- [ ] Header "MIXING CONSOLE" + back button
- [ ] `createChannelStrip` schedules CHANNEL_COUNT (16) strips
- [ ] Renders 4 VU meter groups; master section with MASTER label
- [ ] `loadThree` reject → `loadError` + fallback overlay

## Studio DAW (`studio-daw/spec.md`)
- [ ] VuMeter per track on "mixer" tab
- [ ] Play → `startClock(25)` + `onClockTick` updates `currentBeat`
- [ ] Stop → `stopClock()` + reset beat
- [ ] Record flips `isRecording` + appends `TrackRegion`
- [ ] Add clip appends valid `TrackRegion`
- [ ] Track plugin slot opens `PluginEditor`
- [ ] Draw `AutomationLane` populates `track.automation.volume`
- [ ] Group creation updates `groups`+`trackAssignments`
- [ ] Master `MasterRack` included in `renderTracksToUrl` mixdown

## AI Automix (`ai-automix/spec.md`)
- [ ] `analyzeBuffer` finite rms/peak/lufs + normalized spectral balance
- [ ] `analyzeBuffer` detects role from name ("Kick")
- [ ] `generateAutoMix` per-track suggestions volume [0,1]
- [ ] `autoMix` classifies "Kick" + adjusts volume
- [ ] `AUTOMIX_GENRES` includes `rock`
- [ ] `suggestNextChords([])`, `chordsToMIDINotes`, `PROGRESSION_PRESETS.length===10`, `resolveProgression`

## AI Voice Cleaner (`ai-voice-cleaner/spec.md`)
- [ ] `PLUGIN_SPECS["voiceCleaner"]` declares all params w/ clamped ranges
- [ ] `buildPluginGraph()` includes enabled (excludes disabled) voiceCleaner
- [ ] `measureSNR` increases/holds after denoise pass (web)
- [ ] `measureRMS` in [0,1] for normalized buffer (web)

## Backend API (`backend-api/spec.md`)
- [ ] `addJob` returns id; `getJobStatus` reflects pending/processing
- [ ] `runMock` emits 4 stems w/ valid WAV (>44 bytes)
- [ ] `requireFeature` blocks FREE tier for `canExportVideo`
- [ ] `GET /api/stems/:filename` rejects path traversal (403)

## Project Storage (`project-storage/spec.md`)
- [ ] `saveProject`→`loadProject` round-trips
- [ ] `importProject` valid JSON → id; invalid → null (sanitize)
- [ ] `.openband` archive round-trips via create/parse; corrupt magic → null
- [ ] `commitState` yields 64-char SHA-256 `stateHash`
- [ ] `sanitizeProjectData` defaults missing arrays + metronome

## Looper (`looper/spec.md`)
- [ ] Record sets `recording:true`+`activeSlot`; stop fresh slot → `onCommitLoop`+`layers++`
- [ ] Overdub keeps `hasContent`; `clearSlot` resets; `beatDuration = 60/bpm`; `onClose`

## Waveform Rendering (`waveform-rendering/spec.md`)
- [ ] `generatePeakData` peaks bounded [0,1], length ≈ N/(R/P)
- [ ] `renderWaveformCanvas` sizes to visibleWidth×height, draws visible range
- [ ] `getVisibleRange` clamped window; `WaveformCanvas` devicePixelRatio scaling
- [ ] `LiveWaveformCanvas` rAF redraws + cancel on unmount

## Tuner (`tuner/spec.md`)
- [ ] `noteNameFromFreq(440)`=A4/0¢; maps 12 chromatic notes; ±5¢ in-tune; sharp→positive¢
- [ ] `noteNameFromFreq(0)` neutral placeholder; instrument swap reference tuning; `onClose`

## Chord Track (`chord-track/spec.md`)
- [ ] `PROGRESSION_PRESETS` 10 presets (harmony.ts + chordTrackState.ts)
- [ ] preset fill ≤ numBars*4 beats; `suggestNextChords` starter/Markov; transition matrix
- [ ] `chordsToMIDINotes`/`chordsToMIDI` scaled by 60/bpm; `buildVoicing` CHORD_INTERVALS+inversion
- [ ] `keySignature` change resolves roots via `keyToRootNote`/`getScale`

## Cross-cutting follow-ups (from HY3-HANDOFF.md)
- `real-lufs-meter`: `src/lib/lufs.ts` (BS.1770 K-weighting, true peak) NOT yet implemented — `LufsMeter.tsx` stub.
- `first-run-onboarding`: `OnboardingFlow.tsx` created; persistence helpers pending.
- `i18n-completeness`: pt-BR default + namespace extensions pending.
- `build-social-feed-backend`: `posts`/`post_likes` schema + `routes/feed.ts` pending.
- `ci-pipeline`: `.github/workflows/ci.yml` not created (config in `design.md`).
- `PluginEditor`/`OneKnob` import `modulationMatrix` but modulation NOT applied at playback time.
- `audio-system.md`: recorded `url`s are not persisted across reloads (follow-up spec needed).
