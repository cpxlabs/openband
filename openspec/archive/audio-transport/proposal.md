# OpenSpec Proposal: Unified Audio Transport & Studio Shell Integration

Improve and unify play, stop, rewind, and fast-forward transport functions in the DAW Studio, and integrate the responsive navigation shell (Sidebar/Drawer) for unified navigation.

---

## 1. Problem Description

Currently, the transport controls in `app/studio/[id].tsx` have several gaps, particularly on the web platform:
- Rewind (`⏮`) and Fast-forward (`⏭`) set `player.currentTime` directly. On web, the active player is `webAudio` and `player` is idle/null, making these buttons unresponsive.
- Stop (`⏹`) sets `player.currentTime = 0` but does not pause/stop playback, and does not affect the active web audio player (`webAudio`).
- The time display under the play controls renders `player?.currentTime` instead of the unified `currentTime` variable, causing the timer to stay at `00:00` on web even when audio is playing.
- **Navigation Lock-in**: The Studio page (`app/studio/[id].tsx`) is rendered as a standalone root-level route. Unlike the primary tab screens, it lacks the responsive navigation shell. Users on desktop cannot see the `Sidebar` to jump to other sections, and users on mobile/tablet have no hamburger drawer to navigate back, locking them into the studio unless they use browser history buttons.

---

## 2. Proposed Design Changes

### 2.1. Unified Transport
We will introduce unified transport helper functions within `app/studio/[id].tsx`:
- **`stopPlayback()`**: Pause playback (both web and native), seek to `0`, stop the metronome clock, and reset `currentBeat` to `0`.
- **`seekRelative(seconds)`**: Seek relative to the current playhead position by the specified number of seconds (handling both web and native).
- **Time Display**: Render `currentTime` instead of `player.currentTime` to ensure the playhead timer runs correctly on all platforms.

### 2.2. Responsive Navigation Shell Integration
To unify navigation without breaking workspace real-estate:
- **Desktop Sidebar**: Wrap the DAW Studio workspace in a parent row layout and render the `Sidebar` component on the left side of the screen when `resp.isDesktop` is true.
- **Mobile Hamburger Menu**: Insert a hamburger menu trigger button (`☰`) at the far left of the Studio header on mobile/tablet screen sizes.
- **Mobile Drawer Overlay**: Render the overlay drawer menu containing the core navigation paths (Feed, Moments, Library, etc.) when the hamburger button is clicked.
- **Route Handlers**: Bind clicks on sidebar/drawer items to navigate back to the main tabs via `router.push()`.
