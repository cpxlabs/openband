import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

interface Screen3DHeaderProps {
  title: string;
  right?: React.ReactNode;
}

/** Shared header used by all 3D/immersive screens. */
export function Screen3DHeader({ title, right }: Screen3DHeaderProps) {
  const router = useRouter();
  const handleBack = () => {
    // EXPL-5: router.back() is a no-op when there's no history (e.g. deep-linked
    // or launched directly from a tab). Fall back to a known route.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/tabs");
    }
  };
  return (
    <View className="bg-dark-surface border-b border-dark-border flex-row items-center px-4 py-3">
      <Pressable
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        className="w-9 h-9 rounded-lg bg-dark-muted/40 items-center justify-center active:opacity-70"
      >
        <Text className="text-gray-300 text-lg">←</Text>
      </Pressable>
      <View className="flex-1 items-center">
        <Text className="text-white font-bold text-base">{title}</Text>
      </View>
      <View className="w-9 items-end justify-center">{right}</View>
    </View>
  );
}

interface Screen3DFallbackProps {
  title: string;
  icon?: string;
  message?: string;
}

/**
 * Native fallback for web-only 3D screens (they rely on the DOM / WebGL
 * via <div>/<iframe>, which are unavailable on iOS/Android).
 */
export function Screen3DFallback({
  title,
  icon = "🎧",
  message = "As experiências 3D estão disponíveis apenas na versão web do OpenBand. Abra este modo no navegador para explorá-lo.",
}: Screen3DFallbackProps) {
  return (
    <View className="flex-1 bg-dark-bg">
      <Screen3DHeader title={title} />
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-5xl mb-4">{icon}</Text>
        <Text className="text-white font-bold text-lg mb-2 text-center">
          Modo 3D indisponível no celular
        </Text>
        <Text className="text-gray-400 text-sm text-center max-w-xs leading-5">
          {message}
        </Text>
      </View>
    </View>
  );
}
