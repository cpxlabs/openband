import { View, Text, Platform } from "react-native";

interface DividerProps {
  className?: string;
  label?: string;
  labelAlign?: "center" | "left" | "right";
  variant?: "solid" | "gradient";
  testID?: string;
}

export function Divider({
  className = "",
  label,
  labelAlign = "center",
  variant = "solid",
  testID,
}: DividerProps) {
  const useGradient = variant === "gradient" && Platform.OS === "web";
  const lineClass = useGradient
    ? "flex-1 h-px bg-gradient-to-r from-transparent via-dark-border to-transparent"
    : "flex-1 h-px bg-dark-border";

  const labelView = (
    <View className="bg-dark-surface px-3 py-1 rounded-full border border-dark-border/50">
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
          <View className={lineClass} />
        </View>
      );
    }
    if (labelAlign === "right") {
      return (
        <View testID={testID} className={`flex-row items-center gap-3 ${className}`}>
          <View className={lineClass} />
          {labelView}
        </View>
      );
    }
    return (
      <View
        testID={testID}
        className={`flex-row items-center gap-3 ${className}`}
      >
        <View className={lineClass} />
        {labelView}
        <View className={lineClass} />
      </View>
    );
  }

  return (
    <View testID={testID} className={`h-px bg-dark-border ${className}`} />
  );
}
