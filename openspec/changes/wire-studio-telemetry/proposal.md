# Proposal — Wire Studio Telemetry

## Context
`src/lib/audioTelemetry.ts` is fully implemented: it maintains a fixed-size ring buffer of `AudioMetrics` (`underruns`, `droppedFrames`, `cpuLoad`, …) and exposes `startTelemetry` / `stopTelemetry` plus `sendTelemetryReport(metrics, serverUrl?)` (`audioTelemetry.ts:203`), which `fetch`-POSTs to `${serverUrl}/api/telemetry`.

However, the module has **zero importers** today and the backend **does not mount any `/api/telemetry` route**. `sendTelemetryReport` catches the 404 failure and returns `false`, so the metric is silently dropped. The `studio-resilience` spec already documents this exact gap in its "Known Gaps / TODO" section (`openspec/specs/studio-resilience/spec.md:11-12`).

## Problem
Telemetry data never leaves the client. The studio transport loop collects metrics but nothing reports them, and even if `sendTelemetryReport` were called, the server would 404.

## Objectives
- Add an Express route `POST /api/telemetry` that validates and persists reports (Supabase `telemetry` table, with a console/structured log fallback when no table is provisioned).
- Wire the studio transport loop (`app/studio/[id].tsx`) to start telemetry on playback and report via `sendTelemetryReport`.
- Close the documented gap in `openspec/specs/studio-resilience/spec.md`.

## Scope
**M** — one new backend route + one mount line + one call site in the studio screen + one test + spec update. No dependency changes.

## Out of Scope
- Latency monitoring (`latencyMonitor.ts`) — separate concern.
- Frontend metrics UI / dashboard — not part of this fix.
- Realtime aggregation/alerting on the server.
