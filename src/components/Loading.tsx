import { View, Text } from 'react-native';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message = 'Carregando...', fullScreen = false }: LoadingProps) {
  const content = (
    <View className="items-center justify-center gap-4">
      <View className="w-10 h-10 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
      {message && <Text className="text-gray-400 text-sm font-medium">{message}</Text>}
    </View>
  );

  if (fullScreen) {
    return <View className="flex-1 bg-dark-bg items-center justify-center">{content}</View>;
  }

  return content;
}
