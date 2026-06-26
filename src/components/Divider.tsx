import { View, Text } from "react-native";

interface DividerProps {
  className?: string;
  label?: string;
  labelAlign?: "center" | "left" | "right";
  testID?: string;
}

export function Divider({
  className = "",
  label,
  labelAlign = "center",
  testID,
}: DividerProps) {
  const labelView = (
    <View className="bg-dark-muted px-3 py-1 rounded-full">
      <Text className="text-gray-400 text-2xs font-semibold uppercase tracking-wider">
        {label}
      </Text>
    </View>
  );

  if (label) {
    if (labelAlign === "left") {
      return (
        <View testID={testID} className={`flex-row items-center gap-3 ${className}`}>
          {labelView}
          <View className="flex-1 h-px bg-dark-border" />
        </View>
      );
    }
    if (labelAlign === "right") {
      return (
        <View testID={testID} className={`flex-row items-center gap-3 ${className}`}>
          <View className="flex-1 h-px bg-dark-border" />
          {labelView}
        </View>
      );
    }
    return (
      <View
        testID={testID}
        className={`flex-row items-center gap-3 ${className}`}
      >
        <View className="flex-1 h-px bg-dark-border" />
        {labelView}
        <View className="flex-1 h-px bg-dark-border" />
      </View>
    );
  }

  return (
    <View testID={testID} className={`h-px bg-dark-border ${className}`} />
  );
}
