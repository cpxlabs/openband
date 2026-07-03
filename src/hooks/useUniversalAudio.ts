import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { audioSystem } from "../lib/universalAudio";

export function useUniversalAudio(source: string | number | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const player = useAudioPlayer(source ?? "");
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!source) return;

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const controller = new AbortController();
      const resume = () => {
        audioSystem.initialize();
        controller.abort();
      };
      document.addEventListener("click", resume, { signal: controller.signal });
      document.addEventListener("touchstart", resume, { signal: controller.signal });
      return () => controller.abort();
    }
  }, [source]);

  useEffect(() => {
    setIsPlaying(status.playing);
  }, [status.playing]);

  const play = async () => {
    try {
      await audioSystem.ensureContext();
      player.play();
      setIsPlaying(true);
    } catch (e) {
      setError("Falha ao reproduzir áudio");
      console.error("Play error:", e);
    }
  };

  const pause = async () => {
    try {
      player.pause();
      setIsPlaying(false);
    } catch (e) {
      console.error("Pause error:", e);
    }
  };

  const stop = async () => {
    try {
      player.pause();
      player.seekTo(0);
      setIsPlaying(false);
    } catch (e) {
      console.error("Stop error:", e);
    }
  };

  return {
    player,
    isPlaying,
    isLoaded: status.isLoaded,
    error,
    play,
    pause,
    stop,
    seekTo: player.seekTo,
    setVolume: (vol: number) => {
      player.volume = Math.max(0, Math.min(1, vol));
    },
  };
}
