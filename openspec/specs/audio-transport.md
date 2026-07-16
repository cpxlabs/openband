# OpenSpec: Audio Transport Specification

This document serves as the Source of Truth for the design, architecture, and behavior of the audio transport control system (Play, Pause, Stop, Rewind, Fast-Forward) in the OpenBand DAW Studio.

---

## 1. Overview & Objectives

The Audio Transport System governs the timeline playhead, playback status, clock tick synchronization (for metronome/sequencer), and seek operations. It must behave identically across Web (HTML5 Audio), Desktop (Electron), and Mobile (Expo Native).

---

## 2. Core Transport States

The transport bar coordinates four primary states:

| State Variable | Data Type | Description | Source (Web) | Source (Native) |
| :--- | :--- | :--- | :--- | :--- |
| `isPlaying` | `boolean` | Indicates if audio playback is currently active. | `webAudio.isPlaying` | `player.playing` |
| `currentTime` | `number` | The current position of the playhead in seconds. | `webAudio.currentTime` | `status.currentTime` |
| `duration` | `number` | The total duration of the project audio in seconds. | `webAudio.duration` | `status.duration` |
| `currentBeat` | `number` | The relative position of the playhead in beats. | Derived from `audioTime` | Derived from `audioTime` |

---

## 3. Playback Operations & API

### 3.1. Toggle Play (`togglePlay`)
- **Action**: Alternates between playing and paused states.
- **Web Pipeline (autoplay-policy compliant)**:
  - Synchronously call `audioSystem.resumeForGesture()` **inside the user gesture** to resume the `AudioContext` without awaiting (never throws, never consumes the gesture window).
  - Dynamically render active tracks to a temporary blob URL (if needed/dirty). Heavy per-track `OfflineAudioContext` stem rendering MUST NOT run synchronously on the main thread during `togglePlay`; reuse cached renders and/or delegate to an off-main-thread worker.
  - Execute `webAudio.replace(url)` and await `webAudio.play()` (rejections propagate to the caller so a tap-to-retry UI can be shown — `useWebAudioPlayer.play()` must not swallow them).
- **Native Pipeline**:
  - Load the rendered URL onto the `expo-audio` player.
  - Execute `player.replace(url)` and await `player.play()`.

### 3.1.1. Web Playback Autoplay Compliance (Test Requirements)
- [x] `audioSystem.resumeForGesture()` resumes a `suspended` `AudioContext` without throwing and without requiring an `await` for the resume to be issued — it must be callable synchronously from within a click/keydown handler.
- [x] Feed `handlePlay` (web) invokes `resumeForGesture()` (or `webAudio.unlock()`/`play()`) **before** any awaited preview/blob generation (`generatePreviewUrl`) completes, preserving the user-activation window.
- [x] `useWebAudioPlayer.play()` rejects when called without user activation (does NOT silently swallow the autoplay rejection), enabling a tap-to-retry affordance.
- [x] Studio `togglePlay` (web) calls `resumeForGesture()` as the first action after `unlock()`, before any awaited `ensureContext()` / `engine.prepare()`.

### 3.1.2. Web Playback Freeze Avoidance (Test Requirements)
- [x] `togglePlay` does not synchronously construct a per-track `OfflineAudioContext` on the main thread during the call (rendering is delegated/cached/off-thread).
- [x] The 40 Hz clock tick updates the playhead via an isolated external store (`playheadStore`) and does NOT call `setCurrentBeat` for the per-tick update, so the entire Studio screen is not re-rendered each tick (only the subscribed playhead display re-renders).
- [x] A heavy child of the Studio screen (e.g. `AutomationLane` / transport bar) renders exactly once across multiple clock ticks while playing.

### 3.2. Stop Playback (`stopPlayback`)
- **Action**: Pauses audio immediately and resets playhead to start.
- **Behavior**:
  - Execute `.pause()` on the active player target.
  - Seek back to `0` seconds.
  - Stop the metronome clock tick interval.
  - Reset `currentBeat` and `currentTime` to `0`.

### 3.3. Relative Seeking (`seekRelative`)
- **Action**: Shifts playhead forward or backward by a delta of seconds.
- **Behavior**:
  - Calculate `targetTime = Math.max(0, currentTime + delta)`.
  - Execute `.seekTo(targetTime)` on the active player target.
  - Update `currentTime` state immediately for responsive rendering.

---

## 4. Metronome & Clock Tick Integration

The timeline playhead position is bound to a high-precision clock listener:
- **Metronome Beat Calculation**:
  - Whenever the transport is playing, a clock tick listener receives the current elapsed `audioTime`.
  - Beat formula: `beat = ((audioTime * bpm) / 60) % (beatsPerMeasure * 4)`.
- **Clock Lifecycle**:
  - When `isPlaying` is `true`, start the master clock worker.
  - When `isPlaying` is `false` (Paused or Stopped), stop the master clock worker.

---

## 5. UI & Layout Integration

The transport UI elements in the studio header must bind directly to these unified handlers:

- **Rewind (`⏮`)**: Binds to `seekRelative(-5)`.
- **Play/Pause (`▶` / `⏸`)**: Binds to `togglePlay()`. Visual color alternates (`bg-green-600` when active).
- **Stop (`⏹`)**: Binds to `stopPlayback()`.
- **Fast-Forward (`⏭`)**: Binds to `seekRelative(5)`.
- **Timer Display**: Renders `{formatTime(currentTime)} / {formatTime(duration)}`.
