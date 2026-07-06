import { View, Text } from "react-native";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  testID?: string;
}

export function PageHeader({ title, subtitle, testID }: PageHeaderProps) {
  return (
    <View testID={testID} className="gap-1">
      <Text className="text-white font-bold text-2xl tablet:text-3xl tracking-tight">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-gray-400 text-sm tablet:text-base leading-relaxed">
          {subtitle}
        </Text>
      )}
    </View>
  );
}
