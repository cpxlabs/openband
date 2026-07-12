# Backend API

## Overview
The OpenBand backend is an Express app (`backend/src/app.ts`) exposing ~18 REST routes under `/api`. It centralizes security (headers, CORS allowlist, per-IP rate limiting), feature gating by tier, and background media processing (stem separation via Demucs, master bounce, contextual MIDI generation). Demucs is a **local/desktop** dependency and is NOT available on Vercel; when `checkDemucsInstalled()` is false the endpoint falls back to a mock that writes silent WAVs, and the web extractor UI shows a gating message.

## Implementation Notes
- `backend/src/app.ts` — builds the Express app: CORS with an origin allowlist (localhost origins + `*.vercel.app`), security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Strict-Transport-Security`, removes `X-Powered-By`), an in-memory per-IP `rateLimit(30, 15m)` applied to `/api`, a `checkBlacklist` middleware, `express.json({ limit: "1mb" })`, tier-gated sub-routers (`canExportVideo`, `canCreateRemixes`, `canPublishToFeed`), and `GET /api/health` returning `{ status, demucs }`.
- `backend/src/routes/extract.ts` — `POST /api/extract` (multer upload → `runDemucs` if installed else `runMock`), `GET /api/stems/:filename` (path-traversal guarded), `POST /api/stems/manifest`. The Demucs subprocess lives in `backend/src/services/demucs.ts`; `backend/src/services/queue.ts` is an in-memory job queue used for async separation.
- `backend/src/routes/master.ts` — `POST /api/master/bounce` (streams upload to `masters/`, parses bitDepth/sampleRate/format) and `GET /api/master/download/:filename`.
- `backend/src/routes/generator.ts` — `POST /api/generate-midi`: resolves a chord progression from key/genre/userPrompt via `backend/src/lib/musicTheory.resolveProgression` and emits MIDI note events.
- `backend/src/routes/projects.ts` + related — project CRUD (`GET /api/projects`, `DELETE /api/projects/:id` soft-delete, `PATCH /api/projects/:id/tracks/:trackId`) and `publish` (tier-gated). Additional routers: `auth`, `magicLink`, `sessions`, `trash`, `activity`, `dna`, `bands`, `mixingTemplates`, `hydration`, `stems`, `presence`, `collab`, `tier`.
- `backend/src/services/*` — `demucs.ts` (subprocess), `mock.ts` (`runMock` writes silent WAVs), `queue.ts` (`addJob` / `getJobStatus` in-memory queue). `backend/src/middleware/upload.ts` configures multer (200MB limit).

## Requirements

### Requirement: Security Headers + CORS Allowlist + Rate Limit
The app MUST set security headers, restrict CORS to an allowlist (localhost + `*.vercel.app`), and apply a per-IP rate limit (`30` req / `15m`) to all `/api` routes.

#### Scenario: Unknown origin rejected by CORS
- **Given** a request with `Origin: https://evil.example.com`
- **When** the CORS handler runs
- **Then** the callback errors with "Not allowed by CORS"

#### Scenario: Rate limit triggers after threshold
- **Given** the same IP sends `31` requests within `15m`
- **When** the `31st` request hits `/api`
- **Then** the response is `429`

### Requirement: Stem Extraction Endpoint (Demucs + Mock Fallback + Queue)
`POST /api/extract` MUST accept an uploaded audio file and separate stems using the Demucs subprocess when installed, otherwise fall back to `runMock` (silent WAVs). Separation SHOULD be tracked via the in-memory job queue.

#### Scenario: Demucs unavailable → mock fallback
- **Given** `checkDemucsInstalled()` is `false`
- **When** `POST /api/extract` receives a file
- **Then** `runMock` produces 4 stems (drums/bass/vocals/other) and a `warning` notes Demucs is not installed

#### Scenario: Path-traversal guarded
- **Given** `GET /api/stems/..%2f..%2fsecret`
- **When** the handler resolves the path
- **Then** the response is `403 Forbidden`

### Requirement: Master Bounce Endpoint
`POST /api/master/bounce` MUST accept an audio upload and return a bounced file descriptor (filename, url, parsed `bitDepth`, `sampleRate`, `format`), defaulting to `24` bit / `44100` Hz / `wav`.

#### Scenario: Defaults applied
- **Given** an upload with no bitDepth/sampleRate/format body
- **When** the bounce completes
- **Then** `bitDepth === 24`, `sampleRate === 44100`, `format === "wav"`

### Requirement: Contextual MIDI Generator Endpoint
`POST /api/generate-midi` MUST accept `{ bpm, key, timeSignature, userPrompt }`, resolve a chord progression (via `resolveProgression`), and return sorted MIDI note events with `bars` and `totalNotes`.

#### Scenario: Default key when absent
- **Given** a request body with no `key`
- **When** generation runs
- **Then** `key` defaults to `"C Major"` and `midiData` is non-empty and sorted by `start`

### Requirement: Project CRUD + Publish
The app MUST support listing projects (`GET /api/projects`), soft-deleting (`DELETE /api/projects/:id`), patching tracks (`PATCH /api/projects/:id/tracks/:trackId`), and publishing (`POST /api/projects/:id/publish`) which is tier-gated by `canPublishToFeed`.

#### Scenario: Publish gated by tier
- **Given** header `x-user-tier: FREE`
- **When** `POST /api/projects/:id/publish` is called
- **Then** the response is `403`

### Requirement: Health Check
The app MUST expose `GET /api/health` returning `{ status: "ok", demucs: boolean }`, lazily caching the Demucs-detection result.

#### Scenario: Health responds ok
- **Given** the app is running
- **When** `GET /api/health` is called
- **Then** the body has `status === "ok"` and a boolean `demucs`

## Test Requirements (Vitest)
- [ ] `addJob` returns an id and `getJobStatus` reflects `pending`/`processing`
- [ ] `runMock` emits 4 stems with valid WAV files (size > 44 bytes header)
- [ ] `requireFeature` blocks `FREE` tier for `canExportVideo`
- [ ] `GET /api/stems/:filename` rejects path traversal (`403`)
