import { View, Text } from 'react-native';

interface DividerProps {
  className?: string;
  label?: string;
}

export function Divider({ className = '', label }: DividerProps) {
  if (label) {
    return (
      <View className={`flex-row items-center gap-3 ${className}`}>
        <View className="flex-1 h-px bg-dark-border" />
        <View className="bg-dark-muted px-3 py-1 rounded-full">
          <Text className="text-gray-500 text-xs font-medium">{label}</Text>
        </View>
        <View className="flex-1 h-px bg-dark-border" />
      </View>
    );
  }

  return <View className={`h-px bg-dark-border ${className}`} />;
}
