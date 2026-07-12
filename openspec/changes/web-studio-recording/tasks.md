# Tasks — Web Studio Recording

## Phase 1: Verify & harden web capture (`src/lib/universalAudio.ts`)
- [x] **1.1** `UniversalAudioSystem.startRecording` — wrap `navigator.mediaDevices.getUserMedia(...)` in try/catch; on rejection, throw `Error("MIC_PERMISSION_DENIED")` so the caller can show an `Alert` and `setIsRecording(false)` instead of an unhandled rejection.
- [x] **1.2** `startRecording` — verify `"/worklets/RecordingWorklet.js"` loads; if `addModule` rejects, add a `MediaRecorder` fallback that captures `recordingStream` to a blob (`audio/webm`). Documented which encoder path produced the blob.
- [x] **1.3** `stopRecording` — keep the `recordedChunks.length === 0 → null` guard; ensure `mediaStreamSource` and `recordingWorkletNode` are disconnected and `recordingStream.getTracks().forEach(t => t.stop())` runs on both the worklet and `MediaRecorder` fallback paths (via `cleanupRecording`).
- [x] **1.4** `encodeRecording` / `float32ToWavBlob` — confirm the mono→2-channel duplication yields a valid WAV that `renderMixdownWeb` decodes via `fetch(region.url)`; added a comment stating the duplication is intentional.

## Phase 2: Stop → blob → region (`app/studio/[id].tsx`)
- [x] **2.1** In `toggleRecording` web-stop branch, treat `audioSystem.stopRecording()` returning `null` as "no take" → `setIsRecording(false)`, reset state, no region created.
- [x] **2.2** On a non-null blob: `const uri = createTrackedBlob(blob);` (already imported) and compute `finalDuration` from `webRecordingStart`.
- [x] **2.3** Mirror the native branch exactly: prefer `tracks.find(t => t.isArmed)`; append `{ id, start: currentBeat / (initialBpm / 60) || 0, duration: Math.max(finalDuration, 1), url: uri }`; else create a new `TrackDef` with the region and `setSelectedTrackId`.
- [x] **2.4** `setIsRecording(false)` and reset `webRecordingStart`/`liveRecordingDataRef` after a successful take.

## Phase 3: Transport play of the recorded take
- [x] **3.1** After `setTracks` in Phase 2, call `rerenderAfterMuteSolo(updatedTracks)` (web) so the take is audible immediately.
- [x] **3.2** `markBlobActive(uri)` on the recorded URL so it is not evicted during playback.
- [x] **3.3** Confirmed `renderMixdownWeb` already fetches `region.url` and schedules it at `region.start` for `region.duration`; added a comment referencing the recording path.

## Phase 4: Undo / redo + blob lifecycle cleanup
- [x] **4.1** `app/studio/[id].tsx` — added a `useEffect` that diffs `tracks` region `url`s before/after a state change (covers undo/redo); for any `url` that disappears and was a tracked blob, call `revokeTrackedBlob(url)`.
- [x] **4.2** `deleteTrack` — revokes tracked blob URLs of the deleted track's regions via `revokeTrackedBlob`.
- [x] **4.3** Verified `setTracks` routes through `useHistory.setState`, so the recording is undoable/redoable without further change.

## Phase 5: Tests
- [x] **5.1** `tests/lib9.test.ts` — replaced the conceptual "recording round-trip" stub with a real test: synthetic `Float32Array` frames → `encodeRecording` → WAV `Blob` (type `audio/wav`, 2ch/16-bit) → decode-free PCM RMS > 0; plus `encodeRecording([])` → `null` and `createTrackedBlob`/`markBlobActive`/`revokeTrackedBlob` acceptance.
- [x] **5.2** Studio recording smoke (added to `tests/studio.test.tsx` component suite): mock `audioSystem.startRecording`/`stopRecording`; first `toggleRecording` press calls `startRecording`; second press calls `stopRecording`, returns a blob, and `setTracks` gains a region on the armed track. Also asserts the permission-denied path sets `isRecording=false` without a region.
- [x] **5.3** `tests/lib9.test.ts` and `tests/studio.test.tsx` remain green under the existing mocked `OfflineAudioContext` with no real mic.

## Phase 6: Spec + docs update
- [x] **6.1** `openspec/specs/audio-system.md` — documented web recording behavior: `getUserMedia` + `RecordingWorklet.js`, `liveRecordingDataRef` accumulation, `stopRecording` → WAV blob → `createTrackedBlob` → `TrackRegion`, in-session blob lifecycle, and the known limitation that recorded `url`s are not yet persisted across reloads.
- [x] **6.2** `openspec/changes/web-player-studio-audio/tasks.md` — marked the recording capture → region → playback items as **verified/done** and referenced this change.

## Phase 7: Verification
- [~] **7.1** `npx tsc --noEmit` — zero errors in changed files (`universalAudio.ts`, `studio/[id].tsx`, `lib9.test.ts`, `studio.test.tsx`). Pre-existing unrelated errors remain in `OnboardingFlow.tsx`, `OneKnob.tsx`, `tests/plugins/dsp.test.ts`.
- [ ] **7.2** `cd backend && npx tsc --noEmit` — not run (no backend changes).
- [x] **7.3** `npx vitest run` — 983 tests pass; `lib9` recording round-trip and `studio` web recording smoke green. (9 unrelated test files fail due to pre-existing jsdom environment issues — `AudioContext`/`EventEmitter`/transform — not touched by this change.)
- [ ] **7.4** `npm run test:legacy` — not run.
- [ ] **7.5** `npm run build` — not run.
- [ ] **7.6** Code review via the `code-review` subagent (run after implementation, before commit).
- [ ] **7.7** Commit and push to `master` (deferred per task instruction: do NOT commit).
