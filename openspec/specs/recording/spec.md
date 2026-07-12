# Recording

## Overview
OpenBand lets users record **audio and MIDI into a project** from the studio DAW screen (`app/studio/[id].tsx`). Audio capture uses `getUserMedia` + an AudioWorklet on web (`UniversalAudioSystem.startRecording`/`stopRecording`, `src/lib/universalAudio.ts:131`, `:159`) and the native `useAudioRecorder` (expo-audio) path on mobile/desktop. A captured take becomes a WAV blob, registered as a tracked blob, and added to the armed track (or a new track) as a `TrackRegion` (`{ id, start, duration, url }`).

This spec defines the **feature**. The implementation plan and rollout steps live in `openspec/changes/web-studio-recording/` (proposal/design/tasks); that change is the canonical task breakdown for the web path. This spec also covers the native recording path and MIDI capture relationship.

## Implementation Notes
The web capture path is driven by `toggleRecording` (`app/studio/[id].tsx:640`). On start (web), `audioSystem.startRecording(chunk => liveRecordingDataRef.current.push(chunk))` opens the mic via `getUserMedia` with echo/noise/AGC disabled, loads `public/worklets/RecordingWorklet.js`, and streams `Float32Array` chunks through a `recording-worklet` AudioWorkletNode (`src/lib/universalAudio.ts:131`). `webRecordingStart` (`:272`) records the wall-clock start; `LiveWaveformCanvas` (`:2054`) renders `liveRecordingDataRef` live.

On stop, `audioSystem.stopRecording()` (`src/lib/universalAudio.ts:159`) disconnects the graph, stops MediaStream tracks, concatenates chunks, and encodes a 16-bit WAV blob via `float32ToWavBlob`. The blob is registered with `createTrackedBlob` (`:654`) so its URL is lifecycle-managed, and a `TrackRegion` is appended to the armed track (or a new track created) at `start = currentBeat / (bpm/60)`. All `setTracks` updates go through `useHistory` so the take is undoable.

The native path mirrors this: `useAudioRecorder(RecordingPresets.HIGH_QUALITY)` (`:227`) + `audioRecorder.stop()` yields `recorderState.url` and `durationMillis`. `recordSettings.armed` (`:642`) gates recording and opens `RecordOptions` when not armed.

## Requirements

### Requirement: Audio Capture (Web via getUserMedia)
On web, the system MUST start audio capture by requesting microphone access via `getUserMedia` and routing the stream through the `recording-worklet` AudioWorkletNode, accumulating `Float32Array` chunks into `liveRecordingDataRef` (`app/studio/[id].tsx:708`, `src/lib/universalAudio.ts:131`).

#### Scenario: Start web recording
- **Given** a track is armed (`recordSettings.armed`)
- **When** the user starts recording on web
- **Then** `audioSystem.startRecording` opens the mic and pushes chunks to the live ref
- **And** `webRecordingStart` is set and `isRecording` becomes `true`

#### Scenario: Mic permission denial
- **Given** `getUserMedia` rejects
- **When** `startRecording` runs
- **Then** the error propagates and recording does not enter the recording state

### Requirement: Capture To Blob And Region
On stop, the system MUST convert captured chunks into a WAV blob, register it via `createTrackedBlob`, and attach a `TrackRegion` (`{ id, start, duration, url }`) to the armed track — or create a new audio track when none is armed — mirroring the native branch (`app/studio/[id].tsx:651`–`:705`).

#### Scenario: Stop appends region to armed track
- **Given** an armed track and a non-empty web capture
- **When** recording stops
- **Then** `stopRecording()` returns a blob, `createTrackedBlob` registers it
- **And** a region with `url` is appended to the armed track at the current playhead beat

#### Scenario: No armed track creates new track
- **Given** no armed track and a valid blob
- **When** recording stops
- **Then** a new `TrackDef` is created with one region and selected

### Requirement: Integration With Undo And Transport
Recorded regions MUST be added through `useHistory`/`setTracks` so they are undoable, and the transport render MUST be refreshed on stop so the take is audible on the next playback. Captured blob URLs MUST be revoked on undo/delete to avoid leaks.

#### Scenario: Undo removes recorded region
- **Given** a just-recorded region added via `setTracks`
- **When** the user triggers local undo
- **Then** the region is removed from the track
- **And** its tracked blob URL is revoked

#### Scenario: Take audible after stop
- **Given** a successful stop
- **When** the transport render refreshes
- **Then** a subsequent play includes the recorded region

### Requirement: Native Recording Path
On non-web platforms, the system MUST use the native `useAudioRecorder`/`useAudioRecorderState` (expo-audio) flow (`app/studio/[id].tsx:227`), producing a region from `recorderState.url` and `durationMillis`, with the same armed-track-or-new-track logic.

#### Scenario: Native stop yields region
- **Given** native recording is active and armed
- **When** the user stops
- **Then** `audioRecorder.stop()` provides `url` and `durationMillis`
- **And** a region is appended identically to the web path

### Requirement: MIDI Capture Relationship
The system MUST treat recorded MIDI input as project edits that flow through the same `useHistory` command stack (e.g. `createNoteAddCommand`, `src/lib/history.ts:202`) so captured notes are also undoable and playable via the transport, sharing the armed-track target semantics of audio recording.

#### Scenario: Captured MIDI note is undoable
- **Given** a MIDI note captured while a track is armed
- **When** the note is added to the track
- **Then** it is stored as an undoable command via the history stack
- **And** it renders and plays back on the transport timeline

## Test Requirements (Vitest)
- [ ] Web `startRecording` requests mic and wires worklet `onmessage` chunks to callback
- [ ] `stopRecording` concatenates chunks and returns a 16-bit WAV blob (non-null when chunks present)
- [ ] `stopRecording` returns null when no chunks were captured
- [ ] `toggleRecording` web branch creates a tracked blob region on armed track
- [ ] `toggleRecording` creates a new track when none armed
- [ ] Native branch builds region from `recorderState.url`/`durationMillis`
- [ ] Recorded region is added via `useHistory` (undoable) and blob revoked on undo
- [ ] Captured MIDI note round-trips through `createNoteAddCommand` undo/redo
