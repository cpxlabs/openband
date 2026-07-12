# Tasks — Wire Studio Telemetry

## 1. Backend route
- [x] Create `backend/src/routes/telemetry.ts` mirroring `backend/src/routes/tier.ts` structure (default-export `Router`).
- [x] Implement `POST /telemetry`: parse `{ metrics, userAgent, platform }`, validate `metrics` numeric fields, persist to Supabase `telemetry` table or structured-log fallback, respond `200 { ok: true }` / `400` on invalid payload. Fail soft (no throws).

## 2. Mount route
- [x] In `backend/src/app.ts`: add `import telemetryRoutes from "./routes/telemetry";` and `app.use("/api", telemetryRoutes);` after the existing route mounts (~line 151).

## 3. Frontend call site
- [x] In `app/studio/[id].tsx`: import `startTelemetry`, `stopTelemetry`, `sendTelemetryReport` from `@/lib/audioTelemetry`.
- [x] In the `isPlaying` effect (`app/studio/[id].tsx:440-450`): on play call `startTelemetry({}, (m) => sendTelemetryReport(m))`; on stop call `stopTelemetry()`.
- [x] (Optional, minimal) Call `recordFrame()`/`recordUnderrun()`/`recordCpuLoad()` inside the `onClockTick` subscription (`app/studio/[id].tsx:452-459`) so metrics accumulate.

## 4. Test
- [x] Create `tests/telemetry.test.ts` — hits the Express route (or imports the route and uses `supertest`/a tiny server) asserting: valid payload → `200 { ok: true }`; malformed `metrics` → `400`; route does not throw on a payload with no Supabase table. Also assert `sendTelemetryReport` resolves `false` for an unreachable endpoint (already covered by `studio-resilience`, but pin the route exists).

## 5. Spec update
- [x] Update `openspec/specs/studio-resilience/spec.md`: remove/resolve the "Telemetry endpoint not mounted" item in "Known Gaps / TODO" and note the `/api/telemetry` route is now mounted and wired from the studio transport loop.

## Verification
- [x] `npx tsc --noEmit` — frontend type-clean.
- [x] `cd backend && npx tsc --noEmit` — backend type-clean.
- [x] `npx vitest run` — new + existing tests pass.
- [x] `npm run build` — production build succeeds.
