# Tasks — Build Social Feed Backend

## 1. Schema migration
- [ ] Extend `posts` table in `supabase/schema.sql` (~line 57) with columns: `type, genre, key, bpm, duration, color, plays, caption, image_url, song_title, comments, time_ago` (match `design.md` data shapes)
- [ ] Extend `posts` table in `backend/src/lib/sqlite.ts` `SCHEMA_SQL` (~line 359) with the same columns (TEXT ids, `datetime('now')` default)
- [ ] Add `post_likes` table + RLS policy ("publicly viewable; users manage own") to `supabase/schema.sql`
- [ ] Add `post_likes` table (`TEXT` ids, `unique(post_id, user_id)`) to `backend/src/lib/sqlite.ts` `SCHEMA_SQL`

## 2. Backend route + mount
- [ ] Create `backend/src/routes/feed.ts`:
  - `GET /api/feed` (public) — paginated keyset, `genre`/`sort`/`type` filters, maps row → `FeedPost`/`MomentData`, computes `likes` + `userLiked` from `post_likes`, returns `{ posts, nextCursor }`
  - `POST /api/feed` (`requireAuth`) — publish row owned by `req.userTokenData.userId`, returns created post
  - `POST /api/feed/:id/like` (`requireAuth`) — toggle `post_likes`, returns `{ liked, likes }`
  - `POST /api/feed/:id/remix` (`requireAuth`) — create `remixes` row from source `project_id`, return `{ remixedProjectId, remixUrl }`
- [ ] Mount in `backend/src/app.ts` with `import feedRoutes from "./routes/feed"; app.use("/api", feedRoutes)` (near line 143, after `projectsRoutes`)

## 3. Frontend fetch swap
- [ ] Create `src/lib/feedApi.ts` with `fetchFeed`, `publishPost`, `toggleLike`, `createRemix` (throw on error so callers can fall back to mocks)
- [ ] `app/tabs/index.tsx`: replace `useState(MOCK_POSTS)` with async `fetchFeed` load + `loading`; keep `MOCK_POSTS` as `catch` fallback; keep `genreFilter`/`sortMode`/`filteredPosts` logic
- [ ] `app/tabs/index.tsx` `handleLike` (line 302): optimistic toggle + `toggleLike(id)` reconcile from response; revert on failure
- [ ] `app/tabs/index.tsx` `handleRemix` (line 316): best-effort `createRemix(post.id, projectId)` before `router.push`
- [ ] `app/tabs/moments.tsx`: `fetchFeed({ type: "moment" })` on mount, render returned `MomentData[]`, `catch` → `MOCK_MOMENTS`
- [ ] `src/components/MomentCard.tsx` `handleLike` (line 119): call `toggleLike(moment.id)` for persistence alongside optimistic state

## 4. Tests
- [ ] Create `tests/feed.test.ts`:
  - route `GET /api/feed` returns seeded posts with `likes` + `nextCursor`
  - `POST /api/feed/:id/like` toggles `liked`/`likes` (second call reverts)
  - `POST /api/feed` creates a post owned by the authenticated user
  - frontend fallback: when API unreachable, `index.tsx`/`moments.tsx` render mock data (component/mock assertion)
- [ ] Update `openspec/specs/social-feed/spec.md` — remove the "no backend feed-read endpoint / like not persisted" gap note; mark like/remix persistence as backend-backed

## 5. Verification
- [ ] `npx tsc --noEmit` — frontend clean
- [ ] `cd backend && npx tsc --noEmit` — backend clean
- [ ] `npx vitest run` — passes (incl. `tests/feed.test.ts`)
- [ ] `npm run build` — succeeds
