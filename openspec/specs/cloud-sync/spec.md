# Cloud Sync

## Overview
OpenBand synchronizes a project's JSON state to remote storage and a Supabase Postgres table. Sync is a **storage-sync / last-write-wins** model, not a git-style 3-way merge: the entire `ProjectData` blob is uploaded (storage bucket `projects`) and/or upserted (table `projects`), and any divergence is resolved by keeping the most recent writer. A React hook auto-pushes local saves on a 5-second debounce. When no Supabase env vars are present, `src/lib/supabase.ts` falls back to an in-memory mock client so the app remains fully usable offline.

## Implementation Notes
- `src/lib/cloudSync.ts` — `syncNow(projectId)`, `useCloudSync(projectId)`, `saveProjectToCloud(project)`, `fetchCloudProjects()`. The hook registers a `setOnProjectSaved` callback; each local save clears the prior debounce timer and schedules a new upload after `DEBOUNCE_MS = 5000`. `getSyncState(projectId)` exposes `{ isSyncing, lastSyncedAt, pending, error }`.
- `src/lib/supabaseRemote.ts` — REST push/pull: `pushState`, `pullState`, `syncProject`, `uploadAsset`, `checkAssetExists`, `configureRemote`, `disposeRemote`. `uploadAsset` hashes the bytes with SHA-256 via `crypto.subtle.digest` and dedups against an in-memory `assetHashCache`; identical hashed bytes return `duplicated: true` instead of re-uploading. `syncProject` pulls the remote head; if its `commitId` equals the local one it pushes (last-write-wins / no-op), otherwise it records a `conflicts: 1` and retains the remote state.
- `src/lib/supabase.ts` — `supabase` is the real client when `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set, else a `createMockClient()` with in-memory auth + DB stores (`projects` array). No env → no network.

## Requirements

### Requirement: Debounced Auto-Push
The system MUST auto-push a project to remote storage after a local save, coalescing rapid saves via a debounce (5s) so only the latest state is uploaded.

#### Scenario: Rapid saves coalesce into one upload
- **Given** `useCloudSync(projectId)` is mounted and the project is saved three times within 4 seconds
- **When** 5 seconds elapse
- **Then** exactly one `uploadProjectToStorage` call occurs
- **And** `getSyncState(projectId).lastSyncedAt` is set and `isSyncing` returns to `false`

### Requirement: Manual Push On Demand
The system MUST allow an immediate synchronous upload that cancels any pending debounce.

#### Scenario: syncNow overrides debounce
- **Given** a debounced upload is pending
- **When** `syncNow(projectId)` is called
- **Then** the pending timer is cleared and the upload happens immediately

### Requirement: Asset Dedup via SHA-256
The system MUST compute a SHA-256 hash of asset bytes (`uploadAsset`) and skip re-uploading when an identical hash already exists, returning `duplicated: true` with the existing asset id/url.

#### Scenario: Identical bytes are deduped
- **Given** `uploadAsset` is called with blob A
- **When** `uploadAsset` is called again with byte-identical blob A
- **Then** the second result has `duplicated: true` and an equal `hash`
- **And** the two hashes are 64-char hex SHA-256 strings

#### Scenario: Different bytes produce a different hash
- **Given** `uploadAsset` was called with blob A
- **When** `uploadAsset` is called with blob B (different bytes)
- **Then** the hashes differ and `duplicated` is `false`

### Requirement: Pull / Fetch Remote State
The system MUST fetch the user's remote projects from the `projects` table (`fetchCloudProjects`) and pull a specific project state via `pullState` / `syncProject`.

#### Scenario: Fetch returns stored projects
- **Given** projects were upserted for the authenticated user
- **When** `fetchCloudProjects()` is called with a session
- **Then** the returned `data` maps each row's `state_json` into `ProjectData`

### Requirement: Conflict Handling (Last-Write-Wins)
The system MUST treat sync as whole-state last-write-wins. If the remote head `commitId` equals the local `commitId`, push succeeds; if they differ, a conflict is recorded (`conflicts: 1`) and the remote state is retained (no merge, no overwrite).

#### Scenario: Divergent remote is flagged, not merged
- **Given** the remote `commitId` differs from the local one
- **When** `syncProject` runs
- **Then** `result.conflicts === 1` and `pushed === 0`

### Requirement: Offline Mock Fallback
The system MUST fall back to an in-memory mock Supabase client when no env vars are configured, so `syncNow` / `saveProjectToCloud` / `fetchCloudProjects` run without network and without throwing.

#### Scenario: No env vars present
- **Given** `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` are unset
- **When** `supabase` is imported
- **Then** a mock client with in-memory `projects` store is used

## Test Requirements (Vitest)
- [ ] `uploadAsset` dedups identical SHA-256 bytes (`duplicated: true`, equal 64-char hash)
- [ ] `uploadAsset` yields different hashes for different bytes (`duplicated: false`)
- [ ] `syncNow` / `useCloudSync` push path does not throw under the mock client
- [ ] `fetchCloudProjects` returns mapped `state_json` rows
- [ ] `syncProject` records a conflict when remote `commitId` differs
