# Proposal — S3 Project Storage

## Context
`src/lib/stateAssetSeparation.ts` already defines an **OpenBandManifest v2** model (`format: "openband-v2"`) whose commits (`commitState`, `:170`) carry a SHA-256 `stateHash` and collect `assetRefs` pointing at audio assets. The manifest design explicitly anticipates **S3 URL pointers** as the asset location strategy, but today no S3/R2 client exists anywhere in the codebase. Assets cannot actually be uploaded to or downloaded from object storage.

Meanwhile cloud sync has grown two divergent paths that both bypass the manifest's intended S3 pointer model:
- `src/lib/cloudSync.ts` pushes the whole `ProjectData` blob to a Supabase Storage bucket (`projects`) and/or the `projects` table.
- `src/lib/supabaseRemote.ts` implements REST push/pull + `uploadAsset` with SHA-256 dedup, but points at Supabase Storage (`/storage/v1/object/...`) rather than S3.

The result: the manifest's S3-pointer + SHA-256-hash design is specified but never wired to a real object store, and the existing two sync paths do not share the manifest's asset-ref model.

## Problem Description
- `stateAssetSeparation.ts` has **no mechanism** to store or resolve `assetRefs` against object storage — `audioAssetRef` strings are free-form and never become resolvable URLs.
- There is **no S3/R2 client** (no `@aws-sdk/client-s3` usage, no presign route on the backend).
- `cloudSync.ts` and `supabaseRemote.ts` are **not manifest-aware**: they upload opaque blobs, ignoring the OpenBandManifest v2 asset-separation model and its SHA-256 dedup opportunity.

## Decision: Integrate alongside, do not replace
We **integrate** an S3/R2 presigned-URL flow **alongside** the existing Supabase path rather than ripping it out. Rationale:
- Supabase is already a hard dependency (`@supabase/supabase-js`) and its Storage product is S3-compatible; it can serve as the **stand-in object store** with zero new dependencies.
- The SHA-256 asset-dedup logic already proven in `supabaseRemote.ts` (`uploadAsset` + `assetHashCache`) is **preserved and extended** to the new S3 pointer shape: the hash gates whether a new presigned PUT is issued or an existing resolved URL is reused.
- A real `@aws-sdk/client-s3` (or R2 S3) implementation can be slotted behind the same interface later behind new env vars; the Supabase-storage back-end remains the default to honor the "no new deps without approval" rule.

## Objectives
- Add an object-storage abstraction `src/lib/objectStorage.ts` with a uniform interface (`requestUploadUrl`, `requestDownloadUrl`, `headAsset`) and two back-ends: (1) S3-compatible via `@aws-sdk/client-s3` (gated, optional), (2) Supabase Storage as the default S3 stand-in. Falls back to an in-memory mock when no creds are present (mirrors `supabase.ts` mock fallback, `:29`).
- Add backend route `backend/src/routes/storage.ts` issuing **presigned PUT/GET** URLs (reusing the existing `requireAuth` + `authMiddleware` pattern from `routes/projects.ts:3`), and mount it in `backend/src/app.ts`.
- Wire the resolved object-storage URL **into** `stateAssetSeparation.ts` so each `audioAssetRef` becomes a real, resolvable S3/stand-in pointer (store the returned URL on the `TrackState.audioAssetRef` / commit `assetRefs`).
- Make `cloudSync.ts` (and `supabaseRemote.ts`) **manifest-aware**: route asset uploads through the object-storage abstraction so the SHA-256 dedup stays authoritative and the manifest pointers resolve.
- Add a test exercising the full **presign → upload → download** round-trip against the mock back-end, asserting SHA-256 dedup produces identical resolved URLs.
- Update `openspec/specs/project-storage/spec.md` and `openspec/specs/cloud-sync/spec.md` to reflect the new S3 pointer wiring.

## Out of Scope
- No new npm dependency is added by default; the `@aws-sdk/client-s3` path is documented as optional/gated behind env vars and is not enabled unless approved.
- No UI changes (no new screens/components).
- No change to the Supabase Postgres `projects` table usage for state blob sync; that path coexists.
- No CRDT/collaboration changes (covered by separate `project-branching` / `collaboration-crdt` specs, still TODO).
