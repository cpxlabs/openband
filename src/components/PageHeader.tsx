import { View, Text } from "react-native";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  testID?: string;
}

export function PageHeader({ title, subtitle, testID }: PageHeaderProps) {
  return (
    <View testID={testID}>
      <Text className="heading-1 mobile:text-2xl tablet:text-3xl">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-gray-500 text-xs mobile:text-sm tablet:text-base mt-1">
          {subtitle}
        </Text>
      )}
    </View>
  );
}
