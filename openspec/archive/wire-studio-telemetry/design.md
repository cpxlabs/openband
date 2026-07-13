# Design — Wire Studio Telemetry

## Backend route: `backend/src/routes/telemetry.ts`
Mirror the simple route shape used by `backend/src/routes/tier.ts` (a `Router` default export). Implement:

- `POST /telemetry` (mounted under `/api`, so the full path is `/api/telemetry`).
- Parse `req.body`, which `sendTelemetryReport` sends as:
  ```json
  { "metrics": { AudioMetrics }, "userAgent": string, "platform": string }
  ```
- Validate `metrics`:
  - present and an object
  - numeric `underruns`, `droppedFrames`, `cpuLoad`, `peakCpu`, `timestamp`
  - ignore/`400` reject if malformed (defensive guard; the client always sends a well-formed `AudioMetrics`).
- Persist with a **best-effort** approach consistent with the project's Supabase mock fallback (`src/lib/supabase.ts`): if a `telemetry` table exists, insert `{ project_id?, user_agent, platform, metrics, created_at }`; otherwise `console.log`/structured-log the report. Must **never throw** (fail soft) so a broken table doesn't crash requests.
- Respond `200 { ok: true }` on success, `400` on invalid payload.

## Mount in `backend/src/app.ts`
Add the import and mount after the existing route mounts (around `backend/src/app.ts:149-151`):
```ts
import telemetryRoutes from "./routes/telemetry";
...
app.use("/api", telemetryRoutes);
```
It inherits the existing `/api` `rateLimit(30, …)`, `checkBlacklist`, `cors`, and `express.json()` middleware — no new middleware needed.

## Frontend wiring: `app/studio/[id].tsx`
`audioTelemetry.ts` already uses `fetch` (works on web + native via expo/fetch). No API changes needed there.

- Import `startTelemetry`, `stopTelemetry`, `sendTelemetryReport` from `@/lib/audioTelemetry`.
- In the existing `isPlaying` effect (`app/studio/[id].tsx:440-450`): when `isPlaying` becomes true, call `startTelemetry({}, (metrics) => { sendTelemetryReport(metrics); })` so `collectMetrics` threshold crosses (default `underrunThreshold=5`, `cpuThreshold=80`) trigger a remote report. When playback stops, call `stopTelemetry()`.
- Optionally call `recordFrame()` / `recordUnderrun()` / `recordCpuLoad()` inside the existing `onClockTick` subscription (`app/studio/[id].tsx:452-459`) so the ring buffer actually accumulates per-frame stats. Keep this minimal — only what makes the report meaningful.

## Data flow
```
studio playback → startTelemetry(interval 1000ms)
  → collectMetrics() → reportCallback (above threshold)
    → sendTelemetryReport(metrics) fetch POST /api/telemetry
      → backend/src/routes/telemetry.ts → validate → log/persist → 200
```

## Notes
- Frontend uses `fetch` (expo/fetch on native, global `fetch` on web). Backend uses Express `req.body` (already JSON-parsed at `backend/src/app.ts:109`).
- `sendTelemetryReport` already resolves `false` instead of throwing on network error, so the client is safe regardless of server state.
