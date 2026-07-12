# Design — Next Product Design (Phases 4–7)

## Competitive-Closure Matrix
Each spec closes a specific gap against BandLab Pro/Max and Cubasis 3.8.

| Spec | Competitor Gap Closed | Key Files / Symbols |
|---|---|---|
| Video Export | BandLab Pro/Studio Max in-app video publishing | `src/lib/videoExport.ts` (`renderVideoJob`), `src/lib/universalAudio.ts` (`UniversalAudioSystem` mixdown), `src/components/BounceDialog.tsx` |
| MIDI Learn + MCU | Cubasis 3.8 MIDI Learn + Mackie Control Universal | `src/lib/midiLearn.ts` (`learnCC`, `midiMap`), `src/lib/mcu.ts` (`decodeMCUTimeout`), Web MIDI API (browser) + `OpenBandNative` (native) |
| DAWproject Interop | Bitwig/Studio One open project exchange | `src/lib/dawproject.ts` (`exportDAWproject`, `importDAWproject`) — pure XML/zip, no native dep |
| AI Voice Cleaner | One-tap speech cleanup (BandLab, etc.) | `openspec/specs/ai-voice-cleaner/spec.md`; `src/lib/plugins/voiceCleaner.ts`, `OpenBandNative.runVoiceCleaner` |

## Architecture Notes

### Video Export
- `renderVideoJob(opts)` reuses `UniversalAudioSystem` (`src/lib/universalAudio.ts`) to produce a mixed-down audio buffer, then muxes it with a canvas-rendered visual track (waveform / playhead) into a video file via `MediaRecorder` (web) or the desktop bridge (Electron).
- `BounceDialog.tsx` gains a `video: boolean` toggle. When `Platform.OS === "web"` the render uses `MediaRecorder`; on desktop it delegates to `OpenBandNative` for higher-quality encoding. A platform gate shows a fallback notice if `MediaRecorder` is unavailable.
- Pure unit-testable pieces (mixdown length math, frame-count from duration×fps) are isolated from the encoder so they run on web CI.

### MIDI Learn + MCU
- `midiLearn.ts` exposes `learnCC(targetId, onCaptured)` which opens a short listen window and maps the next incoming CC to `targetId` in a persistent `midiMap`. `midiMap` is plain JSON (project-portable).
- `mcu.ts` decodes the Mackie Control Universal 7-segment + meter sysex/CC stream (`decodeMCUTimeout`) into transport/mix actions.
- Web-safe via the browser **Web MIDI API** (`navigator.requestMIDIAccess`); on desktop/Electron the same messages arrive through `OpenBandNative` MIDI events. No new dependency: Web MIDI is standards-based and the native path reuses the existing bridge.

### DAWproject Interop
- `dawproject.ts` serializes the OpenBand project graph (tracks, regions, plugins-as-params, tempo, time signature) to the DAWproject XML schema wrapped in a `.zip`. Import reverses it, mapping foreign plugin types to the nearest OpenBand type or a pass-through placeholder.
- **No native dependency**: XML is built with `DOMParser`/`XMLSerializer` (web) and the zip is a minimal store-only container (no compression library needed). This keeps it testable on web CI.

### AI Voice Cleaner (local-only)
- A 20th plugin type `voiceCleaner` (see dedicated spec). On desktop the DSP delegates to `OpenBandNative.runVoiceCleaner`; on web the slot is disabled with a "Desktop only" notice following the `const isWeb = Platform.OS === "web"` gate in `app/extractor.tsx:63`.
- Local-only mirrors the WASM instrument host policy (`src/lib/wasmPluginHost.ts`): no server fetch, nothing leaves the machine. The heavy inference is a native library; `applyPluginChain` (`src/lib/pluginChain.ts:89`) adds a `voiceCleaner` case that is pass-through on web.
