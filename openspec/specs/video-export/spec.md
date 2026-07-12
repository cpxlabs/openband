# Video Export

## Overview
OpenBand lets users bounce a finished mix into a shareable social video (MP4 or WebM) that layers the rendered audio with an animated waveform / RMS visual layer. The export pipeline reuses the existing mixdown renderer in `src/lib/universalAudio.ts` (`renderMixdown` at `src/lib/universalAudio.ts:202`) and the canvas frame animator in `src/lib/videoExport.ts` (`exportVideo` at `src/lib/videoExport.ts:34`, `drawFrame` at `src/lib/videoExport.ts:172`, `downloadVideoFile` at `src/lib/videoExport.ts:368`). The desktop/Electron backend also exposes an ffmpeg passthrough at `backend/src/routes/export.ts:17` (`POST /export/video`). The feature is surfaced in the studio via `src/components/BounceDialog.tsx` (`BounceDialog` at `src/components/BounceDialog.tsx:53`), which adds a `Video` mode toggle (`mode === "video"`) and the WebM/MP4 format picker (`VIDEO_FORMATS` at `src/components/BounceDialog.tsx:18`).

Because `exportVideo` relies on `MediaRecorder`, `canvas.captureStream`, and a live `AudioContext`, it is **web-only**. On non-web platforms it MUST be gated exactly like the player switch in `app/extractor.tsx:63` (`const isWeb = Platform.OS === "web"`), and the fallback error path in `src/lib/videoExport.ts:55` ("AudioContext not available — video export requires a web environment") MUST be surfaced to the user.

## Implementation Notes
`BounceDialog` maps studio tracks into `VideoExportTrack` objects (`src/components/BounceDialog.tsx:83`) and assigns per-track waveform colors based on name heuristics (drum/bass/vocal) falling back to `videoColor` (`src/components/BounceDialog.tsx:69`, `:92`). `exportVideo` first calls `audioSystem.renderMixdown` (`:45`), decodes the blob into an `AudioBuffer` (`:59`), then renders frames through `drawFrame` which draws a progress-filling waveform, beat markers, a playhead, and a BPM badge. The backend `POST /export/video` is a separate path that muxes a cover image + audio via ffmpeg `showwaves`/`boxblur`/`overlay` filters (`backend/src/routes/export.ts:36`) and is intended for the Electron desktop build, not the browser MediaRecorder path.

## Requirements

### Requirement: Web-Gated Video Mode in BounceDialog
The `BounceDialog` component MUST expose an `Audio` / `Video` mode toggle (`ExportMode` at `src/components/BounceDialog.tsx:10`) and only render the video controls when `mode === "video"`. The video export MUST be disabled/gated on non-web platforms using the `Platform.OS === "web"` check, mirroring `app/extractor.tsx:63`.

#### Scenario: Mode toggle reveals video controls
- **Given** the `BounceDialog` is open in default `audio` mode
- **When** the user taps the `Video` mode pressable (`src/components/BounceDialog.tsx:233`)
- **Then** the `VIDEO_FORMATS` picker and waveform color picker are rendered
- **And** the bit-depth / sample-rate audio controls are hidden (`:322`)

#### Scenario: Non-web platform gates video export
- **Given** the app runs on a native/desktop target where `Platform.OS !== "web"`
- **When** the user triggers video export via `handleVideoExport`
- **Then** `exportVideo` throws the "requires a web environment" error (`src/lib/videoExport.ts:55`)
- **And** `BounceDialog` shows the "Falha ao exportar vídeo. O recurso requer um navegador web." alert (`:126`)

### Requirement: MP4 and WebM Format Selection
The system MUST support both `webm` and `mp4` video containers, selected through `VIDEO_FORMATS` (`src/components/BounceDialog.tsx:18`) and passed down as `VideoExportOptions.format` (`src/lib/videoExport.ts:8`). When MP4 is unsupported by `MediaRecorder`, the renderer MUST fall back to a supported WebM mime type (`:112`).

#### Scenario: Select MP4 format
- **Given** video mode is active
- **When** the user selects `MP4`
- **Then** `videoFormat` state is `"mp4"` (`:64`) and the output filename gets the `.mp4` extension (`:116`)

#### Scenario: Unsupported MP4 falls back to WebM
- **Given** `MediaRecorder.isTypeSupported("video/mp4")` is false
- **When** `exportVideo` builds the recorder
- **Then** `supportedMimeType` resolves to `"video/webm;codecs=vp8,opus"` or `"video/webm"` (`:113`)

### Requirement: Waveform / RMS Visual Layer
The exported video MUST render an animated waveform visual layer driven by the decoded `AudioBuffer` (`drawFrame` at `src/lib/videoExport.ts:172`). At each frame the played portion of the waveform MUST be drawn in full `color`, beat markers MUST align to the BPM interval, and a white playhead MUST track playback progress.

#### Scenario: Played-portion fills with progress
- **Given** the rendered `AudioBuffer` and `progress` for the current frame
- **When** `drawFrame` draws frame `frame`
- **Then** samples up to `playedWidth` (`:260`) are stroked in `color` at full alpha
- **And** the remaining waveform is drawn at `globalAlpha = 0.3` (`:234`)

#### Scenario: Beat markers align to BPM
- **Given** `bpm` and `totalDuration`
- **When** `drawFrame` iterates beats (`:327`)
- **Then** a vertical marker is drawn at every `beat * beatInterval` where `beatInterval = 60 / bpm` (`:142`)
- **And** the BPM badge text equals `${bpm} BPM` (`:365`)

### Requirement: Per-Track Waveform Color Mapping
`BounceDialog.handleVideoExport` MUST assign each track a `color` for its waveform region based on name heuristics (drum → `#f59e0b`, bass → `#10b981`, vocal → `#ec4899`) and fall back to the user-selected `videoColor` (`src/components/BounceDialog.tsx:92`). The chosen color MUST be forwarded to `VideoExportOptions.color` (`:104`).

#### Scenario: Drum track gets amber color
- **Given** a track named "Drums"
- **When** tracks are mapped into `videoTracks`
- **Then** the region color is `#f59e0b` (`:93`)

#### Scenario: Unknown track uses selected color
- **Given** a track named "Keys" and `videoColor = "#6366f1"`
- **When** tracks are mapped
- **Then** the region color is `#6366f1`

### Requirement: Mixdown Reuse and Download
`exportVideo` MUST reuse `audioSystem.renderMixdown` (`src/lib/universalAudio.ts:202`) to produce the audio layer (not a separate renderer) and MUST persist the final blob through `downloadVideoFile` → `audioSystem.exportToFile` (`src/lib/videoExport.ts:376`). Progress MUST be reported via the `onProgress` callback at the documented stages (`:42`, `:51`, `:87`, `:136`, `:167`).

#### Scenario: Audio mixdown precedes video
- **Given** a set of `VideoExportTrack`s and `duration`
- **When** `exportVideo` runs
- **Then** `renderMixdown` is awaited first (`:45`) before any canvas frame is drawn
- **And** `onProgress` reaches `100` only after the blob is finalized (`:167`)

#### Scenario: Backend ffmpeg passthrough
- **Given** an audio path and cover path posted to `POST /export/video`
- **When** ffmpeg succeeds
- **Then** the response returns `{ url, outputPath }` with an `.mp4` file (`:34`, `:50`)
- **And** a 400 is returned when `audioPath` or `coverPath` is missing (`:20`)

## Test Requirements (Vitest)
- [ ] `BounceDialog` renders the Video format + color pickers only when `mode === "video"`
- [ ] Non-web platforms throw the "requires a web environment" error from `exportVideo`
- [ ] `VIDEO_FORMATS` includes both `webm` and `mp4` and `.mp4` extension is applied
- [ ] `exportVideo` falls back to a supported WebM mime when MP4 is unsupported
- [ ] `drawFrame` fills the played waveform portion at full alpha and the rest at 0.3
- [ ] `drawFrame` draws a beat marker every `60 / bpm` seconds
- [ ] Track color heuristics map drum/bass/vocal to the spec colors, others to `videoColor`
- [ ] `exportVideo` calls `renderMixdown` before any canvas frame and reaches `onProgress(100)` at the end
- [ ] `POST /export/video` returns 400 without audioPath/coverPath and `{url, outputPath}` on success
