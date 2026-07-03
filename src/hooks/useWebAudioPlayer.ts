import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Platform } from "react-native";

const TIMEUPDATE_THROTTLE_MS = 500;

/**
 * Web-only audio player using HTML5 <audio> element.
 * Used as a fallback when expo-audio doesn't handle blob URLs on web.
 *
 * @param options.trackTime - When false, skips `currentTime` state updates
 *   from `timeupdate`/`pause`/`ended` events, preventing re-renders in
 *   the consuming component during playback. Use `audioRef` to read
 *   current time directly when needed (e.g. via requestAnimationFrame).
 */
export function useWebAudioPlayer(options?: { trackTime?: boolean }) {
  const trackTime = options?.trackTime !== false;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const currentSrcRef = useRef<string>("");
  const lastTimeUpdateRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const audio = new Audio();
    audio.style.display = "none";
    document.body.appendChild(audio);
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (!trackTime) return;
      const now = Date.now();
      if (now - lastTimeUpdateRef.current >= TIMEUPDATE_THROTTLE_MS) {
        lastTimeUpdateRef.current = now;
        setCurrentTime(audio.currentTime);
      }
    };
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      if (trackTime) setCurrentTime(audio.currentTime);
    };
    const onEnded = () => {
      setIsPlaying(false);
      if (trackTime) setCurrentTime(0);
    };
    const onError = (e: Event) => {
      console.warn("Audio element error:", (e as ErrorEvent).message);
      setIsLoaded(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.src = "";
      if (audio.parentNode) audio.parentNode.removeChild(audio);
      audioRef.current = null;
      if (currentSrcRef.current && currentSrcRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(currentSrcRef.current);
        currentSrcRef.current = "";
      }
    };
  }, []);

  const replace = useCallback(async (url: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    if (currentSrcRef.current && currentSrcRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(currentSrcRef.current);
    }
    currentSrcRef.current = url;
    audio.src = url;
    setIsLoaded(false);
    setCurrentTime(0);
    setDuration(0);

    try {
      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          audio.removeEventListener("canplaythrough", onReady);
          audio.removeEventListener("loadeddata", onReady);
          audio.removeEventListener("error", onError);
          resolve();
        };
        const onError = () => {
          audio.removeEventListener("canplaythrough", onReady);
          audio.removeEventListener("loadeddata", onReady);
          audio.removeEventListener("error", onError);
          reject(new Error("Failed to load audio"));
        };
        audio.addEventListener("canplaythrough", onReady, { once: true });
        audio.addEventListener("loadeddata", onReady, { once: true });
        audio.addEventListener("error", onError, { once: true });
        audio.load();
      });
      setIsLoaded(true);
    } catch {
      setIsLoaded(false);
    }
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
    } catch (e) {
      console.warn("WebAudio play failed:", e);
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, vol));
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  return useMemo(() => ({
    isPlaying,
    currentTime,
    duration,
    isLoaded,
    replace,
    play,
    pause,
    seekTo,
    setVolume,
    setPlaybackRate,
    audioRef,
  }), [isPlaying, currentTime, duration, isLoaded, replace, play, pause, seekTo, setVolume, setPlaybackRate]);
}
