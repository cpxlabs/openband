# OpenSpec: Audio Engine & System Specification

This document serves as the Source of Truth for how audio playback, multi-track mixing, and exporting are processed across web, mobile, and desktop environments.

---

## 1. Core Architecture

The audio architecture operates on a unified model using a mix of `expo-audio` (for native playback) and HTML5 Web Audio API (for web-first features and offline rendering).

---

## 2. API References & Hooks

- **Native Playback**: Uses `expo-audio` (SDK 56).
  - Hook: `useAudioPlayer(source)`
  - Hook: `useAudioPlayerStatus(player)` returning `{ playing, currentTime, duration, isLoaded }`
  - Control methods: `player.play()`, `player.pause()`, `player.seekTo(seconds)`, `player.replace(source)`
  - Volume range: `0.0` to `1.0`
- **Universal Audio System (`src/lib/universalAudio.ts`)**:
  - Singleton `UniversalAudioSystem` coordinating cross-platform audio channels.
  - Controls offline multi-track mixdown via `OfflineAudioContext` (web) or bridge filesystem calls (desktop).
- **Web Player Autoplay Policy Bypass**:
  - `ensureContext()` must be executed synchronously on user click/interaction before executing any asynchronous network requests or `player.replace()`/`player.play()` calls.
  - Blob URLs for preview audio are tracked in `currentUrlRef` and explicitly revoked on unmount or re-render to prevent memory leaks.

---

## 3. Web Studio Recording

Web capture is performed entirely in the browser via `getUserMedia` + an `AudioWorklet` (`public/worklets/RecordingWorklet.js`) and does not touch the native `expo-audio` recorder.

- **Capture entry points** (`UniversalAudioSystem`):
  - `startRecording(onChunk?)`:
    - Resolves the shared `AudioContext`, then loads `/worklets/RecordingWorklet.js` via `audioWorklet.addModule`.
    - On `addModule` failure, falls back to a `MediaRecorder` capture of the same `getUserMedia` stream (`audio/webm`) — only the encoding differs; chunks are still forwarded to `onChunk`.
    - Requests `getUserMedia({ audio: { echoCancellation:false, noiseSuppression:false, autoGainControl:false } })`. On denial it throws `Error("MIC_PERMISSION_DENIED")`; callers surface an `Alert` and clear `isRecording` instead of throwing an unhandled rejection.
    - The worklet is connected to the media-stream source but **not** to `destination`, avoiding a feedback loop. Captured `Float32Array` frames are pushed into `recordedChunks` and forwarded to `onChunk`.
  - `stopRecording()`: disconnects the worklet/source, stops every `MediaStreamTrack`, concatenates `recordedChunks` into one `Float32Array`, and returns a 2-channel WAV `Blob` via `encodeRecording`. Returns `null` when nothing was captured (no take). On the `MediaRecorder` fallback path it returns the recorded `Blob` instead.
  - `encodeRecording(chunks, sampleRate?)`: combines mono `Float32Array` chunks and writes a WAV. The single captured channel is duplicated into both L/R channels to produce a valid 2-channel WAV that `renderMixdownWeb` decodes via `fetch(region.url)`.
  - `cleanupRecording()`: disconnects nodes, stops the stream, and clears all capture state so a fresh take can always start.
- **Blob lifecycle**:
  - `createTrackedBlob(blob)` registers the object URL in the leak-protected registry (`blobUrlRegistry`) with 15-minute / 100-entry eviction.
  - `markBlobActive(url)` refreshes the URL's timestamp so it is not evicted while playing.
  - `revokeTrackedBlob(url)` safely revokes and removes a URL; used on `deleteTrack`, and on undo/redo whenever a region's `url` disappears from the project.
- **Take → region → track** (`app/studio/[id].tsx`, `toggleRecording` web branch):
  - `await audioSystem.stopRecording()`; if `null` → no region, recording state cleared.
  - Otherwise `const uri = createTrackedBlob(blob)` and a `TrackRegion { id, start, duration, url: uri }` is appended to the **armed** track, or a new `TrackDef` is created when none is armed (mirroring the native branch). Changes go through `useHistory.setState` (undo/redo).
  - After the take, `markBlobActive(uri)` is called and `rerenderAfterMuteSolo(updatedTracks)` refreshes the transport render so the take is audible on next play.
  - `webRecordingStart` and `liveRecordingDataRef` are reset after a successful take.
- **Known limitation**: recorded `url`s are object URLs valid only within the session; they are not yet persisted to `OpenBandNative`/storage across reloads. After undo/delete the URL is revoked but the project JSON still references the (now-revoked) string — a follow-up spec will persist recorded audio.
