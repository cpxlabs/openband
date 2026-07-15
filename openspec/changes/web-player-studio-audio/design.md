# Design: web-player-studio-audio

## Behavior mapping (existing, verified)

| Requirement | Location |
| --- | --- |
| VuMeter per track on mixer tab | `app/studio/[id].tsx` mixer tab renders `<VuMeter>` per channel (l2128) |
| Play → `startClock(25)` + `onClockTick` → `currentBeat` | `app/studio/hooks.ts` effect (l596-634) |
| Stop → `stopClock()` + reset beat | `stopPlayback` (l709-726) + play effect (l602-605) |
| Record flips `isRecording` + appends `TrackRegion` | `toggleRecording` (l432-559) |
| Add clip appends valid `TrackRegion` | `handleAddTrack`/`handleImportAudio`/`handleAddSample` append valid regions |
| Track plugin slot opens `PluginEditor` | `PluginRack.onEdit` → `setEditingPlugin` → `StudioModals` `<PluginEditor>` |
| `AutomationLane` populates `track.automation.volume` | `updateAutomation(track.id,"volume",pts)` (l830-841, l1952) |
| Group creation updates `groups`+`trackAssignments` | `TrackGroupManager.onCreateGroup` (l2497-2514) |
| Resilience (crash/telemetry/latency) | `crashRecovery.ts`, `audioTelemetry.ts`, `latencyMonitor.ts` |

## New: Master plugin chain in mixdown

`renderTracksToUrl(tracks, bpm, mood?, buses?, masterPlugins?)`:

- After `ctx.startRendering()` produces the mixed `AudioBuffer`, if `masterPlugins` is a
  non-empty array, run `applyPluginChain(buffer, masterPlugins, sampleRate, { duration })`.
- On failure, fall back to the dry mix (log + continue).
- `applyPluginChain` already special-cases mastering plugin types (eq/compressor/limiter/…).

Threading:

```
studio/[id].tsx  ──masterPlugins──▶  useStudioTransport({ masterPlugins })
                                      └─ renderTracksCached(..., masterPlugins)
                                           └─ renderTracksToUrl(..., masterPlugins)
studio/[id].tsx  rerenderAfterMuteSolo ─▶ renderTracksCached(..., masterPlugins)
```

`renderTracksCached` includes `masterPlugins` in its cache key signature so a master-chain
edit invalidates the cached bounce URL.

## Tests (pure functions)

- `clockManager`: `onClockTick` subscribe/unsubscribe; `isClockRunning` boolean; `startClock`
  is non-throwing on web.
- `automationEngine`: `buildAutomationSchedule` beats→seconds; `interpolateAutomationValue`
  linear midpoint + exponential midpoint; clamps at endpoints.
- `audioTelemetry`: ring buffer cap (`getMetricsHistory` length ≤ `ringBufferSize`);
  `getLatestMetrics` non-null; `getAverageMetrics` average + `peakCpu`; threshold callback
  fires above threshold only; `getAverageMetrics` null when empty.
- `crashRecovery`: `scheduleCrashSave` coalesces rapid calls (single flush, latest wins).
- `latencyMonitor`: `measureInputLatency` formula; `createLatencyCompensationNode` null for
  non-positive delay.
