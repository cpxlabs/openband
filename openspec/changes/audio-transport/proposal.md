# OpenSpec Proposal: Unified Audio Transport System

Improve and unify play, stop, rewind, and fast-forward transport functions in the DAW Studio to support both web (`useWebAudioPlayer`) and native (`expo-audio`) targets.

---

## 1. Problem Description

Currently, the transport controls in `app/studio/[id].tsx` have several gaps, particularly on the web platform:
- Rewind (`⏮`) and Fast-forward (`⏭`) set `player.currentTime` directly. On web, the active player is `webAudio` and `player` is idle/null, making these buttons unresponsive.
- Stop (`⏹`) sets `player.currentTime = 0` but does not pause/stop playback, and does not affect the active web audio player (`webAudio`).
- The time display under the play controls renders `player?.currentTime` instead of the unified `currentTime` variable, causing the timer to stay at `00:00` on web even when audio is playing.

---

## 2. Proposed Design Changes

We will introduce unified transport helper functions within `app/studio/[id].tsx`:
- **`stopPlayback()`**: Pause playback (both web and native), seek to `0`, stop the metronome clock, and reset `currentBeat` to `0`.
- **`seekRelative(seconds)`**: Seek relative to the current playhead position by the specified number of seconds (handling both web and native).
- **Time Display**: Render `currentTime` instead of `player.currentTime` to ensure the playhead timer runs correctly on all platforms.
