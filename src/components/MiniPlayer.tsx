import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useWebAudioPlayer } from "../hooks/useWebAudioPlayer";

interface MiniPlayerState {
  title: string;
  subtitle: string;
  url: string | null;
  projectId: string | null;
  visible: boolean;
}

let _state: MiniPlayerState = {
  title: "",
  subtitle: "",
  url: null,
  projectId: null,
  visible: false,
};

const listeners = new Set<(s: MiniPlayerState) => void>();

export function setMiniPlayerState(s: Partial<MiniPlayerState>) {
  _state = { ..._state, ...s };
  listeners.forEach((fn) => fn(_state));
}

export function useMiniPlayerState() {
  const [state, setState] = useState(_state);
  useEffect(() => {
    listeners.add(setState);
    return () => { listeners.delete(setState); };
  }, []);
  return state;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function MiniPlayer() {
  const router = useRouter();
  const state = useMiniPlayerState();
  const isWeb = Platform.OS === "web";

  const webAudio = useWebAudioPlayer();
  const expoPlayer = useAudioPlayer(null);
  const expoStatus = useAudioPlayerStatus(expoPlayer);

  const player = isWeb ? webAudio : expoPlayer;
  const status = isWeb
    ? { playing: webAudio.isPlaying, currentTime: webAudio.currentTime, duration: webAudio.duration, isLoaded: webAudio.isLoaded }
    : { playing: expoStatus.playing, currentTime: expoStatus.currentTime, duration: expoStatus.duration, isLoaded: expoStatus.isLoaded };

  const progress = status.duration > 0 ? (status.currentTime / status.duration) * 100 : 0;

  const progressBarRef = useRef<View>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const playerRef = useRef(player);
  playerRef.current = player;
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    loadingRef.current = loading;
    if (mountedRef.current) setIsLoading(loading);
  }, []);

  const calculateSeekPosition = useCallback((x: number, containerWidth: number) => {
    if (!status.duration || containerWidth <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / containerWidth));
    player.seekTo(ratio * status.duration);
  }, [player, status.duration]);

  const handleResponderGrant = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleResponderMove = useCallback((event: any) => {
    if (!isDragging) return;
    const x = event.nativeEvent.pageX;
    // The progress bar spans the full screen width (left-0 right-0)
    const containerWidth = typeof window !== "undefined" ? window.innerWidth : 300;
    calculateSeekPosition(Math.max(0, Math.min(containerWidth, x)), containerWidth);
  }, [isDragging, calculateSeekPosition]);

  const handleResponderRelease = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((event: any) => {
    if (!isDragging || !status.duration) return;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    calculateSeekPosition(x, rect.width);
  }, [isDragging, calculateSeekPosition, status.duration]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleProgressPress = useCallback((e: any) => {
    const x = (e as unknown as { nativeEvent: { offsetX: number } }).nativeEvent.offsetX;
    if (x !== undefined && status.duration) {
      player.seekTo((x / 300) * status.duration);
    }
  }, [player, status.duration]);

  useEffect(() => {
    const load = async () => {
      if (!state.url || !state.visible || status.isLoaded || loadingRef.current) return;
      setLoading(true);
      try {
        await playerRef.current.replace(state.url);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [setLoading, state.url, state.visible, status.isLoaded]);

  const togglePlay = useCallback(async () => {
    if (loadingRef.current) return;
    if (status.playing) {
      playerRef.current.pause();
      return;
    }
    setLoading(true);
    try {
      if (!status.isLoaded && state.url) {
        await playerRef.current.replace(state.url);
      }
      await playerRef.current.play();
    } finally {
      setLoading(false);
    }
  }, [setLoading, state.url, status.isLoaded, status.playing]);

  const stop = useCallback(() => {
    player.pause();
    player.seekTo(0);
    setMiniPlayerState({ visible: false, url: null });
  }, [player]);

  const close = useCallback(() => {
    player.pause();
    setMiniPlayerState({ visible: false });
  }, [player]);

  const rewind = useCallback(() => {
    player.seekTo(Math.max(0, status.currentTime - 5));
  }, [player, status.currentTime]);

  const forward = useCallback(() => {
    player.seekTo(Math.min(status.duration, status.currentTime + 5));
  }, [player, status.currentTime, status.duration]);

  const openProject = useCallback(() => {
    if (state.projectId) router.push(`/studio/${state.projectId}`);
    else router.push("/tabs");
  }, [state.projectId]);

  if (!state.visible || !state.url) return null;

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-dark-surface/95 backdrop-blur-sm border-t border-dark-border">
      {/* Progress bar (draggable) */}
      <Pressable
        ref={progressBarRef}
        className="h-1.5 bg-dark-muted overflow-hidden cursor-pointer"
        onPress={handleProgressPress}
        onResponderGrant={handleResponderGrant}
        onResponderMove={handleResponderMove}
        onResponderRelease={handleResponderRelease}
        // @ts-expect-error web pointer events
        onMouseMove={Platform.OS === "web" ? handleMouseMove : undefined}
        onMouseUp={Platform.OS === "web" ? handleMouseUp : undefined}
      >
        <View
          className="h-full bg-brand-primary transition-all"
          style={{ width: `${progress}%`, pointerEvents: "none" }}
        />
      </Pressable>

      <View className="flex-row items-center gap-3 px-4 py-2.5">
        {/* Thumbnail */}
        <Pressable onPress={openProject} className="w-10 h-10 rounded-lg bg-brand-primary/20 items-center justify-center active:opacity-70">
          <Text className="text-brand-primary text-lg">♫</Text>
        </Pressable>

        {/* Info */}
        <Pressable onPress={openProject} className="flex-1 active:opacity-70">
          <Text className="text-white text-sm font-semibold" numberOfLines={1}>{state.title}</Text>
          <Text className="text-gray-400 text-xs" numberOfLines={1}>{state.subtitle}</Text>
        </Pressable>

        {/* Time */}
        <Text className="text-gray-500 text-[10px] font-mono w-16 text-right">
          {fmt(status.currentTime)}/{fmt(status.duration)}
        </Text>

        {/* Transport controls */}
        <View className="flex-row items-center gap-1.5">
          <Pressable onPress={rewind} className="w-7 h-7 rounded items-center justify-center active:opacity-60">
            <Text className="text-gray-300 text-sm">⏮</Text>
          </Pressable>
          <Pressable
            onPress={togglePlay}
            accessibilityRole="button"
            accessibilityLabel={isLoading ? "Carregando áudio" : status.playing ? "Pausar áudio" : "Reproduzir áudio"}
            accessibilityState={{ busy: isLoading }}
            className="w-9 h-9 rounded-full bg-brand-primary items-center justify-center active:opacity-80"
          >
            <Text className="text-white text-base">{isLoading ? "…" : status.playing ? "⏸" : "▶"}</Text>
          </Pressable>
          <Pressable onPress={forward} className="w-7 h-7 rounded items-center justify-center active:opacity-60">
            <Text className="text-gray-300 text-sm">⏭</Text>
          </Pressable>
          <Pressable onPress={stop} className="w-7 h-7 rounded items-center justify-center active:opacity-60">
            <Text className="text-gray-400 text-sm">⏹</Text>
          </Pressable>
          <Pressable onPress={close} className="w-7 h-7 rounded items-center justify-center active:opacity-60">
            <Text className="text-gray-500 text-xs">✕</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
