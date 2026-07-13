# Proposal — Next Product Design (Phases 4–7)

## Context
OpenBand's Phase 1–3 shipped the core DAW, the 19-type plugin system, mastering suite, stem extraction, collaboration CRDT, and WASM instrument host. Competitors have since widened feature gaps that block OpenBand from being a primary production tool for serious creators. This change specifies the next four product pillars — **Video Export**, **MIDI Learn + MCU control surface**, **DAWproject interop**, and the **AI Voice Cleaner** (tracked separately as `openspec/specs/ai-voice-cleaner/spec.md`) — closing the most-cited gaps versus BandLab Pro / BandLab Studio Max and Cubasis 3.8.

## Problem Description
- **BandLab Pro / Studio Max** let creators publish video (screen + audio) directly from a project; OpenBand can only bounce audio.
- **Cubasis 3.8** ships MIDI Learn, MIDI CC mapping, and Mackie Control Universal (MCU) surface support; OpenBand has no external-controller story beyond Web MIDI primitives.
- **DAWproject** (Bitwig / Studio One open format) is now the de-facto interchange standard; OpenBand cannot import/export it, so users are locked in.
- **AI Voice Cleaner** — BandLab and competitors offer one-tap speech cleanup; OpenBand has none (the backend Demucs path is stem separation only, not voice restoration — confirmed by repo grep: no `rnnoise`, `denoise`, or `voiceClean` code exists).

## Objectives
- Specify **Video Export** so a finished mix can be rendered to a shareable video (audio + optional waveform/visuals) across web and desktop.
- Specify **MIDI Learn + MCU** so any knob/fader can be mapped to an incoming CC, and an MCU surface can drive transport/mix, web-safe via Web MIDI with a native fallback.
- Specify **DAWproject interop** as a pure XML/zip serializer with no native dependency, enabling cross-DAW project exchange.
- Reference the dedicated **AI Voice Cleaner** spec (`openspec/specs/ai-voice-cleaner/spec.md`) as the fourth pillar — a 20th local-only plugin type.
- Provide a phased roadmap (Phases 4–7) with concrete file targets and test stubs.

## What Changes
- Adds 4 spec areas: Video Export, MIDI Learn + MCU, DAWproject Interop, and AI Voice Cleaner (own file).
- Introduces new lib modules: `src/lib/videoExport.ts`, `src/lib/midiLearn.ts`, `src/lib/mcu.ts`, `src/lib/dawproject.ts`, `src/lib/plugins/voiceCleaner.ts`, plus a `OpenBandNative.runVoiceCleaner` bridge method.
- UI: a Video toggle in `BounceDialog.tsx`, a MIDI Learn panel, and the Voice Cleaner slot in `PluginEditor.tsx` (disabled on web).

## Zero Runtime Risk
This is a **docs-only** change. No source is modified, no behavior changes, no new dependency is introduced (Web MIDI and JSZip-style zip are either already available or browser-native). All proposed code paths are additive and gated so existing tests stay green.

## Out of Scope
- AUv3 iOS plugin hosting and 64-channel I/O (mobile-irrelevant, deferred — see tasks.md "Deferred").
- Replacing the existing 19-type plugin system; voice cleaner only appends a 20th type.
- Streaming/cloud video hosting; export yields a local file only.
