# Design: Web Playback — No Sound & App Freeze

## 1. Audio Context Resume (gesture-safe)

### Current
`UniversalAudioSystem.ensureContext()` (`src/lib/universalAudio.ts:275-282`)
awaits `initialize()` then `resume()`. Callers `await` it *before* `play()` —
consuming the gesture.

### New: `resumeForGesture()`
Add to `UniversalAudioSystem`:

```ts
// Returns the live AudioContext synchronously if it exists and is running,
// otherwise kicks off resume() without awaiting. Must be called from within a
// user gesture. Never throws.
resumeForGesture(): AudioContext | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  if (!this._audioCtx) {
    void this.initialize(); // async; play() on <audio>/engine will retry
    return null;
  }
  if (this._audioCtx.state === "suspended") {
    void this._audioCtx.resume();
  }
  return this._audioCtx;
}
```

Callers invoke `audioSystem.resumeForGesture()` **before any `await`**, then
proceed to `play()`. This keeps the AudioContext resume inside the gesture
window.

## 2. Feed Playback (no-sound fix)

### Current (`app/tabs/index.tsx:170-216`)
```
await generatePreviewUrl(...)   // <= awaited, kills gesture
await audioSystem.ensureContext()
await webAudio.replace(url)
await webAudio.play()           // rejects -> swallowed -> silent
```

### New flow
1. On press-in (or on post data arrival) pre-generate & cache the preview URL:
   add `preloadPreview(post.id, post.duration)` to `src/lib/constants.ts` that
   stores the blob URL in a module map. The Feed already has a `useEffect` that
   could trigger this, or call it inside `handlePlay` *before* the await chain
   resolves — but the key fix is:
2. Reorder so the gesture stays valid:
   ```ts
   const handlePlay = async (post) => {
     webAudio.unlock();                       // resume <audio> element (existing)
     audioSystem.resumeForGesture();          // resume AudioContext in-gesture
     const cached = getCachedPreview(post.id) // usually already present
     const url = cached ?? (await generatePreviewUrl(post.id, post.duration));
     try {
       if (url) { await webAudio.replace(url); await webAudio.play(); }
       else    { await webAudio.play(); /* will load */ }
       setPlayingId(post.id);
     } catch (e) {
       // gesture lost (e.g. first-ever play with no cache): surface retry,
       // do NOT silently swallow. Show a tap-to-play affordance.
     }
   };
   ```
3. `useWebAudioPlayer.play()` (`src/hooks/useWebAudioPlayer.ts`) must **not
   swallow** autoplay rejections; re-throw so callers can prompt a retry and the
   gesture is re-acquired on the retry tap.

## 3. Studio Transport (no-sound + freeze fix)

### Current (`app/studio/hooks.ts:636-694`, `playbackEngine.ts`, `midiSynth.ts`)
`togglePlay` awaits `ensureContext()` → `engine.prepare()` (heavy, per-track
`OfflineAudioContext` + `decodeAudioData` + `timeStretch` while-loops) →
`engine.play()`. If outside a gesture → silent. The heavy `prepare` blocks the
main thread → freeze.

### New flow
- **Reserve gesture:** call `audioSystem.resumeForGesture()` first (line 637,
  before any await).
- **Reuse cached render:** `renderTracksCached` (`hooks.ts:52-87`, cached at
  `fd0cf3f`) already keys on a JSON signature of tracks/bpm/mood/buses. Use it as
  the primary source for the engine's stems instead of rebuilding every
  `togglePlay`. Only rebuild (off-thread) when the signature changes.
- **Off-main-thread stem render:** move `renderTrackStem` work into a Web Worker
  (`src/lib/renderWorker.ts`) that owns an `OfflineAudioContext` and returns
  `ArrayBuffer`s via `postMessage`. The engine's `prepare` becomes a non-blocking
  `await worker.renderStems(...)`; falls back to main-thread render if Workers are
  unavailable. No SharedArrayBuffer (CSP-safe).
- **Throttled re-render:** `onClockTick` sets only a memoized `TransportPlayhead`
  component's state (via a ref + `useSyncExternalStore` or a dedicated
  `PlayheadContext`), not the whole `[id].tsx`. `setCurrentBeat` is removed from
  the hot path; the playhead bar subscribes to beat updates directly.

## 4. Components Affected

| File | Change |
| --- | --- |
| `src/lib/universalAudio.ts` | add `resumeForGesture()` |
| `src/lib/constants.ts` | add `preloadPreview` / `getCachedPreview` |
| `app/tabs/index.tsx` | reorder `handlePlay`, use cached preview, surface play errors |
| `src/hooks/useWebAudioPlayer.ts` | stop swallowing autoplay rejections |
| `app/studio/hooks.ts` | gesture-safe resume; reuse cached render; off-thread render; throttle playhead |
| `src/lib/playbackEngine.ts` | accept pre-rendered stems / worker-rendered buffers |
| `src/lib/renderWorker.ts` | new: Web Worker offline stem renderer (CSP-safe) |
| `app/studio/[id].tsx` | isolate `TransportPlayhead` subscription |
| `src/components/LiveWaveformCanvas.tsx` | (verify) rAF isolation already local |

## 5. Test Requirements (added to `openspec/specs/audio-transport.md`)

- Web playback calls `AudioContext.resume()` (or `play()`) **before** any awaited
  preview/blob generation completes.
- `resumeForGesture()` resumes a suspended context without throwing and without
  requiring an `await` to take effect.
- `togglePlay` does not perform synchronous `OfflineAudioContext` rendering on
  the main thread (measured: no `new OfflineAudioContext` synchronously under
  test, or render is delegated).
- Clock tick updates only the playhead component, not the entire Studio tree
  (assert render count of a heavy child stays 1 across ticks).
- `useWebAudioPlayer.play()` rejects (does not swallow) when called without
  user activation, enabling a tap-to-retry UI.

## 6. Verification

1. `npx tsc --noEmit`
2. `npx vitest run` (new tests in `tests/webPlayback.test.ts` + transport tests)
3. Manual: `npm run web` (or `expo start --web`), open Feed, tap a post → audio
   plays; open Studio, tap play → audio plays, UI stays responsive (no multi-sec
   freeze), playhead advances smoothly.
