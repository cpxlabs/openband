# Proposal: Web Playback — No Sound & App Freeze

## Context

On web builds, playback in the Feed (`app/tabs/index.tsx`) and Studio
(`app/studio/[id].tsx`) exhibits two reproducible symptoms reported by users:

1. **No sound** — pressing play produces no audio output.
2. **App freeze** — pressing play in Studio hangs the UI for seconds (or longer)
   and the playhead never advances.

Investigation (see diagnosis below) traced both to the web audio playback
pipeline. The existing specs (`openspec/specs/audio-transport.md`,
`openspec/specs/audio-system.md`) describe the intended transport flow but have
**no test requirements** covering browser autoplay-policy compliance or
main-thread freeze avoidance. This change closes that gap and fixes the root
causes.

## Problem Description

### (A) No sound — autoplay policy broken by async work before `play()`

Browsers require media playback to begin *synchronously within* the user
activation (the click/tap gesture). The current code awaits heavy async work
**before** calling `play()`:

- Feed `app/tabs/index.tsx:183-187`:
  `generatePreviewUrl(...)` (which internally `await`s an
  `OfflineAudioContext.startRendering()` in `src/lib/constants.ts:40`) and
  `webAudio.replace(url)` run first, then `webAudio.play()` — by which point the
  gesture is gone and `play()` rejects. `useWebAudioPlayer.play()` swallows the
  rejection (`src/hooks/useWebAudioPlayer.ts`), so it fails silently → no sound.
- Studio `app/studio/hooks.ts:656-667`: `audioSystem.ensureContext().resume()` is
  awaited, then `engine.prepare()` (also awaited, heavy — see B), then
  `engine.play()`. If any of these run outside a gesture (MIDI handler at
  `app/studio/[id].tsx:720`, keyboard shortcuts, `seekRelative`/`setLoop`),
  `resume()` is rejected, the `AudioContext` stays `suspended`, and
  `PlaybackEngine.play()` starts `AudioBufferSourceNode`s on a suspended context →
  silent. The `webAudio.unlock()` call at `hooks.ts:637` only touches the
  studio's separate `<audio>` element, not the AudioContext — ineffective for the
  engine path.

### (B) App freeze — main-thread stalls during transport start

- `PlaybackEngine.prepare()` (`src/lib/playbackEngine.ts:90-136`) renders one
  audio stem **per track** via `renderTrackStem` (`src/lib/midiSynth.ts:
  1035-1227`): an `OfflineAudioContext` sized to the **full project duration**
  (`midiSynth.ts:1066`), `await decodeAudioData` per region (`1102`), and
  `timeStretch` `while` loops (`src/lib/timeStretch.ts:33,88`) when durations
  mismatch. `applySinglePlugin` (`src/lib/pluginChain.ts:289`) creates a **new
  `OfflineAudioContext` per plugin per track**. All of this runs **synchronously
  on the main thread** on every `togglePlay` → multi-second stall perceived as a
  freeze, worse with more tracks/regions/plugins.
- `onClockTick` → `setCurrentBeat` (`app/studio/hooks.ts:617-638`, `628`)
  re-renders the entire `[id].tsx` tree ~40×/sec while playing, alongside the
  `LiveWaveformCanvas` rAF (`src/components/LiveWaveformCanvas.tsx:22`).

## Objectives

1. Guarantee audible web playback by preserving user activation: resume the
   `AudioContext` and initiate playback with zero intervening awaited async work
   wherever possible; make `play()` calls gesture-safe.
2. Eliminate the main-thread freeze on transport start: make stem rendering
   non-blocking (off main thread / chunked / cached & reused) and stop the
   full-Studio re-render storm while playing.
3. Add spec test requirements + tests asserting: audio plays under a fake
   user-gesture, no synchronous render on the main thread during `togglePlay`,
   and `setCurrentBeat` does not re-render the whole Studio each tick.

## Non-Goals

- Native (`expo-audio`) playback is unaffected and out of scope (the bug is
  web-only; Feed's `expoPlayer` branch already catches play errors).
- SharedArrayBuffer / COOP-COEP — confirmed not used anywhere (grep), not needed.
- `audioTelemetry` per-second fetch and `LiveProgressBar` rAF are minor and
  deferred unless they prove contributory.

## Approach Summary

- **Gesture-safe play (no-sound fix):**
  - Resume the AudioContext and fire `play()` *immediately* inside the gesture;
    if the URL must be generated first, generate it ahead of time (pre-cache the
    preview blob URL on load / on press-in) so `play()` needs no awaited
    generation. If generation is unavoidable, only `await` it *after* a
    synchronous `play()` has already been issued, then `replace`+`play` again once
    loaded (re-arm gesture via the click handler).
  - Add a helper `audioSystem.resumeForGesture()` that resumes the live context
    synchronously-resumable and expose it so callers resume before any await.
- **Freeze fix (transport):**
  - Move per-track stem rendering off the main thread: delegate to a Web Worker
    that owns its own `OfflineAudioContext` (or reuse the already-cached render
    from `renderTracksCached` / `renderTracksToUrl`, which is already cached per
    `fd0cf3f`). Reuse cached buffers instead of rebuilding every `togglePlay`.
  - Throttle / isolate the clock-driven `setCurrentBeat` so only the transport
    bar / playhead component re-renders (memoized selector), not the whole Studio.
- **Specs & tests:** extend `openspec/specs/audio-transport.md` with
  autoplay-compliance and freeze-avoidance requirements; add vitest coverage.

## Risks

- Worker-based offline rendering must stay CSP/COOP-clean (no SharedArrayBuffer).
- Caching must key correctly on tracks/bpm/mood/pitch so edits invalidate
  renders (existing `renderTracksCached` already keys on a JSON signature).
