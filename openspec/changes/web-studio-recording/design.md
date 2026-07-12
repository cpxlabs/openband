# Design — Web Studio Recording

## File / Requirement Mapping

| Concern | File Touched | Symbols / Entry Points |
|---|---|---|
| Capture (getUserMedia + worklet) | `src/lib/universalAudio.ts` | `UniversalAudioSystem.startRecording(onChunk?)`, `stopRecording()`, `float32ToWavBlob`, `recordedChunks`, `recordingStream` |
| Capture worklet asset | `public/worklets/RecordingWorklet.js` | `recording-worklet` (postMessage of `Float32Array` frames) |
| Recording → region → track | `app/studio/[id].tsx` | `toggleRecording` (web branch, ~lines 561–624), `webRecordingStart`, `liveRecordingDataRef` |
| Blob lifecycle | `src/lib/universalAudio.ts`, `src/lib/universalAudio.ts` exports | `createTrackedBlob`, `revokeTrackedBlob`, `markBlobActive` |
| Transport playback of take | `app/studio/[id].tsx` | `togglePlay`, `rerenderAfterMuteSolo` (uses `audioSystem.renderMixdown` / `renderTracksToUrl`), `liveRecordingDataRef` |
| Persistence | `src/lib/projectStore.ts` | `saveProject`, `loadProject` (already persist `track.regions[].url`) |
| Undo / redo | `src/lib/history.ts` | `useHistory.setState` (snapshot stack used by `setTracks`) |
| Region type | `src/lib/types.ts` | `TrackRegion { id, start, duration, url? }`, `TrackDef.regions` |
| Settings gating | `app/studio/[id].tsx`, `src/components/RecordOptions.tsx` | `recordSettings.armed`, `RecordSettings` |

## Behavior Details

### Web capture path (verify, do not rewrite)
The existing flow already does:
```
audioSystem.startRecording((chunk) => liveRecordingDataRef.current.push(chunk))
  → getUserMedia({ audio: { echoCancellation:false, noiseSuppression:false, autoGainControl:false } })
  → AudioContext.createMediaStreamSource(stream)
  → new AudioWorkletNode(ctx, "recording-worklet")
  → worklet.port.onmessage pushes Float32Array into recordedChunks + onChunk
  (worklet NOT connected to destination → no monitoring feedback loop)
```
`stopRecording()` concatenates `recordedChunks` into one `Float32Array`, then calls
`float32ToWavBlob(combined, combined, sampleRate, 16)` and returns the WAV `Blob`.
This change **verifies and hardens** that path:
- Guard `getUserMedia` rejection (no mic / denied permission): surface an `Alert` and `setIsRecording(false)` without throwing, mirroring the native `AudioModule.requestRecordingPermissionsAsync` handling at `app/studio/[id].tsx:197`.
- Guard worklet `addModule` failure: if `"/worklets/RecordingWorklet.js"` fails to load, fall back to a `MediaRecorder` capture (record `recordingStream` to a `.webm`/`.ogg` blob); note this is the same `getUserMedia` stream, so only the encoding differs.
- Guard `recordedChunks.length === 0`: `stopRecording` already returns `null`; the caller must treat `null` as "no take" and skip region creation.
- Stereo correctness: the worklet emits a single channel. `float32ToWavBlob(combined, combined, …)` writes the mono data into both L/R (duplicate). Confirm the resulting 2-channel WAV is decoded by `renderMixdown`'s `region.url` fetch path. If mono routing is preferred, document it explicitly rather than silently duplicating.

### Stop → blob → region
After `stopRecording()` resolves (web branch, `app/studio/[id].tsx:561`):
1. `const blob = await audioSystem.stopRecording();`
2. If `blob` is `null` → abort, `setIsRecording(false)`, no region.
3. Else `const uri = createTrackedBlob(blob);` (registers URL in the leak-protected registry).
4. Compute `finalDuration = (Date.now() - (webRecordingStart || Date.now())) / 1000;`
5. Prefer the **armed** track: find `tracks.find(t => t.isArmed)`; build
   `newRegion = { id: \`region-${Date.now()}\`, start: currentBeat / (initialBpm / 60) || 0, duration: Math.max(finalDuration, 1), url: uri }`
   and `setTracks(tracks.map(t => t.id === armedTrack.id ? { ...t, regions: [...t.regions, newRegion] } : t))`.
6. If no armed track: create a new `TrackDef` exactly like the native branch (`:590`–`:612`) with the new region, `setTracks([...tracks, newTrack])`, `setSelectedTrackId(trackId)`.

### Transport play of the recorded region
- `renderMixdown` / `renderTracksToUrl` already fetches every `region.url` and schedules it at `region.start` for `region.duration` (`src/lib/universalAudio.ts` `renderMixdownWeb`). No render change is required for playback.
- After a successful web take, call `rerenderAfterMuteSolo(updatedTracks)` (or set a flag so the next `togglePlay` re-renders) so the recorded region is included in the mix. Because the render hash (per `web-player-studio-audio`) incorporates tracks, the new region changes the hash and a fresh blob is produced automatically.
- `markBlobActive(uri)` on the recorded URL so it is not evicted while playing.

### Undo / redo + blob cleanup
- `setTracks` already routes through `useHistory.setState`, so recording a take is undoable (Ctrl+Z) and redoable out of the box.
- Add cleanup so an undone/removed region does not leak its blob:
  - In `app/studio/[id].tsx`, when `undoHistory`/`redoHistory` would drop a region whose `url` is a tracked blob, revoke it via `revokeTrackedBlob(url)` (compare against the present/previous track sets). A lightweight `useEffect` diffing `tracks` before/after a history action is sufficient; only revoke URLs that disappear and are not present in the new state.
  - `deleteTrack` (`:743`) should also revoke tracked blob URLs of its regions.

### Persistence
- `saveProject(id, { ... tracks, ... })` (already in `app/studio/[id].tsx`) persists `regions` including `url`. `loadProject` restores them via `sanitizeProjectData`. The blob URL is per-session (object URLs do not survive reload), so note in `openspec/specs/audio-system.md` that recorded `url`s are tracked in-session and the project JSON still references the (now-revoked) string; a follow-up spec will persist recorded audio to `OpenBandNative`/storage. This change only guarantees correctness within a session.

## Test Hooks
- `tests/lib9.test.ts` round-trip: mock `getUserMedia` + worklet by feeding `recordedChunks` directly into a `UniversalAudioSystem`-style helper (or test `float32ToWavBlob` + `decodeAudio`-free RMS check) → produce a WAV blob → treat its object URL as a `region.url` → assert the buffer is non-silent. Keep the existing mocked `OfflineAudioContext`.
- `tests/components7.test.tsx`: render-free smoke — assert `toggleRecording` (web) with a stubbed `audioSystem` calls `startRecording`; on second press calls `stopRecording`, obtains a blob, and `setTracks` gains a region on the armed track.

## UI Flow (no visual change required)
Transport record button (`app/studio/[id].tsx:1469`) already toggles `toggleRecording`. If `recordSettings.armed` is false it opens `RecordOptions` (`:553`). No new components; behavior is unchanged for the user, only made correct and testable.
