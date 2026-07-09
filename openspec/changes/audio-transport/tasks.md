# OpenSpec Tasks: Unified Audio Transport System

Step-by-step checklist to implement the transport improvements in `app/studio/[id].tsx`.

---

## Tasks

- [ ] **1. Define Unified Transport Functions**
  - Implement `seekRelative(seconds: number)` supporting both `webAudio` (web) and `player` (native).
  - Implement `stopPlayback()` supporting both `webAudio` (web) and `player` (native), and resetting the clock + current beat state.

- [ ] **2. Bind Transport Buttons**
  - Wire rewind (`⏮`) to `seekRelative(-5)`.
  - Wire fast-forward (`⏭`) to `seekRelative(5)`.
  - Wire stop (`⏹`) to `stopPlayback()`.

- [ ] **3. Update Time Displays**
  - Change `formatTime(player?.currentTime ?? 0)` to `formatTime(currentTime)`.
  - Change total time estimate calculations to use `currentTime` instead of `player?.currentTime`.

- [ ] **4. Verification**
  - Run typechecks: `npx tsc --noEmit`.
  - Run unit tests: `npx vitest run`.
  - Run legacy tests: `npm run test:legacy`.
