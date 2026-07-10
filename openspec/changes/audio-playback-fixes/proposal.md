# Proposal: Audio Playback, Mastering, Export, and Loading Overhaul

## Context

The app has four interrelated audio pipeline problems that degrade the user experience: web playback silently fails, the mastering chain is cosmetic, MP3 export is fake, and there is no way to monitor or cancel long-running operations.

## Problems

### 1. Web Playback Fails Silently
- Browser autoplay policy blocks `audio.play()` in the studio and feed when `AudioContext.resume()` or `<audio>.play()` is called outside a user gesture handler
- `togglePlay()` calls `await audioSystem.ensureContext()` but the promise can reject without meaningful error feedback to the user
- Blob URLs from `renderTracksToUrl()` are tracked centrally but can be revoked by the 5-minute cleanup while a project is still using them
- The feed `handlePlay()` calls `webAudio.play()` without any `ensureContext()` guard — every web playback attempt on the feed is subject to autoplay blocking

### 2. Mastering Suite is a Shell
- The "Enviar para Mastering Suite" flow uses an in-memory singleton (`masteringBridge.ts`) that is destroyed on page refresh — any browser reload loses all pending data
- No actual DSP processing is applied during mastering export — the plugin chain UI renders but `fetchAndRenderAudio()` connects source directly to destination with zero effects
- The `renderMixdown()` progress callback is not wired into any user-facing progress indicator inside MasteringSuite

### 3. MP3 Export is Stub/Fake
- `BounceDialog` offers WAV/AIFF/FLAC but all three produce identical 16-bit WAV data — only the file extension changes
- `MasteringSuite` shows an "MP3 320 kbps CBR" label but actually writes a WAV blob renamed to `.mp3`
- No MP3 encoding library exists in `package.json`
- `decodeAudioPureJS()` only handles RIFF/WAVE headers — any MP3 input produces silence

### 4. No Loading Modal / Operation Monitor
- Long operations (stem separation, mixdown render, export) have inline progress bars inside their dialogs
- No component allows the user to cancel an in-flight operation
- No global loading overlay exists
- `Loading.tsx` has only inline and fullScreen modes — no modal/overlay variant

## Objectives

1. **Fix web playback** — Guarantee `ensureContext()` runs synchronously within user gesture handlers; add fallback UI when autoplay is blocked; prevent premature blob URL revocation
2. **Polish the mastering chain** — Wire real DSP processing into mastering export; validate bridge data on arrival; surface export progress
3. **Fix MP3 export** — Either add real MP3 encoding via a lightweight dependency or cleanly remove the option with proper messaging
4. **Build a reusable loading modal** — Modal overlay with progress bar, cancel button, and optional progress breakdown (phase label + sub-progress)
5. **Cover everything with tests** — Integration tests for web playback paths, mastering export with mocked AudioContext, MP3 encoding/removal, loading modal render + interaction
