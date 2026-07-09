# Proposal: Web Audio Autoplay Fix

## Context
Currently, audio playback on the web platform within the Feed screen fails. The browser's autoplay policies block audio playback if `audio.play()` is called after an asynchronous operation (e.g. `await generatePreviewUrl(...)`) because the synchronous user gesture context is lost.

## Objectives
- Resolve the web audio playback blocking issue in the Feed screen (`app/tabs/index.tsx`).
- Unlock the `useWebAudioPlayer` HTML `<audio>` element by triggering a synchronous playback action immediately upon user interaction before any asynchronous code executes.

## Scope
- Modify `useWebAudioPlayer` to include a synchronous `unlock()` method that plays and immediately pauses the audio element.
- Update `handlePlay` in `app/tabs/index.tsx` to call this `unlock()` method synchronously.
