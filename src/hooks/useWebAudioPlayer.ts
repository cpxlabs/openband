import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import { audioSystem } from "../lib/universalAudio";

/**
 * Web-only audio player using HTML5 <audio> element.
 * Used as a fallback when expo-audio doesn't handle blob URLs on web.
 */
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
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

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

    // Reset previous state
    audio.pause();
    audio.src = "";
    setIsLoaded(false);
    setCurrentTime(0);
    setDuration(0);

    return new Promise<void>((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          audio.removeEventListener("canplaythrough", onCanPlay);
          audio.removeEventListener("loadeddata", onLoadedData);
          setIsLoaded(true);
          resolve();
        }
      }, 2000);

      const onCanPlay = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          audio.removeEventListener("canplaythrough", onCanPlay);
          audio.removeEventListener("loadeddata", onLoadedData);
          setIsLoaded(true);
          resolve();
        }
      };
      const onLoadedData = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          audio.removeEventListener("canplaythrough", onCanPlay);
          audio.removeEventListener("loadeddata", onLoadedData);
          setIsLoaded(true);
          resolve();
        }
      };

      audio.addEventListener("canplaythrough", onCanPlay, { once: true });
      audio.addEventListener("loadeddata", onLoadedData, { once: true });
      audio.src = url;
      audio.load();
    });
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audioSystem.ensureContext();
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

  return {
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
  };
}
