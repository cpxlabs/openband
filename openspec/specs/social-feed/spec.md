# Social Feed

## Overview
OpenBand provides a social layer where artists share posts, moments, sample packs, and projects with followers. The feed is a reverse-chronological timeline with genre filtering and sort controls. Artist moments surface short-form highlights; the sample-pack store browscribes community packs; project cards link to openable sessions. Likes, remixes, and favorites update client-side state and are not yet persisted to a backend.

## Implementation Notes
The UI is fully implemented across `app/tabs/index.tsx` (feed list + genre filter + sort + `MOCK_POSTS`), `app/tabs/moments.tsx` (moments + sample-pack tabs + `MOCK_MOMENTS`), and the presentational cards `src/components/FeedPostCard.tsx`, `src/components/MomentCard.tsx`, `src/components/SamplePackCard.tsx`, `src/components/ProjectCard.tsx`. All data rendered is **mock / local** — `MOCK_POSTS` and `MOCK_MOMENTS` are in-memory arrays. There is currently **no backend feed-read endpoint** (no `/api/feed` route exists in `backend/src`), so content cannot be paginated or personalized server-side. Like / remix / favorite actions mutate local component state only and are **not** persisted or synced across clients.

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

#### Scenario: Like a post (client-only)
- **Given** a post in the feed
- **When** the user taps like
- **Then** the post's like count increments in local state
- **And** the change is NOT persisted to any backend (mock-only)

#### Scenario: Open a project card
- **Given** a `ProjectCard` with a project id
- **When** the user taps it
- **Then** the app navigates to that project session

## Test Requirements (Vitest)
- [ ] FeedPostCard / MomentCard / SamplePackCard / ProjectCard render given mock data (component tests in `tests/screens.test.tsx`)
- [ ] Genre filter reduces the visible post set
- [ ] Sort mode reorders posts by the chosen key
- [ ] Like increments local like count
- [ ] NOTE: No backend persistence path exists yet — these are UI/local-state assertions only
