# Design: build-social-feed-backend

## Backend contract (already present, verified)

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/feed?genre=&sort=&type=&cursor=&limit=` | List posts/moments, computed likes, `nextCursor` |
| POST | `/api/feed` | Publish a post (auth required) |
| POST | `/api/feed/:id/like` | Toggle like (auth) — returns `{ liked, likes }` |
| POST | `/api/feed/:id/favorite` | Toggle favorite (auth) — returns `{ favorited, favorites }` |
| POST | `/api/feed/:id/remix` | Create remix (auth) — returns `{ remixedProjectId, remixUrl }` |

Persistence target: `posts` + `post_likes` tables. In Supabase mode these are real tables
with RLS; in local dev the `sqlite` client (`backend/src/lib/sqlite.ts`) provides the same
interface backed by `better-sqlite3` with the same schema. No code change required for
degradation — `dbMode` selects the client automatically.

## Frontend client (`src/lib/feedApi.ts`)

Existing exports:

- `fetchFeed(params)` → `GET /api/feed`
- `publishPost(body)` → `POST /api/feed`
- `toggleLike(id)` → `POST /api/feed/:id/like`
- `toggleFavorite(id)` → `POST /api/feed/:id/favorite` with `localFavorites` Set fallback
- `createRemix(id, newProjectId?)` → `POST /api/feed/:id/remix`

Additions:

- `toggleRemix(id, newProjectId?)` — alias of `createRemix` for symmetrical naming.
- `getPosts(params?)` — thin wrapper over `fetchFeed` returning `posts` array only.

All helpers use `authedFetch` (Bearer token from Supabase session) and throw on non-2xx so
callers can decide on local fallback. `toggleFavorite` already catches failures and flips
the local Set so the UI stays responsive when backend is down.

## Tests

- `tests/feed.test.ts` (already exists) — route-level coverage against mocked Supabase.
- New `tests/feedApi.test.ts` — vitest with `vi.stubGlobal('fetch', ...)`:
  - `fetchFeed` builds correct query string and parses `{ posts, nextCursor }`.
  - `toggleLike`/`toggleFavorite`/`toggleRemix` hit correct endpoint + method.
  - `toggleFavorite` falls back to local Set when fetch rejects.
