# Design: Audio Recording Engine

## Architecture

### 1. `RecordingWorklet.ts`
- **Objective**: Handle real-time audio streams safely off the main UI thread.
- **Mechanism**: The worklet will receive `Float32Array` chunks from the microphone input. It will pass these chunks back to the main thread via `port.postMessage` at fixed intervals (e.g., every 100ms) for waveform rendering. 

### 2. Track Arming & UI State
- **State**: Add `isArmed: boolean` to `TrackDef`.
- **UI**: Add a red "Arm" circle button to the Track header in `app/studio/[id].tsx`. When armed, pressing the main Transport "Record" button will initiate the recording flow on that specific track.
- **Waveform Canvas**: A dedicated off-screen canvas will receive the incoming chunks and draw a live waveform in real-time.

### 3. Audio Data Persistence
- **Conversion**: Upon stopping the recording, the raw Float32 data will be combined into an `AudioBuffer`.
- **Integration**: The buffer will be added to the armed track as a region (similar to how samples are handled). To ensure it persists in the Cloud Sync without blowing up JSON sizes, we will use a Base64-encoded WAV format or leverage Supabase Storage for the raw asset. (For this milestone, we will start with small in-memory buffers encoded as Base64 in the `ProjectData`).
