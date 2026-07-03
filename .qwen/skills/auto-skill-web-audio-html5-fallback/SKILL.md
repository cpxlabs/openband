---
name: web-audio-html5-fallback
description: Pattern for using HTML5 <audio> element as web fallback when expo-audio doesn't handle blob URLs, with dual expo-audio/native path
source: auto-skill
extracted_at: '2026-07-03T14:11:35.803Z'
---

## Web Audio HTML5 Fallback — Pattern from OpenBand DAW

### Problem

`expo-audio`'s web implementation doesn't reliably handle `blob:` URLs created by `OfflineAudioContext` → `audioBufferToWavBlob()` → `URL.createObjectURL()`. Feed playback and studio playback both fail silently on web.

### Solution

Create a `useWebAudioPlayer` hook that wraps HTML5 `<audio>` element, then branch on `Platform.OS === "web"` to use it instead of expo-audio.

### Hook Implementation (`src/hooks/useWebAudioPlayer.ts`)

```ts
import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";

export function useWebAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => { setDuration(audio.duration); setIsLoaded(true); };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  const replace = useCallback(async (url: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = url;
    audio.load();
    setIsLoaded(false);
    setCurrentTime(0);
  }, []);

  const play = useCallback(async () => {
    try { await audioRef.current?.play(); } catch (e) { console.warn("WebAudio play failed:", e); }
  }, []);

  const pause = useCallback(() => { audioRef.current?.pause(); }, []);
  const seekTo = useCallback((seconds: number) => {
    if (audioRef.current) { audioRef.current.currentTime = seconds; setCurrentTime(seconds); }
  }, []);
  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, vol));
  }, []);
  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  return { isPlaying, currentTime, duration, isLoaded, replace, play, pause, seekTo, setVolume, setPlaybackRate };
}
```

### Usage Pattern (dual path)

```tsx
import { useWebAudioPlayer } from "../../src/hooks/useWebAudioPlayer";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

const webAudio = useWebAudioPlayer();
const expoPlayer = useAudioPlayer(null);
const expoStatus = useAudioPlayerStatus(expoPlayer);
const isWeb = Platform.OS === "web";

// Unified status
const status = isWeb
  ? { playing: webAudio.isPlaying, currentTime: webAudio.currentTime, duration: webAudio.duration, isLoaded: webAudio.isLoaded }
  : expoStatus;

// Play handler
const handlePlay = async () => {
  if (status.playing) {
    if (isWeb) webAudio.pause(); else expoPlayer.pause();
    return;
  }
  const url = await generateAudioUrl();
  if (url) {
    if (isWeb) {
      await webAudio.replace(url);
      await webAudio.play();
    } else {
      await expoPlayer.replace(url);
      expoPlayer.play();
    }
  }
};

// Playback rate
useEffect(() => {
  if (isWeb) webAudio.setPlaybackRate(rate);
  else player.playbackRate = rate;
}, [rate, isWeb, player, webAudio]);

// Cleanup
useEffect(() => () => {
  if (isWeb) webAudio.pause(); else player.pause();
}, [isWeb, player, webAudio]);
```

### Key rules

1. **Always branch on `Platform.OS === "web"`** — never try to use HTML5 audio on native or expo-audio on web
2. **Both players must be instantiated** — expo-audio for native, HTML5 for web
3. **Unified status object** — merge webAudio and expoPlayer status into one interface
4. **All player operations need the dual path** — replace, play, pause, seekTo, setVolume, setPlaybackRate
5. **Cleanup on unmount must handle both** — pause both players based on platform
