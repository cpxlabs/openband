import { View, Text } from "react-native";

interface BadgeProps {
  text: string;
  icon?: string;
  variant?: "default" | "play" | "active";
  testID?: string;
}

const variantStyles = {
  default: "bg-dark-muted",
  play: "bg-dark-bg border border-dark-border",
  active: "bg-brand-primary/10 border border-brand-primary/20",
};

const textStyles = {
  default: "text-gray-400",
  play: "text-gray-500",
  active: "text-brand-primary",
};

export function Badge({ text, icon, variant = "default", testID }: BadgeProps) {
  return (
    <View
      testID={testID}
      className={`${variantStyles[variant]} px-2.5 py-1 rounded-full flex-row items-center gap-1`}
    >
      {icon && <Text className={`text-xs ${textStyles[variant]}`}>{icon}</Text>}
      <Text className={`${textStyles[variant]} text-xs font-medium`} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}
