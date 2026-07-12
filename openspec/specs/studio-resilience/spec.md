# Studio Resilience

## Overview
OpenBand's studio protects long editing sessions against browser crashes, audio glitches, and input/output latency. Three modules provide this: `src/lib/crashRecovery.ts` (debounced IndexedDB autosave + restore), `src/lib/audioTelemetry.ts` (ring-buffer performance metrics with threshold-triggered reporting), and `src/lib/latencyMonitor.ts` (microphone direct-monitoring plus output/base latency measurement and delay compensation). Together they keep the DAW recoverable and its audio graph time-aligned.

## Implementation Notes
- Crash recovery: `scheduleCrashSave(projectId, state)` (`crashRecovery.ts:25`) coalesces writes through a single 500ms debounce timer into a shared `pendingSaves` map, then flushes them into the `project_states` IndexedDB object store. `restoreCrashState` (`:56`), `clearCrashState` (`:83`), and `getAllCrashStates` (`:94`) read/clear snapshots. All IndexedDB access is guarded — missing `indexedDB` rejects/returns `null` rather than throwing.
- Telemetry: a fixed-size `RingBuffer` (`audioTelemetry.ts:28`, default 60 slots) stores `AudioMetrics` samples. `pushToRingBuffer` (`:50`) advances `head` modulo `ringBufferSize` and caps `count`. `recordFrame` (`:99`), `recordUnderrun` (`:114`), `recordCpuLoad` (`:118`) accumulate per-interval stats; `collectMetrics` (`:122`) snapshots them, invokes `reportCallback` when `underruns > underrunThreshold` or `cpuLoad > cpuThreshold`, then resets counters. `getLatestMetrics` (`:56`), `getMetricsHistory` (`:62`), `getAverageMetrics` (`:71`) read the buffer. `startTelemetry` (`:151`) / `stopTelemetry` (`:174`) manage the `setInterval` loop.
- Latency: `measureInputLatency(ctx)` (`latencyMonitor.ts:136`) returns `(outputLatency + baseLatency) * 1000` ms. `startDirectMonitor` (`:67`) wires mic → gain → destination for zero-plugin monitoring. `createLatencyCompensationNode` (`:144`) / `applyLatencyCompensationToTrack` (`:155`) insert a `DelayNode` (clamped to 100ms) to align tracks.

## Known Gaps / TODO
- **Telemetry endpoint (RESOLVED):** `backend/src/routes/telemetry.ts` now defines `POST /telemetry`, mounted at `/api/telemetry` in `backend/src/app.ts`. It validates the `{ metrics, userAgent, platform, projectId? }` payload, persists to the Supabase `telemetry` table with a structured-log fallback, and responds `200 { ok: true }` (`400` on invalid payload) — failing soft so a missing table never throws. The studio transport loop (`app/studio/[id].tsx`) calls `startTelemetry`/`stopTelemetry` on play/stop and reports via `sendTelemetryReport`, accumulating per-frame stats through `recordFrame`/`recordCpuLoad` in the `onClockTick` subscription.

## Requirements

### Requirement: Debounced Crash Autosave
The system MUST persist project state to IndexedDB so a session survives a crash/refresh. `scheduleCrashSave(projectId, state)` MUST debounce rapid calls: multiple invocations within the debounce window (500ms) MUST coalesce into a single IndexedDB transaction, with the latest state per `projectId` winning. Persistence MUST fail soft when IndexedDB is unavailable.

#### Scenario: Coalesce rapid saves
- **Given** `scheduleCrashSave("p1", a)` then `scheduleCrashSave("p1", b)` called within 500ms
- **When** the debounce timer fires
- **Then** a single transaction writes state `b` for `p1`
- **And** the intermediate state `a` is not separately committed

#### Scenario: Fail soft without IndexedDB
- **Given** an environment where `indexedDB` is undefined
- **When** `restoreCrashState("p1")` is called
- **Then** it resolves to `null`
- **And** no error is thrown

### Requirement: Crash State Restore & Clear
The system MUST restore a previously saved snapshot via `restoreCrashState(projectId)` (returning the stored `state` object or `null`), list snapshot metadata via `getAllCrashStates()`, and remove a snapshot via `clearCrashState(projectId)` once its project is safely reopened.

#### Scenario: Restore latest snapshot
- **Given** a snapshot exists for `p1`
- **When** `restoreCrashState("p1")` is called
- **Then** it resolves to the saved `state` object
- **And** after `clearCrashState("p1")`, restore resolves to `null`

### Requirement: Audio Telemetry Ring Buffer
The system MUST maintain a fixed-size ring buffer of `AudioMetrics` (default 60 samples) recording `underruns`, `droppedFrames`, and `cpuLoad`. Writes MUST wrap via modulo `ringBufferSize` without unbounded growth, and `getLatestMetrics` / `getMetricsHistory` / `getAverageMetrics` MUST read the most recent samples in reverse-chronological order.

#### Scenario: Buffer wraps without growth
- **Given** telemetry started with `ringBufferSize = 60`
- **When** more than 60 samples are collected
- **Then** `count` is capped at `60`
- **And** `getLatestMetrics` returns the most recently pushed sample

#### Scenario: Averaged history
- **Given** several collected samples
- **When** `getAverageMetrics(n)` is called
- **Then** it returns averaged `underruns`/`droppedFrames`/`cpuLoad` and a `peakCpu` of the max

### Requirement: Threshold Reporting & Remote Report
When telemetry is running, `collectMetrics` MUST invoke the registered `reportCallback` whenever `underruns > underrunThreshold` OR `cpuLoad > cpuThreshold`, then reset per-interval counters. `sendTelemetryReport(metrics, serverUrl?)` MUST POST the metrics to `${serverUrl}/api/telemetry` and resolve `false` (never throw) on network failure. The server route is now mounted (`backend/src/routes/telemetry.ts` at `/api/telemetry`).

#### Scenario: Report fired above threshold
- **Given** `underrunThreshold = 5` and a callback registered
- **When** an interval records `underruns = 6`
- **Then** the callback is invoked with the metrics
- **And** the underrun counter resets to `0` after the interval

#### Scenario: Remote report fails soft
- **Given** no reachable `/api/telemetry` endpoint
- **When** `sendTelemetryReport(metrics)` is called
- **Then** it resolves to `false`
- **And** it does not throw

### Requirement: Latency Measurement & Compensation
The system MUST measure round-trip latency via `measureInputLatency(ctx)` returning `(ctx.outputLatency + ctx.baseLatency) * 1000` in milliseconds, and MUST provide delay-based compensation. `createLatencyCompensationNode(ctx, delayMs)` MUST return `null` for non-positive delay and otherwise a `DelayNode` whose `delayTime` is `min(0.1, delayMs / 1000)`. `applyLatencyCompensationToTrack` MUST pass a track node through unchanged when no compensation is needed.

#### Scenario: Compute output+base latency
- **Given** a context with `outputLatency = 0.01` and `baseLatency = 0.005`
- **When** `measureInputLatency(ctx)` is called
- **Then** it returns `15` (milliseconds)

#### Scenario: No compensation for zero delay
- **Given** `delayMs = 0`
- **When** `createLatencyCompensationNode(ctx, 0)` is called
- **Then** it returns `null`
- **And** `applyLatencyCompensationToTrack(ctx, node, 0)` returns the original node

## Test Requirements (Vitest)
- [ ] `scheduleCrashSave` coalesces rapid calls into one write (latest wins)
- [ ] `restoreCrashState` fails soft (`null`) when IndexedDB is unavailable
- [ ] Ring buffer caps `count` at `ringBufferSize` and `getLatestMetrics` returns latest
- [ ] `getAverageMetrics` averages history and reports `peakCpu`
- [ ] Threshold report callback fires above `underrunThreshold` / `cpuThreshold`
- [ ] `sendTelemetryReport` resolves `false` without throwing on failure (endpoint gap)
- [ ] `measureInputLatency` returns `(outputLatency + baseLatency) * 1000`
- [ ] `createLatencyCompensationNode` returns `null` for non-positive delay
