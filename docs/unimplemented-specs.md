# Unimplemented Specs — Tracking List

Compiled from `docs/pending-implementations.md` (unchecked Test Requirements / Known Gaps / Follow-ups in `openspec/specs/*.md`) and the open `openspec/changes/` specs not yet archived.

This is a live checklist of spec functionality that is **defined but not yet implemented**. Items are grouped by domain and mapped to the OpenSpec change that should own them.

Legend: `[ ]` = not implemented · `CHANGE:` = owning open change spec in `openspec/changes/`.

---

## 1. Auth & Tier Gating — `CHANGE: surface-auth-tier-ui` (HIGH)
- [ ] `getTierLimits("FREE")` disables `canExportVideo`; `TIER1_LIVE` enables it
- [ ] `checkTierAccess` returns the boolean limit for a feature
- [ ] Visitor session round-trips through `localStorage`
- [ ] `convertVisitorToAccount` clears the visitor session on success
- [ ] `AuthProvider` defaults to `FREE` tier (`canCreateRemixes:false`) and updates tierLimits after `/api/user/tier` fetch
- [ ] Surface tier in account/settings UI + gate remix/publish

## 2. Automation & Modulation Matrix — `CHANGE: wire-modulation-matrix` (HIGH)
- [ ] `interpolateAutomationValue` linear/exponential midpoint
- [ ] `buildAutomationSchedule` beats→seconds at given bpm
- [ ] `createDefaultBuses` + `assignTrackToBus` name-based mapping
- [ ] `wouldCreateCycle` acyclic/back-edge
- [ ] `getModSources`/`getModTargets` each return 11 entries
- [ ] `computeModulation` scaled + clamped contribution
- [ ] `applyModulation` offsets base within [min,max]
- [ ] `PluginEditor` "MOD" affordance per supported param + route assignment
- [ ] `applyPluginChain` applies `applyModulation` per routed param using live transport clock (offline `pluginChain` render NOT connected to modulation matrix)

## 3. Studio DAW — `CHANGE: web-player-studio-audio` (HIGH)
- [ ] VuMeter per track on "mixer" tab
- [ ] Play → `startClock(25)` + `onClockTick` updates `currentBeat`
- [ ] Stop → `stopClock()` + reset beat
- [ ] Record flips `isRecording` + appends `TrackRegion`
- [ ] Add clip appends valid `TrackRegion`
- [ ] Track plugin slot opens `PluginEditor`
- [ ] Draw `AutomationLane` populates `track.automation.volume`
- [ ] Group creation updates `groups`+`trackAssignments`
- [ ] Master `MasterRack` included in `renderTracksToUrl` mixdown

## 4. Social Feed Backend — `CHANGE: build-social-feed-backend` (HIGH)
- [ ] FeedPostCard/MomentCard/SamplePackCard/ProjectCard render from mock data ✅ (UI)
- [ ] Genre filter reduces visible posts
- [ ] Sort mode reorders posts
- [ ] Like increments local count
- [ ] **Not persisted:** likes/remixes/favorites need backend `/api/feed` (`backend/src/routes/feed.ts` + `src/lib/feedApi.ts`)

## 5. Studio Resilience — `CHANGE: web-player-studio-audio` (MEDIUM)
- [ ] `scheduleCrashSave` coalesces rapid calls (latest wins)
- [ ] `restoreCrashState` fails soft when IndexedDB unavailable
- [ ] Ring buffer caps `count` at `ringBufferSize`; `getLatestMetrics` latest
- [ ] `getAverageMetrics` averages + `peakCpu`
- [ ] Threshold report callback fires above thresholds
- [ ] `sendTelemetryReport` resolves `false` without throwing (endpoint mounted)
- [ ] `measureInputLatency` = `(outputLatency+baseLatency)*1000`
- [ ] `createLatencyCompensationNode` returns `null` for non-positive delay

## 6. Cloud Sync — `CHANGE: (none open)` (MEDIUM)
- [ ] `uploadAsset` dedups identical SHA-256 bytes (`duplicated:true`, 64-char hash)
- [ ] `uploadAsset` yields different hashes for different bytes
- [ ] `syncNow`/`useCloudSync` push path no-throw under mock client
- [ ] `fetchCloudProjects` returns mapped `state_json` rows
- [ ] `syncProject` records conflict when remote `commitId` differs

## 7. Collaboration CRDT — `CHANGE: (none open)` (MEDIUM)
- [ ] `mergeOperations` retains two distinct ops
- [ ] Concurrent same-path ops last-writer-wins
- [ ] `encodeState`→`decodeState` round-trips op list
- [ ] `applyOperation` applies `track.add`/`track.update`
- [ ] `usePresence` throttles cursor sends
- [ ] `usePresence` SSE subscribe + POST cursors + receive remote
- [ ] `mergeRemoteCursor` keys by userId, excludes local

## 8. Mixer Console — `CHANGE: (none open)` (MEDIUM)
- [ ] `VuMeter` fill proportional to level, clamped [0,1]
- [ ] `VuMeter` color thresholds (green<0.94, yellow 0.94-0.99, red>=1.0)
- [ ] `VuMeter` peak-hold indicator only when `peakLevel>0.01`
- [ ] Header "MIXING CONSOLE" + back button
- [ ] `createChannelStrip` schedules CHANNEL_COUNT (16) strips
- [ ] Renders 4 VU meter groups; master section with MASTER label
- [ ] `loadThree` reject → `loadError` + fallback overlay

## 9. Backend API — `CHANGE: (none open)` (MEDIUM)
- [ ] `addJob` returns id; `getJobStatus` reflects pending/processing
- [ ] `runMock` emits 4 stems w/ valid WAV (>44 bytes)
- [ ] `requireFeature` blocks FREE tier for `canExportVideo`
- [ ] `GET /api/stems/:filename` rejects path traversal (403)

## 10. Project Storage — `CHANGE: (none open)` (MEDIUM)
- [ ] `saveProject`→`loadProject` round-trips
- [ ] `importProject` valid JSON → id; invalid → null (sanitize)
- [ ] `.openband` archive round-trips via create/parse; corrupt magic → null
- [ ] `commitState` yields 64-char SHA-256 `stateHash`
- [ ] `sanitizeProjectData` defaults missing arrays + metronome

## 11. AI Automix — `CHANGE: (none open)` (LOW)
- [ ] `analyzeBuffer` finite rms/peak/lufs + normalized spectral balance
- [ ] `analyzeBuffer` detects role from name ("Kick")
- [ ] `generateAutoMix` per-track suggestions volume [0,1]
- [ ] `autoMix` classifies "Kick" + adjusts volume
- [ ] `AUTOMIX_GENRES` includes `rock`
- [ ] `suggestNextChords([])`, `chordsToMIDINotes`, `PROGRESSION_PRESETS.length===10`, `resolveProgression`

## 12. AI Voice Cleaner — `CHANGE: (none open)` (LOW)
- [ ] `PLUGIN_SPECS["voiceCleaner"]` declares all params w/ clamped ranges
- [ ] `buildPluginGraph()` includes enabled (excludes disabled) voiceCleaner
- [ ] `measureSNR` increases/holds after denoise pass (web)
- [ ] `measureRMS` in [0,1] for normalized buffer (web)

## 13. Looper / Waveform / Tuner / Chord Track — `CHANGE: (none open)` (LOW)
- [ ] Looper: record/stop/overdub/clearSlot/beatDuration/onClose
- [ ] Waveform: `generatePeakData`, `renderWaveformCanvas`, `getVisibleRange`, `LiveWaveformCanvas` rAF
- [ ] Tuner: `noteNameFromFreq` mapping, ±5¢ in-tune, instrument swap, onClose
- [ ] Chord Track: `PROGRESSION_PRESETS` 10, `suggestNextChords`, `chordsToMIDINotes`, `buildVoicing`, `keySignature` resolve

## 14. Cross-cutting Follow-ups (MEDIUM)
- [ ] `real-lufs-meter`: `src/lib/lufs.ts` (BS.1770 K-weighting, true peak) NOT implemented — `LufsMeter.tsx` stub
- [ ] `first-run-onboarding`: `OnboardingFlow.tsx` created; persistence helpers pending
- [ ] `i18n-completeness`: pt-BR default + namespace extensions pending — `CHANGE: i18n-completeness`
- [ ] `build-social-feed-backend`: `posts`/`post_likes` schema + `routes/feed.ts` pending
- [ ] `ci-pipeline`: `.github/workflows/ci.yml` not created (config only in `design.md`)
- [ ] `PluginEditor`/`OneKnob` import `modulationMatrix` but modulation NOT applied at playback time
- [ ] `audio-system.md`: recorded `url`s not persisted across reloads (follow-up spec needed)

---

## Open `changes/` specs NOT yet archived
These propose work that has not been verified as implemented/merged:
`accessibility-pass`, `comprehensive-test-suite`, `document-plugin-specs`, `i18n-completeness`, `mastering-chain-validation`, `mixer-functions`, `native-builds`, `polish-core-specs`, `project-starter-wiring`, `roadmap-v3`, `ship-wasm-binary`, `surface-auth-tier-ui`, `web-player-studio-audio`, `wire-modulation-matrix` (and empty/partial: `mastering-preset-fixes`, `project-starter-fixes`).

See `docs/pending-implementations.md` for the original compiled list and `openspec/specs/*.md` for authoritative requirement checkboxes.
