# Pending Implementations (from OpenSpec specs)

Reconciled against current code on 2026-07-16. Items marked `[x]` are
implemented + verified; `[ ]` are genuinely outstanding.

## Auth (`auth/spec.md`) — DONE
- [x] `getTierLimits("FREE")` disables `canExportVideo`; `TIER1_LIVE` enables it (`src/lib/tier.ts`)
- [x] `checkTierAccess` returns the boolean limit
- [x] Visitor session round-trips through `localStorage`
- [x] `convertVisitorToAccount` clears the visitor session on success
- [x] `AuthProvider` defaults to `FREE` tier and updates tierLimits after `/api/user/tier`
- Follow-up (separate change `surface-auth-tier-ui`): surfacing tier in account/settings UI.

## Automation & Routing (`automation-routing/spec.md`) — DONE
- [x] `interpolateAutomationValue` linear/exponential midpoint
- [x] `buildAutomationSchedule` beats→seconds at given bpm
- [x] `createDefaultBuses` + `assignTrackToBus` name-based mapping
- [x] `wouldCreateCycle` acyclic/back-edge
- [x] `getModSources`/`getModTargets` each return 11 entries
- [x] `computeModulation` scaled + clamped contribution
- [x] `applyModulation` offsets base within [min,max]
- [x] `PluginEditor` "MOD" affordance per supported param + route assignment
- Resolved: offline `pluginChain` render now applies modulation per routed param (`wire-modulation-matrix`).

## Studio Resilience (`studio-resilience/spec.md`) — DONE
- [x] `scheduleCrashSave` coalesces rapid calls (latest wins)
- [x] `restoreCrashState` fails soft when IndexedDB unavailable
- [x] Ring buffer caps `count` at `ringBufferSize`; `getLatestMetrics` latest
- [x] `getAverageMetrics` averages + `peakCpu`
- [x] Threshold report callback fires above thresholds
- [x] `sendTelemetryReport` resolves `false` without throwing
- [x] `measureInputLatency` = `(outputLatency+baseLatency)*1000`
- [x] `createLatencyCompensationNode` returns `null` for non-positive delay

## Social Feed (`social-feed/spec.md`) — DONE
- [x] FeedPostCard/MomentCard/SamplePackCard/ProjectCard render from mock data
- [x] Genre filter reduces visible posts
- [x] Sort mode reorders posts
- [x] Like increments local count
- Resolved: backend `/api/feed` + `src/lib/feedApi.ts` exist (`build-social-feed-backend`).

## Cloud Sync (`cloud-sync/spec.md`) — DONE
- [x] `uploadAsset` dedups identical SHA-256 bytes (`duplicated:true`, 64-char hash)
- [x] `uploadAsset` yields different hashes for different bytes
- [x] `syncNow`/`useCloudSync` push path no-throw under mock client
- [x] `fetchCloudProjects` returns mapped `state_json` rows
- [x] `syncProject` records conflict when remote `commitId` differs

## Collaboration CRDT (`collaboration-crdt/spec.md`) — DONE
- [x] `mergeOperations` retains two distinct ops
- [x] Concurrent same-path ops last-writer-wins
- [x] `encodeState`→`decodeState` round-trips op list
- [x] `applyOperation` applies `track.add`/`track.update`
- [x] `usePresence` throttles cursor sends
- [x] `usePresence` SSE subscribe + POST cursors + receive remote
- [x] `mergeRemoteCursor` keys by userId, excludes local

## Mixer Console (`mixer-console/spec.md`) — DONE (one partial)
- [x] `VuMeter` fill proportional to level, clamped [0,1]
- [x] `VuMeter` color thresholds (green<0.94, yellow 0.94-0.99, red>=1.0)
- [x] `VuMeter` peak-hold indicator only when `peakLevel>0.01`
- [x] Header "MIXING CONSOLE" + back button
- [x] `createChannelStrip` schedules CHANNEL_COUNT (16) strips
- [x] Console renders a master section with a `MASTER` label and master fader(s)
- [x] When `loadThree` rejects, `loadError` is set and the fallback overlay renders without throwing
- [ ] Console renders 4 VU meter **groups** (current 3D scene renders 16 per-channel strips + master, but not the 4-bus-group VU layout specified) — PARTIAL

## Studio DAW (`studio-daw/spec.md`) — DONE (minor partial)
- [x] VuMeter per track on "mixer" tab
- [x] Play → `startClock(25)` + `onClockTick` updates playhead (now `playheadStore`, no full-screen re-render)
- [x] Stop → `stopClock()` + reset beat
- [x] Record flips `isRecording` + appends `TrackRegion`
- [ ] Standalone "Add clip" action (regions are only appended via the record flow) — PARTIAL
- [x] Track plugin slot opens `PluginEditor`
- [x] Draw `AutomationLane` populates `track.automation.volume`
- [x] Group creation updates `groups`+`trackAssignments`
- [x] Master `MasterRack` included in `renderTracksToUrl` mixdown

## AI Automix (`ai-automix/spec.md`) — DONE
- [x] `analyzeBuffer` finite rms/peak/lufs + normalized spectral balance
- [x] `analyzeBuffer` detects role from name ("Kick")
- [x] `generateAutoMix` per-track suggestions volume [0,1]
- [x] `autoMix` classifies "Kick" + adjusts volume
- [x] `AUTOMIX_GENRES` includes `rock`
- [x] `suggestNextChords([])`, `chordsToMIDINotes`, `PROGRESSION_PRESETS.length===10`, `resolveProgression`

## AI Voice Cleaner (`ai-voice-cleaner/spec.md`) — DONE
- [x] `PLUGIN_SPECS["voiceCleaner"]` declares all params w/ clamped ranges
- [x] `buildPluginGraph()` includes enabled (excludes disabled) voiceCleaner
- [x] `measureSNR` increases/holds after denoise pass (web) (`src/lib/plugins/voiceCleaner.ts`)
- [x] `measureRMS` in [0,1] for normalized buffer (web) (`src/lib/plugins/voiceCleaner.ts`)

## Backend API (`backend-api/spec.md`) — DONE
- [x] `addJob` returns id; `getJobStatus` reflects pending/processing
- [x] `runMock` emits 4 stems w/ valid WAV (>44 bytes)
- [x] `requireFeature` blocks FREE tier for `canExportVideo`
- [x] `GET /api/stems/:filename` rejects path traversal (403)

## Project Storage (`project-storage/spec.md`) — DONE
- [x] `saveProject`→`loadProject` round-trips
- [x] `importProject` valid JSON → id; invalid → null (sanitize)
- [x] `.openband` archive round-trips via create/parse; corrupt magic → null
- [x] `commitState` yields 64-char SHA-256 `stateHash`
- [x] `sanitizeProjectData` defaults missing arrays + metronome

## Looper (`looper/spec.md`) — DONE
- [x] Record sets `recording:true`+`activeSlot`; stop fresh slot → `onCommitLoop`+`layers++`
- [x] Overdub keeps `hasContent`; `clearSlot` resets; `beatDuration = 60/bpm`; `onClose`

## Waveform Rendering (`waveform-rendering/spec.md`) — DONE
- [x] `generatePeakData` peaks bounded [0,1], length ≈ N/(R/P)
- [x] `renderWaveformCanvas` sizes to visibleWidth×height, draws visible range
- [x] `getVisibleRange` clamped window; `WaveformCanvas` devicePixelRatio scaling
- [x] `LiveWaveformCanvas` rAF redraws + cancel on unmount

## Tuner (`tuner/spec.md`) — DONE
- [x] `noteNameFromFreq(440)`=A4/0¢; maps 12 chromatic notes; ±5¢ in-tune; sharp→positive¢
- [x] `noteNameFromFreq(0)` neutral placeholder; instrument swap reference tuning; `onClose`

## Chord Track (`chord-track/spec.md`) — DONE
- [x] `PROGRESSION_PRESETS` 10 presets (harmony.ts + chordTrackState.ts)
- [x] preset fill ≤ numBars*4 beats; `suggestNextChords` starter/Markov; transition matrix
- [x] `chordsToMIDINotes`/`chordsToMIDI` scaled by 60/bpm; `buildVoicing` CHORD_INTERVALS+inversion
- [x] `keySignature` change resolves roots via `keyToRootNote`/`getScale`

## Cross-cutting follow-ups
- [x] `real-lufs-meter`: `src/lib/lufs.ts` (BS.1770 K-weighting, true peak) implemented; `LufsMeter.tsx` consumes it.
- [x] `build-social-feed-backend`: `posts`/`post_likes` schema + `routes/feed.ts` + `feedApi.ts` done.
- [x] `first-run-onboarding`: `OnboardingFlow.tsx` + `projectStore.setOnboardingCompleted()` persistence done (flow gating minimal).
- [x] PluginEditor/OneKnob modulation applied in offline render path (`pluginChain.ts`).
- [x] `ci-pipeline`: `.github/workflows/ci.yml` created + modernized — runs frontend (tsc, vitest, legacy tests, build, Node 22) + backend (tsc, `npm ci`) on push/PR to master.
- [x] Recorded `url`s persist across reloads via durable `asset://` pointers (`recorded-url-persistence` change): asset store (IndexedDB web / bridge fs native), load hydration, engine resolves `asset://` before fetch.
- [x] Web playback no-sound + freeze fixed (`web-playback-fix` change): `resumeForGesture`, cached preview, gesture-safe play, isolated playhead store.
