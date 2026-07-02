---
name: playback-system-fixes
description: Patterns for fixing audio playback bugs — AudioContext lifecycle, blob URL management, pause/resume, transport controls, feed playback cleanup
source: auto-skill
extracted_at: '2026-07-02T16:21:10.378Z'
---

## Playback System Fixes — Patterns from OpenBand DAW

### P0: AudioContext Lifecycle Management

When creating temporary AudioContext instances for pitch correction, rendering, or processing, **always** use `try/finally` to guarantee cleanup:

```ts
const ctx = new AudioContext();
try {
  // ... decode, process, render
} finally {
  await ctx.close();
}
```

Without `finally`, any error in the try block (fetch failure, decode error) leaks the AudioContext. Browsers limit concurrent AudioContext instances (~6), so leaks cause future audio to fail silently.

### P0: Blob URL Lifecycle

When replacing a blob URL (e.g., pitch-corrected audio replacing original mix):

```ts
URL.revokeObjectURL(url);  // revoke old first
url = URL.createObjectURL(blob);  // then create new
currentUrlRef.current = url;  // track the final URL
```

Order matters: revoke before creating to avoid memory spikes. Always assign the final URL to a ref for cleanup on unmount.

### P0: Playback Resume from Pause

Do NOT reset `currentTime` to 0 on every play call:

```ts
// WRONG — always restarts from beginning
player.currentTime = 0;
await player.play();

// CORRECT — only reset on first load
if (hasLoadedRef.current) {
  await player.play();  // resume from paused position
  return;
}
hasLoadedRef.current = true;
// ... load new source, then play from 0
```

### P0: Playback Cleanup on Unmount

Always stop playback when the component unmounts:

```ts
useEffect(() => () => { player.pause(); }, [player]);
```

Without this, audio continues playing when the user navigates away from the studio/feed screen.

### P1: Transport Controls

Add skip/stop buttons with direct `currentTime` manipulation:

```tsx
<Pressable onPress={() => player && (player.currentTime = Math.max(0, player.currentTime - 5))}>
  <Text>⏮</Text>
</Pressable>
<Pressable onPress={() => player && (player.currentTime = 0)}>
  <Text>⏹</Text>
</Pressable>
```

### P1: Time Display

Use a simple `formatTime` helper for `M:SS.cc` display:

```ts
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}
```

### P1: Feed Playback Error Handling

Always provide user feedback when playback fails:

```ts
const url = await generatePreviewUrl(post.id, post.duration);
if (url) {
  await player.replace(url);
  player.play();
} else {
  Alert.alert("Error", "Failed to load audio preview.");
}
```

### P1: Feed Playback Cleanup

Reset position on unmount to avoid resuming from stale position:

```ts
useEffect(() => () => {
  player.pause();
  player.seekTo(0);
}, [player]);
```
