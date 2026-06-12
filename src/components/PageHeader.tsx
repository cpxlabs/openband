import { View, Text } from 'react-native';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <View className="px-4 pb-4">
      <Text className="text-white text-3xl font-bold tracking-tight">{title}</Text>
      {subtitle && <Text className="text-gray-500 text-sm mt-1">{subtitle}</Text>}
    </View>
  );
}
