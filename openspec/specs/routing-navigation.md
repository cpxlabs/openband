# OpenSpec: Routing & Navigation Specification

This document serves as the Source of Truth for screen routes, shell layout configurations, and platform deployment routing.

---

## 1. Expo Router Screen Paths

All routes are declared under the `app/` directory and resolve automatically via file-system routing:
- `/` -> `app/index.tsx` (Redirects to `/tabs/feed` or `/login` based on auth status)
- `/login` -> `app/(auth)/login.tsx` (Login page)
- `/tabs/feed` -> `app/tabs/index.tsx` (Feed page showing mock post cards)
- `/tabs/moments` -> `app/tabs/moments.tsx` (Social feed & sample packs)
- `/tabs/library` -> `app/tabs/library.tsx` (User projects list)
- `/tabs/account` -> `app/tabs/account.tsx` (Profile editing & status)
- `/tabs/settings` -> `app/tabs/settings.tsx` (Visual theme & versioning info)
- `/studio/[id]` -> `app/studio/[id].tsx` (Multi-track DAW studio mixer workspace)
- `/extractor` -> `app/extractor.tsx` (Stem separator audio upload)
- `/mastering` -> `app/mastering/index.tsx` (Smart mastering suite panel)
- `/tabs/modes` -> `app/tabs/modes.tsx` (Creative Modes hub listing all creative workflows)
- `/acoustics` -> `app/acoustics.tsx` (Room acoustics simulation)
- `/autotune` -> `app/autotune.tsx` (Real-time pitch correction)
- `/beatmaker` -> `app/beatmaker.tsx` (Beat production)
- `/cover-jam` -> `app/cover-jam.tsx` (Cover jam sessions)
- `/dj-stage` -> `app/dj-stage.tsx` (Live DJ mixing stage)
- `/live-room` -> `app/live-room.tsx` (Live performance room)
- `/lofi-tape` -> `app/lofi-tape.tsx` (Lo-fi tape recording)
- `/mixing-console` -> `app/mixing-console.tsx` (Mixing console)
- `/spatial-audio` -> `app/spatial-audio.tsx` (Spatial/immersive audio)
- `/stem-collider` -> `app/stem-collider.tsx` (Stem collision/fusion)
- `/synth-lab` -> `app/synth-lab.tsx` (Synthesizer lab)
- `/vocal-booth` -> `app/vocal-booth.tsx` (Vocal recording booth)
- `/tabs/explorer` -> `app/tabs/explorer.tsx` (Mission/explorer, also a primary tab)

### Creative Modes Hub

The `Creative Modes` hub (`/tabs/modes`) is the single primary entry point for the 13 creative workflow screens above. Each mode is registered via `CREATIVE_MODES` in `src/lib/creativeModes.ts` and surfaced as a `CommandPalette` command (category `"Modes"`) so Cmd/Ctrl+K can navigate directly to any mode. The hub is registered as a tab (`modes`) in `app/tabs/_layout.tsx` and as a flat nav item in `src/components/Sidebar.tsx`.

---

## 2. Shell Layout (`app/tabs/_layout.tsx`)

To maintain premium desktop/mobile responsivity while securing client-side routing integrity:
- **Routing Engine**: Must use the standard Expo Router `<Tabs>` component so React Navigation registers all children screens inside the routing state.
- **Hidden Native Tabs**: The bottom native tab bar is hidden on all platforms via:
  ```typescript
  screenOptions={{
    headerShown: false,
    tabBarStyle: { display: "none" }
  }}
  ```
- **Custom Desktop Layout**: Persistent side navigation (`Sidebar` component) displays on the left for wide screens.
- **Custom Mobile Layout**: A hamburger menu trigger button renders in the header, opening a custom side-sliding drawer menu overlay containing navigation options.
- **Unified Logged-In Layout**: All logged-in screens across the application (including tabs, DAW Studio `app/studio/[id].tsx`, Extractor `app/extractor.tsx`, and Mastering `app/mastering/index.tsx`) must implement the identical responsive navigation shell (desktop left-side `Sidebar`, mobile top-header hamburger menu opening the drawer overlay) to ensure navigation continuity.

---

## 3. Production Deployment Rewrites (`vercel.json`)

To prevent Vercel from returning a `404` when users refresh a page or access deep paths directly:
- All non-API routes must rewrite to the root directory `/` (where `index.html` is generated) so Expo Router's client-side SPA routing loads and resolves the URL path dynamically.
  ```json
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/" }]
  ```
