# Tasks: build-social-feed-backend

## 1. Verify existing backend (no-op confirmation)
- [x] `backend/src/routes/feed.ts` implements all 5 endpoints.
- [x] `posts` + `post_likes` schema present in `supabase/schema.sql` and `backend/src/lib/sqlite.ts`.
- [x] RLS degrades gracefully (sqlite fallback when no Supabase env).

## 2. Extend frontend client `src/lib/feedApi.ts`
- [ ] Add `toggleRemix(id, newProjectId?)` alias to `createRemix`.
- [ ] Add `getPosts(params?)` convenience wrapper returning `posts` array.
- [ ] Keep `toggleFavorite` local-fallback behavior intact.

## 3. Add frontend vitest tests `tests/feedApi.test.ts`
- [ ] Mock global `fetch` with `vi.stubGlobal`.
- [ ] Cover `fetchFeed` query building + parse.
- [ ] Cover `toggleLike` / `toggleFavorite` / `toggleRemix` endpoints + HTTP method.
- [ ] Cover `toggleFavorite` local fallback when fetch throws.

## 4. Verify
- [ ] `npx tsc --noEmit` (frontend) passes.
- [ ] `npx vitest run tests/feedApi.test.ts` passes.
- [ ] `npx vitest run tests/feed.test.ts` still passes.
- [ ] `cd backend && npx tsc --noEmit` passes.
