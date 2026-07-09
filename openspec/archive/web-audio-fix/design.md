# Design: Web Audio Autoplay Fix

## Technical Approach

### 1. `useWebAudioPlayer` Updates
Add an `unlock()` method to the hook's returned object.
```typescript
const unlock = useCallback(() => {
  const audio = audioRef.current;
  if (!audio) return;
  // Synchronously play to unlock the element in the user gesture context
  const promise = audio.play();
  if (promise !== undefined) {
    promise.catch(() => {}).then(() => {
      // Pause immediately so it doesn't actually play whatever was loaded previously
      audio.pause();
    });
  }
}, []);
```

### 2. `app/tabs/index.tsx` Updates
In `handlePlay`, call `webAudioRef.current.unlock()` at the very beginning of the function, before `loadingIdRef.current` checks and before `await generatePreviewUrl`.
```typescript
const handlePlay = useCallback(async (post: FeedPost) => {
  if (isWeb) webAudioRef.current.unlock();
  // ... rest of the existing async logic ...
}, [isWeb]);
```

By executing `unlock()` synchronously, the browser will record the user interaction for the specific `<audio>` element, allowing subsequent asynchronous `play()` calls to succeed.
