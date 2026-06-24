import { View, Text } from "react-native";

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  testID?: string;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  testID,
}: EmptyStateProps) {
  return (
    <View
      testID={testID}
      className="flex-1 items-center justify-center px-8 py-20 gap-3"
    >
      <Text className="text-5xl mb-2">{icon}</Text>
      <Text className="text-gray-300 text-lg font-semibold text-center">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-gray-500 text-sm text-center">{subtitle}</Text>
      )}
      {action && <View className="mt-4">{action}</View>}
    </View>
  );
}
