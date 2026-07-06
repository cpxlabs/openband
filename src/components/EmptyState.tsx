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
      className="flex-1 items-center justify-center px-8 py-20 gap-4"
    >
      <View className="w-16 h-16 rounded-3xl bg-dark-elevated items-center justify-center mb-1 border border-dark-border">
        <Text className="text-3xl">{icon}</Text>
      </View>
      <Text className="text-gray-200 text-xl font-bold text-center">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-gray-500 text-sm text-center max-w-xs leading-5">
          {subtitle}
        </Text>
      )}
      {action && <View className="mt-2">{action}</View>}
    </View>
  );
}
