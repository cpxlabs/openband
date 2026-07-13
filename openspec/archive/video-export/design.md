# Video Export

## Design

- `renderVideoJob({ durationSec, fps, onProgress })` — renders mixdown audio + canvas/UI to WebM via `MediaRecorder`
- `isVideoExportSupported()` — checks for `MediaRecorder` + `CanvasCaptureMediaStreamTrack`
- `downloadVideoFile(blob, filename)` — triggers browser download
- Cross-platform: web only (MediaRecorder), returns rejected promise on unsupported platforms
- `exportToFile(blob, filename)` reused from `universalAudio` for final save
- BounceDialog updated with video toggle (`video` state) and rendering logic
- Located: `src/lib/videoExport.ts`, `src/components/BounceDialog.tsx`
- Test: `tests/videoExport.test.ts` — frame count, mixdown length, unsupported rejection
