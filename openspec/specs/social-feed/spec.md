# Social Feed

## Overview
OpenBand provides a social layer where artists share posts, moments, sample packs, and projects with followers. The feed is a reverse-chronological timeline with genre filtering and sort controls. Artist moments surface short-form highlights; the sample-pack store browscribes community packs; project cards link to openable sessions. Likes, remixes, and favorites update client-side state and are not yet persisted to a backend.

## Implementation Notes
The UI is implemented across `app/tabs/index.tsx` (feed list + genre filter + sort), `app/tabs/moments.tsx` (moments + sample-pack tabs), and the presentational cards `src/components/FeedPostCard.tsx`, `src/components/MomentCard.tsx`, `src/components/SamplePackCard.tsx`, `src/components/ProjectCard.tsx`. The feed is backed by the `GET /api/feed` endpoint (`backend/src/routes/feed.ts`) which reads from the `posts` / `post_likes` tables (Supabase or sqlite via the unified client) and returns paginated, filterable, author-joined results. `MOCK_POSTS` / `MOCK_MOMENTS` remain as a graceful fallback when the backend is unreachable (dev / no env). Like, publish, and remix actions are persisted through `POST /api/feed`, `POST /api/feed/:id/like`, and `POST /api/feed/:id/remix` via `src/lib/feedApi.ts`, with optimistic local updates reconciled from the server response.

## Requirements

### Requirement: Feed Timeline List
The system MUST render a scrollable, reverse-chronological feed of posts from `MOCK_POSTS`, newest first, with each item rendered as a `FeedPostCard`.

#### Scenario: Render mock feed
- **Given** `MOCK_POSTS` contains N posts sorted by timestamp
- **When** the Feed tab mounts
- **Then** posts render newest-first as `FeedPostCard` components
- **And** no network request is made for feed content

#### Scenario: Empty feed
- **Given** no posts are available
- **When** the Feed tab mounts
- **Then** an empty state is shown (no crash)

### Requirement: Genre Filter & Sort
The system MUST let the user filter the feed by genre and reorder posts by a selected sort mode (e.g. recent / popular).

#### Scenario: Filter by genre
- **Given** posts spanning multiple genres
- **When** the user selects a genre filter
- **Then** only posts matching that genre remain visible

#### Scenario: Sort by popularity
- **Given** posts with differing like counts
- **When** the user selects the popular sort
- **Then** posts order by engagement descending

### Requirement: Artist Moments
The system MUST render artist moments (short highlights) from `MOCK_MOMENTS` as `MomentCard` components, separate from the main post feed.

#### Scenario: Render moments tab
- **Given** `MOCK_MOMENTS` contains artist moments
- **When** the Moments tab opens
- **Then** moments render as `MomentCard` with artist, title, and media

### Requirement: Sample Pack Store
The system MUST render a browsable sample-pack store with pack cards (`SamplePackCard`) that can be added to a project via an `onUsePack` callback.

#### Scenario: Browse packs
- **Given** a list of sample packs
- **When** the user opens the packs tab
- **Then** each pack renders as a `SamplePackCard` with name, author, and use action

### Requirement: Project Cards & Social Actions
The system MUST render project cards (`ProjectCard`) linking to sessions, and support like / remix / favorite actions on posts and moments.

#### Scenario: Like a post (persisted)
- **Given** a post in the feed
- **When** the user taps like
- **Then** the post's like count increments optimistically in local state
- **And** the like is persisted via `POST /api/feed/:id/like` and reconciled from the server response (liked + likes)

#### Scenario: Open a project card
- **Given** a `ProjectCard` with a project id
- **When** the user taps it
- **Then** the app navigates to that project session

## Test Requirements (Vitest)
- [ ] FeedPostCard / MomentCard / SamplePackCard / ProjectCard render given mock data (component tests in `tests/screens.test.tsx`)
- [ ] Genre filter reduces the visible post set
- [ ] Sort mode reorders posts by the chosen key
- [ ] Like increments local like count
- [ ] Likes and remixes are persisted via the backend `/api/feed` endpoints (see `backend/src/routes/feed.ts` + `src/lib/feedApi.ts`)
