# Tasks — S3 Project Storage

Docs-only change spec (no code is implemented in this change). Each task is a documentation/planning item that the implementation phase will execute.

## 1. Object-storage abstraction (frontend)
  - [x] Create `src/lib/objectStorage.ts` with `ObjectStorageClient` interface: `requestUploadUrl(hash, filename, contentType)`, `requestDownloadUrl(key)`, `headAsset(key)`.
  - [x] Implement `SupabaseStorageBackend` (default stand-in, reuses `@supabase/supabase-js`) targeting bucket `openband-assets`.
  - [x] Implement `MockStorageBackend` (in-memory `Map`, base64 data-URLs) used when no creds — mirrors `supabase.ts` `createMockClient` (`:29`).
  - [x] Implement `S3StorageBackend` (optional, `@aws-sdk/client-s3`) gated behind `S3_*` env vars; do NOT add the dependency unless approved.
  - [x] Export `getObjectStorage()` singleton selecting back-end by env.

## 2. Manifest pointer wiring
  - [x] In `src/lib/stateAssetSeparation.ts`, add `registerAsset(trackId, blob)` that SHA-256 hashes (reuse `sha256`, `:70`), calls `objectStorage.requestUploadUrl`, PUTs bytes, and writes the resolved key/URL into `TrackState.audioAssetRef`.
  - [x] Update `getAssetRefs()` (`:161`) to return resolved URLs.
  - [x] Keep `commitState` (`:170`) `stateHash` + `assetRefs` behavior unchanged.

## 3. Cloud-sync integration
  - [x] In `src/lib/cloudSync.ts`, have `uploadProjectToStorage` (`:23`) also delegate audio `assetRefs` through `objectStorage` while keeping the `projects`-bucket JSON push.
  - [x] Preserve public API: `useCloudSync`, `syncNow` (`:38`), `saveProjectToCloud` (`:201`), `fetchCloudProjects` (`:228`).

## 4. Remote upload dedup
  - [x] In `src/lib/supabaseRemote.ts`, route `uploadAsset` (`:81`) byte transfer through `objectStorage`, retaining `computeHash` (`:53`), `checkAssetExists` (`:62`), `assetHashCache` (`:37`) dedup and DB hash→id registration.

## 5. Backend presign route + mount
  - [x] Create `backend/src/routes/storage.ts` with `POST /api/storage/presign-upload`, `GET /api/storage/presign-download/:key`, `GET /api/storage/head/:key` using `requireAuth`/`AuthenticatedRequest` (as `routes/projects.ts:3`).
  - [x] Create `backend/src/lib/objectStorage.ts` `createPresigner()` reading `S3_*`/`R2_*` env; fall back to Supabase signed URLs; provide in-memory mock URL mode for tests.
  - [x] Mount `storageRoutes` in `backend/src/app.ts` near `:143`–`:151` (`app.use("/api", storageRoutes)`).

## 6. Tests
  - [x] Add `src/lib/objectStorage.test.ts` — MockStorageBackend presign→PUT→GET round-trip; identical-hash dedup returns same URL; `getObjectStorage()` selection logic.
  - [x] Add `backend/src/routes/storage.test.ts` (or extend existing backend tests) — presign-upload returns `uploadUrl`+`key`; presign-download returns `downloadUrl`; head returns `exists`.
  - [x] Add `src/lib/stateAssetSeparation.s3.test.ts` — `registerAsset` stores resolvable `audioAssetRef`; `getAssetRefs` returns it.
  - [x] Assert `cloudSync` asset delegation does not break JSON-bucket push under mock mode.

## 7. Spec updates
  - [x] Update `openspec/specs/project-storage/spec.md`: add requirement "OpenBandManifest v2 Assets Resolve To Object-Storage URLs" with round-trip + dedup scenarios; note `objectStorage.ts` + `stateAssetSeparation` wiring.
  - [x] Update `openspec/specs/cloud-sync/spec.md`: add requirement "Assets Sync Via Object Storage With SHA-256 Dedup" noting `objectStorage` delegation and the alongside-Supabase decision.

## 8. Verification
  - [x] `npx tsc --noEmit` clean (frontend)
  - [x] `cd backend && npx tsc --noEmit` clean (backend)
  - [x] `npx vitest run` passes (including new `objectStorage`, `stateAssetSeparation.s3`, backend `storage` tests)
  - [x] `npm run build` succeeds
