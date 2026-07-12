# Tasks — Web Studio Recording

## Phase 1: Verify & harden web capture (`src/lib/universalAudio.ts`)
- [ ] **1.1** `UniversalAudioSystem.startRecording` — wrap `navigator.mediaDevices.getUserMedia(...)` in try/catch; on rejection, throw a typed error (or return `false`) so the caller can show an `Alert` and `setIsRecording(false)` instead of an unhandled rejection.
- [ ] **1.2** `startRecording` — verify `"/worklets/RecordingWorklet.js"` loads; if `addModule` rejects, add a `MediaRecorder` fallback that captures `recordingStream` to a blob (`.webm`/`.ogg`). Document which encoder path produced the blob.
- [ ] **1.3** `stopRecording` — keep the `recordedChunks.length === 0 → null` guard; ensure `mediaStreamSource` and `recordingWorkletNode` are disconnected and `recordingStream.getTracks().forEach(t => t.stop())` runs even on the fallback path.
- [ ] **1.4** `float32ToWavBlob(combined, combined, sampleRate, 16)` — confirm the mono→2-channel duplication yields a valid WAV that `renderMixdownWeb` decodes via `fetch(region.url)`; add a one-line comment stating the duplication is intentional, or switch to a true mono WAV if preferred (document the choice).

## Phase 2: Stop → blob → region (`app/studio/[id].tsx`)
- [ ] **2.1** In `toggleRecording` web-stop branch (~`:561`), treat `audioSystem.stopRecording()` returning `null` as "no take" → `setIsRecording(false)`, no region created.
- [ ] **2.2** On a non-null blob: `const uri = createTrackedBlob(blob);` (already imported) and compute `finalDuration` from `webRecordingStart`.
- [ ] **2.3** Mirror the native branch exactly: prefer `tracks.find(t => t.isArmed)`; append `{ id, start: currentBeat / (initialBpm / 60) || 0, duration: Math.max(finalDuration, 1), url: uri }`; else create a new `TrackDef` with the region and `setSelectedTrackId`.
- [ ] **2.4** `setIsRecording(false)` and reset `webRecordingStart`/`liveRecordingDataRef` after a successful take.

## Phase 3: Transport play of the recorded take
- [ ] **3.1** After `setTracks` in Phase 2, trigger a render refresh so the take is audible: call `rerenderAfterMuteSolo(updatedTracks)` (web) or rely on the render hash change in next `togglePlay`. Prefer calling `rerenderAfterMuteSolo` for immediate feedback.
- [ ] **3.2** `markBlobActive(uri)` on the recorded URL so it is not evicted during playback.
- [ ] **3.3** Confirm `renderMixdownWeb` (`:214`) already fetches `region.url` and schedules it at `region.start` for `region.duration`; add a comment referencing the recording path.

## Phase 4: Undo / redo + blob lifecycle cleanup
- [ ] **4.1** `app/studio/[id].tsx` — add a `useEffect` that diffs `tracks` before/after a history action (`undoHistory`/`redoHistory`); for any region `url` that disappears and is a tracked blob, call `revokeTrackedBlob(url)`.
- [ ] **4.2** `deleteTrack` (`:743`) — revoke tracked blob URLs of the deleted track's regions via `revokeTrackedBlob`.
- [ ] **4.3** Verify `setTracks` routes through `useHistory.setState` (it does) so the recording is undoable/redoable without further change.

## Phase 5: Tests
- [ ] **5.1** `tests/lib9.test.ts` — replace the conceptual "recording round-trip" stub (`:495`) with a real test:
  - Feed synthetic `Float32Array` frames into the capture→`float32ToWavBlob` path (or a small exported helper) to produce a WAV `Blob`.
  - Create `URL.createObjectURL(blob)` (or `createTrackedBlob`), build `{ id, start: 0, duration: 1, url }`, and assert the decoded buffer RMS > 0 (non-silent) using the existing mocked `OfflineAudioContext`.
  - Assert `createTrackedBlob`/`markBlobActive` accept the URL without throwing.
- [ ] **5.2** `tests/components7.test.tsx` — Studio recording smoke:
  - Mock `audioSystem.startRecording`/`stopRecording`; first `toggleRecording` press calls `startRecording`; second press calls `stopRecording`, returns a blob, and `tracks` gains a region on the armed track.
  - Assert permission-denied path sets `isRecording=false` without a region.
- [ ] **5.3** Ensure `tests/lib9.test.ts` and `tests/components7.test.tsx` remain green with the existing mocked `OfflineAudioContext` and no real mic.

## Phase 6: Spec + docs update
- [ ] **6.1** `openspec/specs/audio-system.md` — document web recording behavior: `getUserMedia` + `RecordingWorklet.js`, `liveRecordingDataRef` accumulation, `stopRecording` → WAV blob → `createTrackedBlob` → `TrackRegion`, in-session blob lifecycle, and the known limitation that recorded `url`s are not yet persisted across reloads.
- [ ] **6.2** `openspec/changes/web-player-studio-audio/tasks.md` — mark Phase 9 (Recording capture → region → playback, items 9.1–9.3) as **verified/done** and reference this change.

## Phase 7: Verification
- [ ] **7.1** `npx tsc --noEmit` — zero errors.
- [ ] **7.2** `cd backend && npx tsc --noEmit` — zero errors.
- [ ] **7.3** `npx vitest run` — all new + existing tests pass.
- [ ] **7.4** `npm run test:legacy` — legacy node:test suite passes.
- [ ] **7.5** `npm run build` — production build succeeds.
- [ ] **7.6** Code review via the `code-review` subagent (run after implementation, before commit).
- [ ] **7.7** Commit and push to `master` (spec + implementation together per the SDD loop, after review passes).
