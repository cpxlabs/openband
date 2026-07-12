# Proposal — Web Studio Recording

## Context
`app/studio/[id].tsx` is the DAW screen and must let users record audio into a project. It already carries **two** capture paths: the native `useAudioRecorder` flow (expo-audio) and a **web** capture path introduced by the `web-player-studio-audio` change — `audioSystem.startRecording(cb)` / `audioSystem.stopRecording()` backed by `getUserMedia` + an AudioWorklet (`public/worklets/RecordingWorklet.js`), with `liveRecordingDataRef: Float32Array[]` accumulating chunks and `webRecordingStart` tracking the wall-clock start time.

The web path exists but is **unverified and incomplete**:
- The capture correctness (permissions, worklet load, mono/stereo interleaving, WAV header) has never been exercised by a test.
- On stop, the code *does* create a blob and a `TrackRegion`, but it does not auto-trigger a re-render/transport update so the user hears the take, nor does it explicitly register the blob for lifecycle tracking or clean up the URL on undo/delete.
- The conceptual recording round-trip test in `tests/lib9.test.ts` (lines 495–509) is a stub, not a real round-trip.

This change finishes and verifies the web recording path so a recorded take reliably becomes a playable, undoable, persisted track region — mirroring the native `useAudioRecorder` flow.

## Problem Description
- Web capture via `UniversalAudioSystem.startRecording` / `stopRecording` is unproven; edge cases (mic permission denial, worklet load failure, zero-length capture) are not handled symmetrically with the native path.
- Stopping a web recording produces a blob and a region, but the recorded region is not guaranteed to be registered as a tracked blob, nor is the stale render refreshed so the take is audible on the next transport play.
- `setTracks` additions go through `useHistory`, so undo is partially covered, but the underlying blob URL can leak (never revoked) when the region/track is undone or deleted.
- No real test proves: capture → blob → region → `renderMixdown` yields non-silent output.

## Objectives
- Verify and harden the web capture path (`getUserMedia` + `RecordingWorklet.js` → `Float32Array` chunks → WAV blob).
- On stop, convert the captured blob into a `TrackRegion` (`{ id, start, duration, url }`) attached to the armed track, or create a new audio track when none is armed — exactly mirroring the native branch in `toggleRecording`.
- Register the blob via `createTrackedBlob`, keep it lifecycle-clean (revoke on undo/delete), and refresh the transport render so the take is audible.
- Persist the region via `saveProject` (already supported) and keep it undoable via `useHistory`.
- Add/extend a real recording round-trip test in `tests/lib9.test.ts` (and a UI smoke test in `tests/components7.test.tsx`).
- Update the `web-player-studio-audio` spec's Phase 9 to "verified" status.

## Scope
- **Scope M.** Single feature, contained to: `src/lib/universalAudio.ts` (capture hardening), `app/studio/[id].tsx` (`toggleRecording` web branch + transport refresh + undo cleanup), `public/worklets/RecordingWorklet.js` (verify/expose), `tests/lib9.test.ts` + `tests/components7.test.tsx` (tests), `openspec/specs/audio-system.md` (document behavior). No new dependencies, no backend, no native code changes.

## Out of Scope
- MediaRecorder-based capture (the existing worklet buffer-capture is retained; MediaRecorder is noted as an alternative only).
- Multi-track simultaneous recording, punch-in/out timing, latency-compensated monitoring (deferred).
- Waveform thumbnail preview generation for the recorded region (covered by `canvasWaveform.ts` separately).
