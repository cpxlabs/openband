# Design — S3 Project Storage

## Architecture

```
Frontend (web/native)                       Backend (Express, :3001)
─────────────────────                       ─────────────────────────
stateAssetSeparation.ts                     routes/storage.ts  (NEW)
  commitState() ─┐                            POST /api/storage/presign-upload
  getAssetRefs() ─┤                           GET  /api/storage/presign-download/:key
                 │                            (reuses requireAuth / authMiddleware)
                 ▼
        objectStorage.ts (NEW)
          ├─ requestUploadUrl(hash, key)  ──►  backend presign PUT
          ├─ requestDownloadUrl(key)     ──►  backend presign GET
          └─ headAsset(key)
          back-ends:
            (A) s3Storage   → @aws-sdk/client-s3  [optional, env-gated]
            (B) supabaseStorage (default stand-in) → @supabase/supabase-js
            (C) mockStorage → in-memory Map       [no creds]

cloudSync.ts / supabaseRemote.ts
   └─ delegate asset upload/download to objectStorage.ts
      (SHA-256 dedup keyed on hash, preserved & extended)
```

## File / Symbol Mapping

| Concern | File | Symbols |
|---|---|---|
| Object-storage abstraction | `src/lib/objectStorage.ts` (NEW) | `ObjectStorageClient`, `requestUploadUrl`, `requestDownloadUrl`, `headAsset`, `S3StorageBackend`, `SupabaseStorageBackend`, `MockStorageBackend`, `getObjectStorage()` |
| Manifest pointer wiring | `src/lib/stateAssetSeparation.ts` | `audioAssetRef` becomes resolved URL; `getAssetRefs()` returns resolvable refs; new `resolveAssetRef` / `registerAsset` helpers |
| Cloud sync integration | `src/lib/cloudSync.ts` | `uploadProjectToStorage` delegates asset bytes to `objectStorage`; `useCloudSync` / `syncNow` unchanged public API |
| Remote upload dedup | `src/lib/supabaseRemote.ts` | `uploadAsset` reuses `objectStorage` for the byte PUT; hash dedup retained |
| Backend presign route | `backend/src/routes/storage.ts` (NEW) | `POST /api/storage/presign-upload`, `GET /api/storage/presign-download/:key`, `GET /api/storage/head/:key` |
| Route mount | `backend/src/app.ts` | `app.use("/api", storageRoutes)` near other `app.use("/api", ...)` calls (`:133`–`:151`) |
| Backend S3 config | `backend/src/lib/objectStorage.ts` (NEW, backend) | `createPresigner()` reading `S3_*` / `R2_*` env; falls back to Supabase Storage when S3 env absent |
| Spec updates | `openspec/specs/project-storage/spec.md`, `openspec/specs/cloud-sync/spec.md` | new requirements (see below) |

## Behavior Details

### `objectStorage.ts` (frontend)
- `requestUploadUrl(hash, key?)`:
  - Returns `{ url, key, method: "PUT", headers }`.
  - Calls `objectStorage.requestUploadUrl` → backend presign-upload. The backend decides the object key (default `${projectId}/${hash.slice(0,16)}.${ext}`); the **SHA-256 hash is the dedup key**.
  - If `headAsset(hash)` already resolves, returns the **existing** resolved URL so no new PUT is issued (dedup — mirrors `uploadAsset` `duplicated: true` at `supabaseRemote.ts:91`).
- `requestDownloadUrl(key)` → `{ url, method: "GET" }` from backend presign-download.
- `headAsset(key)` → boolean (asset exists in store).
- `getObjectStorage()` returns a singleton selected by env:
  - `S3_ENDPOINT` / `S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` present → S3 back-end.
  - else if Supabase env present → Supabase Storage back-end (bucket `openband-assets`).
  - else → `MockStorageBackend` (in-memory `Map<string, ArrayBuffer>` + base64 data-URL URLs) so tests and offline dev work without network.

### `stateAssetSeparation.ts` wiring
- New `registerAsset(trackId, blob)`: computes SHA-256 via existing `sha256` (`:70`), calls `objectStorage.requestUploadUrl(hash)`, PUTs `blob` to the returned URL, stores the **resolved key/URL** back into `TrackState.audioAssetRef`.
- `getAssetRefs()` (`:161`) now returns the resolved URLs (previously free-form strings).
- `commitState` (`:170`) `assetRefs` continue to reference those resolved pointers.
- No change to `stateHash` computation (SHA-256 of serialized state, `:178`).

### `cloudSync.ts` integration
- `uploadProjectToStorage` (`:23`) keeps uploading the `ProjectData` JSON to the `projects` bucket as today, **and** additionally iterates `assetRefs` and delegates each audio asset blob to `objectStorage.requestUploadUrl` + PUT. Public hook API (`useCloudSync`, `syncNow`, `saveProjectToCloud`, `fetchCloudProjects`) is unchanged.

### `supabaseRemote.ts` integration
- `uploadAsset` (`:81`) replaces its direct Supabase Storage POST (`:113`) with a call through `objectStorage` for the byte transfer while **keeping** the SHA-256 dedup (`computeHash` `:53`, `checkAssetExists` `:62`, `assetHashCache` `:37`). DB registration of the hash→id mapping is retained for dedup metadata.

### Backend `routes/storage.ts`
- `POST /api/storage/presign-upload` body `{ hash, filename, contentType }` → returns `{ key, uploadUrl, method: "PUT", headers }` via `createPresigner().presignPut(key, contentType)`.
- `GET /api/storage/presign-download/:key` → returns `{ downloadUrl, method: "GET" }`.
- `GET /api/storage/head/:key` → `{ exists: boolean }`.
- Auth: reuse `requireAuth` + `AuthenticatedRequest` exactly as `routes/projects.ts:3`.
- When no S3 env: presigner falls back to issuing Supabase Storage signed URLs (`supabase.storage.from("openband-assets").createSignedUploadUrl`) — or, in pure-mock test mode, returns an in-memory `/api/storage/mock/:key` URL served by the route itself.

### Dependency note
Default build ships **only** the Supabase Storage back-end (no new dependency — `@supabase/supabase-js` already present). The `@aws-sdk/client-s3` back-end is added **only if approved**; it is structured so it can be introduced behind the `S3_*` env vars without touching the front-end interface. This respects the "no new deps without approval" constraint.

## Test Requirements
- [ ] `MockStorageBackend` presign → PUT → GET round-trip returns identical bytes.
- [ ] Identical SHA-256 hash yields the same resolved URL (dedup, `duplicated: true`).
- [ ] `objectStorage.getObjectStorage()` selects mock when no env, Supabase when Supabase env, S3 when `S3_*` env (interface only — no live creds).
- [ ] Backend `presign-upload` returns a usable `uploadUrl` + `key`; `presign-download/:key` returns a usable `downloadUrl`.
- [ ] `stateAssetSeparation.registerAsset` stores a resolvable `audioAssetRef` and `getAssetRefs` returns it.
- [ ] `cloudSync` asset delegation does not break the existing JSON-bucket push (mock mode).
