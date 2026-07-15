# Proposal: build-social-feed-backend

## Context

The OpenBand social Feed UI already renders posts/moments from mock data and wires genre
filter, sort mode, and like increment locally. However, interaction state (likes, remixes,
favorites) was not supposed to persist. Investigation revealed the backend contract and most
of the implementation already exist:

- `backend/src/routes/feed.ts` already exposes `GET /api/feed`, `POST /api/feed`,
  `POST /api/feed/:id/like`, `POST /api/feed/:id/favorite`, `POST /api/feed/:id/remix`.
- `supabase/schema.sql` and `backend/src/lib/sqlite.ts` already define `posts` and
  `post_likes` tables with `liked`/`remixed`/`favorited` flags and RLS that degrades
  gracefully (SQLite fallback used when no Supabase env).
- `src/lib/feedApi.ts` already provides `fetchFeed`, `toggleLike`, `toggleFavorite`
  (with local fallback), `createRemix`, and the Feed UI (`app/tabs/index.tsx`) already
  calls them.
- `tests/feed.test.ts` already covers the route logic against a mocked Supabase client.

## Objective

Complete and harden the remaining gaps so the "Social Feed" pending requirements are fully
satisfied and verifiable:

1. Add a parity `toggleRemix` client helper mirroring `createRemix`.
2. Add a `getPosts` convenience wrapper backed by `fetchFeed` with graceful degradation.
3. Add vitest unit tests for `src/lib/feedApi.ts` that mock `fetch`, covering the success
   path and the local-fallback path when the backend is unreachable.
4. Keep backend migration-friendly by ensuring schema comments/columns are sufficient.

## Out of scope

- No changes to `src/lib/types.ts`, `package.json`, tsconfig, or any shared config files.
- No new dependencies (only vitest, already present for frontend tests).
