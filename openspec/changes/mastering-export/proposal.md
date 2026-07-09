# Proposal: Mastering Suite Audio Export Polish

## Context
The user requested polishing the audio export functionality inside the Mastering Suite to ensure high-quality WAV and MP3 file generation. Currently, when a user selects the "MP3" format, the system generates a standard WAV payload (`audioBufferToWavBlob`) and simply saves it with a `.mp3` extension, which results in an invalid/corrupt MP3 file.

## Problem Description
1. **Fake MP3 Export**: The web Audio API (`OfflineAudioContext`) cannot natively encode MP3 files. It only outputs raw PCM data (which we wrap in a WAV header). 
2. **Missing MP3 Encoder**: To generate real MP3 files, we need an MP3 encoder in the browser. 
3. **No Tests**: There is insufficient test coverage for the export parsing and blob generation to prevent future regressions.

## User Review Required
> [!IMPORTANT]
> The project rules dictate "No new dependencies unless explicitly approved." 
> To support true MP3 export in the browser without a backend round-trip, we need to add a lightweight MP3 encoder library like **`lamejs`** to `package.json`. 
> 
> **Question:** Do you approve adding `lamejs` as a dependency to enable genuine MP3 encoding? If not, we will need to either drop MP3 support or rely on a backend encoding route.

## High-Level Objectives
1. **Genuine Format Encoding**: Refactor `universalAudio.ts` or the export handlers to use `lamejs` for MP3 files and the existing WAV encoder for WAV files.
2. **Dynamic Bit Depth/Sample Rate**: Ensure that the user's selected bit depth (16/24 bit) and sample rate (44.1kHz/48kHz/etc) are strictly adhered to during encoding.
3. **Test Coverage**: Write `vitest` unit tests covering the export generation and mixer controls.
4. **Studio Header Responsiveness**: Reorganize the transport bar in `app/studio/[id].tsx` to prevent overlapping buttons (grouping tool icons into a scrollable area or overflow menu, and compacting the time-stretch/pitch-shift controls).
5. **Mixer Controls Functionality**: Ensure the bottom Mixer view correctly binds to track `mute`, `solo`, `volume`, and `pan` states, and actively modifies the audio playback properties.
