# Design — Build Social Feed Backend

## File / Endpoint Mapping

| Concern | File | Symbols / Endpoints |
|---|---|---|
| Feed router | `backend/src/routes/feed.ts` (new) | `GET /api/feed`, `POST /api/feed`, `POST /api/feed/:id/like`, `POST /api/feed/:id/remix` |
| Route mount | `backend/src/app.ts:143` | `import feedRoutes from "./routes/feed"; app.use("/api", feedRoutes)` |
| Supabase schema | `supabase/schema.sql` | extend `posts`; add `post_likes` + RLS |
| Sqlite schema | `backend/src/lib/sqlite.ts:359` | mirror `posts` extension + `post_likes` in `SCHEMA_SQL` |
| Feed fetch hook | `src/lib/feedApi.ts` (new) | `fetchFeed(params)`, `publishPost(body)`, `toggleLike(id)`, `createRemix(id)` |
| Feed screen | `app/tabs/index.tsx` | replace `useState(MOCK_POSTS)` with `fetchFeed`; keep `MOCK_POSTS` fallback |
| Moments screen | `app/tabs/moments.tsx` | replace `MOCK_MOMENTS` map with `fetchFeed({ type: "moment" })`; keep `MOCK_MOMENTS` fallback |
| Like persistence | `app/tabs/index.tsx:302` + `src/components/MomentCard.tsx:119` | call `toggleLike(id)` then update optimistic state from response |
| Feed card | `src/components/FeedPostCard.tsx` | unchanged props (`FeedPost` shape) |
| Moment card | `src/components/MomentCard.tsx` | unchanged props (`MomentData` shape) |

## Data Shapes

### `FeedPost` (frontend, `src/components/FeedPostCard.tsx:7`) — unchanged
```ts
{ id, title, author, authorHandle, genre, key, bpm, plays, likes, userLiked, duration, color }
```

### `MomentData` (frontend, `src/components/MomentCard.tsx:9`) — unchanged
```ts
{ id, artistName, artistHandle, avatar, imageUrl?, caption, songTitle, songDuration, likes, comments, userLiked, timeAgo }
```

### Extended `posts` table (DB row → API response mapping)
Existing columns: `id, user_id, project_id, title, description, master_audio_url, created_at`.
Add columns:
- `type text default 'post'` — `'post' | 'moment'`
- `genre text default ''`
- `key text default ''`
- `bpm integer default 120`
- `duration integer default 0` (seconds)
- `color text default 'bg-brand-primary'`
- `plays integer default 0`
- `caption text`
- `image_url text`
- `song_title text`
- `comments integer default 0`
- `time_ago text default 'now'`
- `author` / `authorHandle` are **derived** by joining `user_id → profiles.display_name` / `profiles.username` (fallback to `profiles.name`).

### `post_likes` table (new)
```sql
create table public.post_likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);
```
SQLite mirror uses `TEXT` ids + `unique(post_id, user_id)`.

### API response from `GET /api/feed`
```json
{
  "posts": FeedPost[] | MomentData[],
  "nextCursor": string | null
}
```
- `likes` = `count(post_likes where post_id = p.id)`.
- `userLiked` = `exists(post_likes where post_id = p.id and user_id = currentUser)`.
- `posts` sorted by `created_at desc` (or `plays desc` when `?sort=popular`).

## Endpoint Behavior

### `GET /api/feed`
Query params: `?cursor=<id>&limit=20&genre=rock&sort=recent|popular&type=post|moment`.
- Public (no `requireAuth`) so the feed is viewable without login, mirroring the existing "Posts are publicly viewable" policy.
- Paginate with keyset `created_at, id < cursor` ordering (sqlite: `datetime('now')` text compare is safe for ordering; Supabase uses `timestamptz`).
- Map each row → `FeedPost` (type `post`) or `MomentData` (type `moment`), injecting derived author + computed `likes`/`userLiked`.
- Return `{ posts, nextCursor }`. `nextCursor` = last row id when more remain, else `null`.

### `POST /api/feed` (publish)
`requireAuth`. Body: `{ title, project_id?, description?, master_audio_url, genre?, key?, bpm?, duration?, color?, type?, caption?, image_url?, song_title?, comments? }`.
- Insert row owned by `req.userTokenData.userId`; default `type='post'`.
- Return the created post (full `FeedPost`/`MomentData` shape).

### `POST /api/feed/:id/like` (toggle)
`requireAuth`.
- If `post_likes` row for `(post_id, user_id)` exists → delete it; else insert it.
- Return `{ liked: boolean, likes: number }` (recomputed count). Frontend uses this to reconcile optimistic state.

### `POST /api/feed/:id/remix`
`requireAuth`. Body optional `{ newProjectId? }`.
- Resolve source post's `project_id`. If present, create a `remixes` row (`original_project_id = post.project_id`, `remixed_project_id = newProjectId || gen_random_uuid()`, `created_by = currentUser`).
- Return `{ remixedProjectId, remixUrl: "/studio/<id>?..." }` so the frontend can navigate (mirrors existing `handleRemix` URL pattern in `app/tabs/index.tsx:319`).

## Frontend Fetch Swap

### `src/lib/feedApi.ts` (new)
- `fetchFeed({ cursor, limit, genre, sort, type })` → `GET /api/feed` with query string, returns `{ posts, nextCursor }`. Base URL `process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001"`.
- `publishPost(body)` → `POST /api/feed`.
- `toggleLike(id)` → `POST /api/feed/:id/like`.
- `createRemix(id, newProjectId?)` → `POST /api/feed/:id/remix`.
- On any network/error, throw so the caller can fall back to `MOCK_POSTS` / `MOCK_MOMENTS`.

### `app/tabs/index.tsx`
- Replace `const [posts, setPosts] = useState(MOCK_POSTS)` with `useState<FeedPost[]>([])` plus a `loading` flag.
- `useEffect` on mount: `fetchFeed({ sort, genre })` → `setPosts`; `catch` → `setPosts(MOCK_POSTS)` (keep mock as fallback). Keep `filteredPosts`/`genreFilter`/`sortMode` logic intact.
- `handleLike` (line 302): optimistic local toggle **then** `toggleLike(postId).then(res => reconcile likes/userLiked from res)`; on failure revert to mock-style local toggle.
- `handleRemix` (line 316): after building `projectId`, call `createRemix(post.id, projectId)` best-effort, then `router.push` as today.

### `app/tabs/moments.tsx`
- Map `MOCK_MOMENTS` only as fallback. On mount: `fetchFeed({ type: "moment" })` → render returned `MomentData[]`; `catch` → `MOCK_MOMENTS`.
- `MomentCard` already manages its own like state locally; wire its `handleLike` (line 119) to `toggleLike(moment.id)` for persistence while keeping optimistic update.

## Schema Migration Note
Both `supabase/schema.sql` and `backend/src/lib/sqlite.ts` (`SCHEMA_SQL` starting at line 359) must change, because the dev backend runs in `DATABASE_MODE=sqlite` (see `backend/src/lib/supabase.ts:5`). Add the `posts` column extensions and the `post_likes` table + RLS policy ("post_likes publicly viewable for counts; users manage own") in both files so the unified `supabase` client works in either mode.
