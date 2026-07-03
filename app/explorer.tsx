import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TrapScene } from "../src/components/TrapScene";

export default function ExplorerScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-dark-bg">
      <View className="bg-dark-surface border-b border-dark-border flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-lg bg-dark-muted/40 items-center justify-center active:opacity-70"
        >
          <Text className="text-gray-300 text-lg">←</Text>
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-white font-bold text-base">MISSÃO 3D</Text>
        </View>
        <View className="w-9" />
      </View>

      <View className="flex-1 relative bg-black">
        <Canvas
          camera={{ position: [5, 3, 6], fov: 75 }}
          style={{ width: "100%", height: "100%" }}
          gl={{ antialias: true }}
        >
          <OrbitControls target={[0, 1, 0]} />
          <TrapScene />
        </Canvas>

        <View className="absolute bottom-6 left-0 right-0 items-center pointer-events-none">
          <Text className="text-white/70 text-sm">
            Click the center plate to trigger the trap
          </Text>
        </View>
      </View>
    </View>
  );
}
