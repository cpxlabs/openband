---
name: cross-platform-audio-playback
description: Pattern for 100% cross-platform audio playback — dual-path web/native, AudioContext singleton, blob URL lifecycle, stem-to-mastering bridge
source: auto-skill
extracted_at: '2026-07-03T16:04:30.845Z'
---

## Cross-Platform Audio Playback — OpenBand Pattern

### Problem

expo-audio doesn't handle blob URLs reliably on web. Native platforms need expo-audio for proper audio routing. The solution: a dual-path pattern that routes to the right player based on `Platform.OS`.

### Web Audio HTML5 Fallback (merged from web-audio-html5-fallback)

`expo-audio`'s web implementation doesn't reliably handle `blob:` URLs created by `OfflineAudioContext` → `audioBufferToWavBlob()` → `URL.createObjectURL()`. The `useWebAudioPlayer` hook wraps HTML5 `<audio>` element as fallback.

**Key rule:** HTML5 `<audio>` element **must be appended to document.body** for reliable playback in all browsers. Without DOM attachment, `canplaythrough`/`loadeddata` events may never fire.

```ts
const audio = new Audio();
audio.style.display = "none";
document.body.appendChild(audio);
// On cleanup: if (audio.parentNode) audio.parentNode.removeChild(audio);
```

### Web vs Native Dual-Path Pattern

Every playback surface follows the same structure:

```tsx
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useWebAudioPlayer } from "../hooks/useWebAudioPlayer";

const isWeb = Platform.OS === "web";
const webAudio = useWebAudioPlayer();
const expoPlayer = useAudioPlayer(sourceUrl);
const expoStatus = useAudioPlayerStatus(expoPlayer);

const status = isWeb
  ? { playing: webAudio.isPlaying, currentTime: webAudio.currentTime, duration: webAudio.duration, isLoaded: webAudio.isLoaded }
  : expoStatus;
const player = isWeb ? webAudio : expoPlayer;
```

**Play action:**
```tsx
if (isWeb) {
  await webAudio.replace(url);
  await webAudio.play();
} else {
  await expoPlayer.replace(url);
  expoPlayer.play();
}
```

**Cleanup on unmount:**
```tsx
useEffect(() => () => {
  if (isWeb) { webAudio.pause(); webAudio.seekTo(0); }
  else { expoPlayer.pause(); expoPlayer.seekTo(0); }
}, [isWeb, expoPlayer, webAudio]);
```

### AudioContext Singleton

Browser autoplay policy suspends AudioContext until user interaction. Create one singleton, initialize on first gesture, all modules share it:

```ts
// universalAudio.ts
class UniversalAudioSystem {
  private _audioCtx: AudioContext | null = null;

  get audioCtx(): AudioContext | null { return this._audioCtx; }

  async ensureContext(): Promise<AudioContext | null> {
    if (!this._audioCtx) {
      this._audioCtx = new AudioContext();
    }
    if (this._audioCtx.state === "suspended") {
      await this._audioCtx.resume();
    }
    return this._audioCtx;
  }
}
```

**In app layout:**
```tsx
useEffect(() => {
  if (Platform.OS === "web") {
    const initAudio = () => { audioSystem.ensureContext(); };
    document.addEventListener("pointerdown", initAudio, { once: true });
    document.addEventListener("keydown", initAudio, { once: true });
    return () => disposeAllAudio();
  }
  audioSystem.initialize();
  return () => disposeAllAudio();
}, []);
```

**All other modules use the singleton, never create their own:**
```ts
// GOOD
const ctx = await audioSystem.ensureContext();
const source = ctx.createBufferSource();

// BAD — creates unsuspended context that won't play
const ctx = new AudioContext();
```

### Blob URL Lifecycle

When generating audio via OfflineAudioContext (pitch correction, stem rendering):

```ts
let url = await renderTracksToUrl(tracks, bpm, mood, buses);
if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);

if (url && needsPitchCorrection) {
  const ctx = await audioSystem.ensureContext();
  const resp = await fetch(url);
  const audioBuf = await ctx.decodeAudioData(await resp.arrayBuffer());
  const shifted = await pitchShift(audioBuf, semitones);
  // ... render shifted to new blob
  const pitchUrl = URL.createObjectURL(blob);
  URL.revokeObjectURL(url);  // revoke original
  url = pitchUrl;  // assign pitch-corrected
}

currentUrlRef.current = url;
if (isWeb) { await webAudio.replace(url); await webAudio.play(); }
else { await player.replace(url); await player.play(); }
```

Key: revoke the original URL BEFORE assigning the new one. Track via ref for unmount cleanup.

### P0: Playback System Fixes (merged from playback-system-fixes)

**AudioContext Lifecycle:** Always use `try/finally` to guarantee cleanup:
```ts
const ctx = new AudioContext();
try { /* process */ } finally { await ctx.close(); }
```

**Blob URL ordering:** Revoke BEFORE creating new URL:
```ts
URL.revokeObjectURL(url);  // revoke old first
url = URL.createObjectURL(blob);  // then create new
```

**Pause/resume:** Don't reset `currentTime` to 0 on every play — only on first load:
```ts
if (hasLoadedRef.current) { await player.play(); return; }
hasLoadedRef.current = true;
```

**Cleanup on unmount:** Always stop playback when component unmounts:
```ts
useEffect(() => () => { player.pause(); }, [player]);
```

### Stem-to-Mastering Bridge

Use a simple in-memory bridge to pass stem URLs + metadata from extractor/studio to mastering suite:

```ts
// masteringBridge.ts
interface StemInput { name: string; url: string; }
let _pending: {
  url: string;
  filename: string;
  stems?: StemInput[];
  bpm?: number;          // project tempo — preserves timing
  key?: string;          // musical key — preserves tonality
  timeSignature?: string; // time signature — preserves meter
} | null = null;
export function setMasteringInput(data: typeof _pending) { _pending = data; }
export function takeMasteringInput() { const v = _pending; _pending = null; return v; }
```

**Studio sends (with project metadata):**
```tsx
setMasteringInput({
  url: urls[0].url,
  filename: `${projectTitle}-stems`,
  stems: urls,
  bpm: initialBpm,       // ← preserves project timing
  key: projectKey,       // ← preserves musical key
  timeSignature: projectTimeSig, // ← preserves time signature
});
router.push("/mastering");
```

**Extractor sends (stems-only, no project context):**
```tsx
setMasteringInput({
  url: results[0]?.url || "",
  filename: "stem_mix",
  stems: results.map(s => ({ name: s.label, url: s.url })),
});
router.push("/mastering");
```

**MasteringSuite consumes on mount (preserves all metadata):**
```tsx
const [session, setSession] = useState<MasteringSession>(() => {
  const pending = takeMasteringInput();
  if (pending) {
    return {
      inputFile: {
        url: pending.url,
        stems: pending.stems,
        bpm: pending.bpm,               // ← preserved
        key: pending.key,               // ← preserved
        timeSignature: pending.timeSignature, // ← preserved
      },
      versions: [], activeVersionId: null, bypassed: false,
    };
  }
  return { inputFile: null, versions: [], activeVersionId: null, bypassed: false };
});
```

### Playback Surfaces Fixed

| Screen | Web Path | Native Path |
|--------|----------|-------------|
| Feed (tabs/index) | useWebAudioPlayer | useAudioPlayer |
| Studio ([id]) | useWebAudioPlayer + renderTracksToUrl | useAudioPlayer + renderTracksToUrl |
| Extractor | useWebAudioPlayer per stem | useAudioPlayer(stem.url) per stem |
| MasteringSuite | useWebAudioPlayer for preview | useAudioPlayer(audioSource) |
| MomentCard | useWebAudioPlayer for preview | useAudioPlayer(previewUrl) |
| SampleBrowser | useWebAudioPlayer | useAudioPlayer |
