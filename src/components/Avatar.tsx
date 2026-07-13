import { View, Text, Image } from "react-native";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  imageUrl?: string;
  testID?: string;
}

const sizes = {
  sm: "w-8 h-8 text-sm",
  md: "w-12 h-12 text-xl",
  lg: "w-16 h-16 text-2xl",
};

export function Avatar({ name, size = "md", imageUrl, testID }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <View
      testID={testID}
      accessibilityLabel={name}
      accessibilityRole="image"
      className={`${sizes[size]} rounded-2xl bg-brand-primary/30 items-center justify-center overflow-hidden`}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          className={`${sizes[size]} rounded-2xl`}
          resizeMode="cover"
        />
      ) : (
        <Text
          className={`${sizes[size]} text-white font-bold text-center leading-none`}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}
