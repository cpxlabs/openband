# Tasks: Audio Recording

- [ ] Add `isArmed: boolean` to the `TrackDef` interface in `src/lib/types.ts`.
- [ ] Create `public/worklets/RecordingWorklet.js` to handle real-time buffer capture.
- [ ] Update `src/lib/universalAudio.ts` to manage `navigator.mediaDevices.getUserMedia` and Worklet node injection.
- [ ] Add an "Arm" toggle button to the track header UI in the Studio.
- [ ] Implement a live waveform visualizer component.
- [ ] Wire the Transport "Record" button to capture audio on the armed track and save it to the track's regions.
- [ ] Write unit tests for the recording state updates.
