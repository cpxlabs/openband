# Tasks — Next Product Design (Phases 4–7)

## Phase 4 — Video Export
  - [x] Create `src/lib/videoExport.ts` with `renderVideoJob(opts)` reusing `UniversalAudioSystem` mixdown (`src/lib/universalAudio.ts`)
  - [x] Add pure helpers: `frameCount(durationSec, fps)` and `mixdownLength(sampleRate, durationSec)` for unit testing
  - [x] Add `video: boolean` toggle to `src/components/BounceDialog.tsx` with a platform gate + fallback notice when `MediaRecorder` unsupported
  - [x] On web, mux audio + canvas visual via `MediaRecorder`; on desktop delegate to `OpenBandNative`
  - [x] Create `src/lib/videoExport.test.ts` — frame-count math, mixdown length, gate behavior (no encoder needed)

## Phase 5 — MIDI Learn + MCU
  - [x] Create `src/lib/midiLearn.ts` with `learnCC(targetId, onCaptured)` and a persistent `midiMap` (plain JSON)
  - [x] Add `unlearnCC(targetId)` and `applyMidiMap(message, midiMap)` mapping incoming CC → target param
  - [x] Create `src/lib/mcu.ts` with `decodeMCUTimeout(bytes)` → transport/mix actions
  - [x] Wire Web MIDI (`navigator.requestMIDIAccess`) on web; reuse `OpenBandNative` MIDI events on desktop
  - [x] Create `src/lib/midiLearn.test.ts` — `learnCC` captures first CC; `applyMidiMap` routes to correct target; `decodeMCUTimeout` parses a known MCU frame

## Phase 5b — DAWproject Interop
  - [x] Create `src/lib/dawproject.ts` with `exportDAWproject(project)` → XML-in-zip, and `importDAWproject(zipBytes)` → project
  - [x] Map OpenBand tracks/regions/plugins/tempo/timeSignature to DAWproject schema; foreign plugins → nearest type or pass-through
  - [x] Use `DOMParser`/`XMLSerializer` + minimal store-only zip (no compression library)
  - [x] Create `src/lib/dawproject.test.ts` — export→import round-trip preserves track count, tempo, and time signature; no native dep required

## Phase 6 — AI Voice Cleaner
  - [x] Add `"voiceCleaner"` to `PluginType` union (`src/lib/types.ts:94`)
  - [x] Add `PLUGIN_SPECS["voiceCleaner"]` entry (`src/lib/types.ts:217`) with `amount`, `denoiseAmount`, `dereverbAmount`, `preserveFormants`, `noiseFloor`
  - [x] Add `voiceCleaner` case to `applyPluginChain` (`src/lib/pluginChain.ts:89`) — native via `OpenBandNative.runVoiceCleaner`, pass-through on web
  - [x] Create `src/lib/plugins/voiceCleaner.ts` with `measureSNR(cleanRef, processed)` and `measureRMS(buffer)` (pure, web-safe)
  - [x] Add `runVoiceCleaner(buffer, params)` to `OpenBandNative` (`src/bridge/interface.ts:20`) and implement in electron/tauri/browser bridges
  - [x] Disable Voice Cleaner slot in `PluginEditor.tsx` on web with "Desktop only" notice (`app/extractor.tsx:63` `isWeb` pattern)
  - [x] Create `src/lib/plugins/voiceCleaner.test.ts` — SNR/RMS pure unit tests run on web; native `runVoiceCleaner` integration test **skipped on web**

## Phase 7 — Instruments
  - [x] Add an orchestral instrument pack preset to `INSTRUMENT_PRESETS` (`src/lib/wasmInstrumentEngine.ts`)
  - [x] Add a Tempo / Signature global track UI surfacing `MetronomeSettings` (bpm, timeSig) for editing across the timeline
  - [x] Create `src/lib/tempoTrack.test.ts` — bpm clamp to `genre.bpmRange`; time signature validation

## Verification (all phases)
  - [x] `npx tsc --noEmit` clean
  - [x] `cd backend && npx tsc --noEmit` clean
  - [x] `npx vitest run` passes (web-safe unit tests green; native integration tests skipped on web)
  - [x] `npm run build` succeeds

## Deferred (mobile-irrelevant, out of scope)
  - [x] AUv3 iOS plugin hosting — requires iOS-only native extension; not applicable to web/desktop-first architecture
  - [x] 64-channel I/O — exceeds mobile/consumer audio interface reality; current `hardwareIO.ts` multi-channel model is sufficient
