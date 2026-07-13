# OpenSpec Tasks: Unified Audio Transport & Studio Shell Integration

Step-by-step checklist to implement transport and responsive layout changes in `app/studio/[id].tsx`.

---

## Tasks

  - [x] **1. Define Unified Transport Functions**
  - Implement `seekRelative(seconds: number)` supporting both `webAudio` (web) and `player` (native).
  - Implement `stopPlayback()` supporting both `webAudio` (web) and `player` (native), resetting the clock tick interval and current beat state.

  - [x] **2. Bind Transport Buttons**
  - Wire rewind (`⏮`) button to `seekRelative(-5)`.
  - Wire fast-forward (`⏭`) button to `seekRelative(5)`.
  - Wire stop (`⏹`) button to `stopPlayback()`.

  - [x] **3. Update Time Displays**
  - Change elapsed playhead time display to use `currentTime` instead of `player?.currentTime`.
  - Change total time estimate display to use `duration` instead of the manual calculation `player?.currentTime / progressPct`.

  - [x] **4. Responsive Layout & Navigation Integration**
  - Import the `Sidebar` component in `app/studio/[id].tsx`.
  - Declare state variable `const [drawerOpen, setDrawerOpen] = useState(false);`.
  - Define `handleNavigate(route)` to route back to `tabs` views (e.g. `/tabs/feed` or `/tabs/${route}`).
  - Wrap the main workspace return JSX block in a parent row container.
  - Render `<Sidebar>` on the left side of the workspace if `resp.isDesktop` is true.
  - Insert a hamburger menu trigger button (`☰`) at the far left of the studio header if `resp.isDesktop` is false.
  - Render the absolute-positioned mobile drawer overlay at the root of the layout when `drawerOpen` is true (matching layout style from `TabLayout`).

  - [x] **5. Verification**
  - Run typechecks: `npx tsc --noEmit`.
  - Run unit tests: `npx vitest run`.
  - Run legacy tests: `npm run test:legacy`.
