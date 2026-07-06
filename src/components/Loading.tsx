import { View, Text, ActivityIndicator } from "react-native";

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
  testID?: string;
}

export function Loading({
  message = "Carregando...",
  fullScreen = false,
  testID,
}: LoadingProps) {
  const SkeletonLines = () => (
    <View className="w-64 gap-3" aria-hidden>
      <View className="skeleton-line w-3/4" />
      <View className="skeleton-line w-full" />
      <View className="skeleton-line w-5/6" />
      <View className="skeleton-line w-2/3" />
    </View>
  );

  const content = (
    <View
      testID={testID}
      className="items-center justify-center gap-4"
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando"
      aria-busy={true}
    >
      <View className="items-center justify-center w-12 h-12 rounded-2xl bg-brand-primary/10 animate-pulse-soft">
        <Text className="text-2xl">♫</Text>
      </View>
      <ActivityIndicator size="large" color="#ff3b30" />
      {message && (
        <Text className="text-gray-400 text-sm font-medium">{message}</Text>
      )}
      <SkeletonLines />
    </View>
  );

  if (fullScreen) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center">
        {content}
      </View>
    );
  }

  return content;
}
