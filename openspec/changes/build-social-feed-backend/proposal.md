# Proposal — Build Social Feed Backend

## Context
The social layer (`app/tabs/index.tsx`, `app/tabs/moments.tsx`) is entirely mock-driven. `MOCK_POSTS` (10 entries) and `MOCK_MOMENTS` (3 entries) are in-memory arrays consumed directly by `FeedPostCard` / `MomentCard`. Like / remix / favorite actions mutate local React state only and are never persisted, so they vanish on reload and are not shared across clients. `openspec/specs/social-feed/spec.md` already flags this gap explicitly under "Implementation Notes". The backend Express surface (`backend/src/app.ts`) mounts ~20 routers but has **no** `/api/feed` route, and `supabase/schema.sql` / `backend/src/lib/sqlite.ts` have a `posts` table but no likes/remix linkage for feed use.

## Problem Description
- **No feed read endpoint.** There is no server-side source of truth for the feed, so content cannot be paginated or personalized.
- **Client-only social actions.** `handleLike` in `app/tabs/index.tsx:302` and `handleLike` in `src/components/MomentCard.tsx:119` toggle local state; nothing is persisted.
- **No likes/remix tables.** `posts`, `remixes`, `project_reactions` exist but none model per-post feed likes or remix-of-post relationships in a way the UI can call.
- **Fragile scope.** Mock arrays hardcode authors/colors/keys; real posts need a DB schema and a join to `profiles` for author identity.

## Objectives
- Add `backend/src/routes/feed.ts` with `GET /api/feed` (paginated, filterable, sortable), `POST /api/feed` (publish), `POST /api/feed/:id/like` (toggle), `POST /api/feed/:id/remix`.
- Extend the `posts` schema (Supabase + sqlite) to carry feed fields (`genre`, `key`, `bpm`, `duration`, `color`, `plays`, `type`, `caption`, `image_url`, `song_title`, `comments`, `time_ago`) and add a `post_likes` table for per-user like state.
- Swap the mock fetch in `app/tabs/index.tsx` and `app/tabs/moments.tsx` to call the API, keeping `MOCK_POSTS` / `MOCK_MOMENTS` as graceful fallback when the backend is unreachable (dev / no env).
- Persist like and remix actions through the API instead of local-only state.

## Out of Scope
- Real audio upload / waveform generation for published posts (reuse existing `generatePreviewUrl` and storage buckets).
- Real-time feed updates / websocket fan-out (covered by collaboration spec area).
- Comments write endpoint (schema column added; write API is a future change).
- Auth UI / Supabase auth wiring changes (existing `requireAuth` middleware reused).
