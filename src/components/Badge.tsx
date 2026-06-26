import { View, Text } from "react-native";

interface BadgeProps {
  text: string;
  icon?: string;
  variant?: "default" | "play" | "active";
  testID?: string;
}

const variantStyles = {
  default: "bg-dark-muted",
  play: "bg-brand-primary/10 border border-brand-primary/20",
  active: "bg-brand-green/10 border border-brand-green/20",
};

const textStyles = {
  default: "text-gray-400",
  play: "text-brand-primary",
  active: "text-brand-green",
};

export function Badge({ text, icon, variant = "default", testID }: BadgeProps) {
  return (
    <View
      testID={testID}
      className={`badge ${variantStyles[variant]}`}
    >
      {icon && <Text className={`text-xs ${textStyles[variant]}`}>{icon}</Text>}
      <Text className={`${textStyles[variant]} text-xs font-medium`} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}
