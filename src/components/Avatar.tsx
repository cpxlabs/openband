import { View, Text } from "react-native";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  testID?: string;
}

const sizes = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

export function Avatar({ name, size = "md", testID }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <View
      testID={testID}
      accessibilityLabel={name}
      accessibilityRole="image"
      className={`${sizes[size]} rounded-2xl bg-brand-primary/20 items-center justify-center border border-brand-primary/10`}
    >
      <Text
        className={`text-white font-bold text-center leading-none ${size === "sm" ? "text-sm" : size === "md" ? "text-xl" : "text-2xl"}`}
      >
        {initial}
      </Text>
    </View>
  );
}
