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
  const content = (
    <View testID={testID} className="items-center justify-center gap-4">
      <ActivityIndicator size="large" color="#ff3b30" />
      {message && (
        <Text className="text-gray-400 text-sm font-medium">{message}</Text>
      )}
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
