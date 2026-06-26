import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAudioEngine } from "../context/AudioEngine";

export function MiniPlayer() {
  const { state, pause, resume, stop } = useAudioEngine();
  const router = useRouter();

  if (!state.miniPlayerVisible) return null;

  return (
    <Pressable
      onPress={() => router.push("/studio/current")}
      className="bg-dark-surface border-t border-dark-border px-4 py-2 flex-row items-center justify-between"
    >
      <View className="flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-lg bg-brand-primary/20 items-center justify-center">
          <Text className="text-brand-primary text-lg">♫</Text>
        </View>
        <View>
          <Text className="text-white text-sm font-semibold">Reproduzindo</Text>
          <Text className="text-gray-500 text-xs">{state.currentBpm} BPM</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={state.isPlaying ? pause : resume}
          className="w-9 h-9 rounded-full bg-brand-primary items-center justify-center"
        >
          <Text className="text-white text-sm">{state.isPlaying ? "⏸" : "▶"}</Text>
        </Pressable>
        <Pressable
          onPress={stop}
          className="w-9 h-9 rounded-full bg-dark-muted items-center justify-center"
        >
          <Text className="text-gray-400 text-sm">⏹</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
