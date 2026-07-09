# Tasks: Audio Recording

- [x] Add `isArmed: boolean` to the `TrackDef` interface in `src/lib/types.ts`.
- [x] Create `public/worklets/RecordingWorklet.js` to handle real-time buffer capture.
- [x] Update `src/lib/universalAudio.ts` to manage `navigator.mediaDevices.getUserMedia` and Worklet node injection.
- [x] Add an "Arm" toggle button to the track header UI in the Studio.
- [x] Implement a live waveform visualizer component.
- [x] Wire the Transport "Record" button to capture audio on the armed track and save it to the track's regions.
- [x] Write unit tests for the recording state updates.
