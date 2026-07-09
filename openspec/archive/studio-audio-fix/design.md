# Design: Studio Web Audio Autoplay Fix

## Technical Approach

### `app/studio/[id].tsx` Updates
We will leverage the `unlock()` function that was added to `useWebAudioPlayer`.

In `togglePlay`, we will insert a synchronous call to `webAudio.unlock()` at the top of the function if `isWeb` is true, right before any `await` operations.

```typescript
const togglePlay = useCallback(async () => {
  if (isWeb) webAudio.unlock(); // Synchronous unlock in user interaction context
  
  const playing = isWeb ? webAudio.isPlaying : player.playing;
  // ... existing code ...
}, [...deps]);
```

This ensures the HTML `<audio>` element registers a synchronous play/pause event on the user's click gesture, unlocking it for the later asynchronous `webAudio.play()` call that executes after the offline rendering phase.
