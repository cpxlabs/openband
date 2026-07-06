import type { ReactNode } from "react";
import { Pressable, View, Text } from "react-native";

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
  activeBorder?: boolean;
  highlighted?: boolean;
  elevated?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

export function Card({
  children,
  onPress,
  activeBorder = false,
  highlighted = false,
  elevated = false,
  className = "",
  testID,
  accessibilityLabel,
}: CardProps) {
  const Container = onPress ? Pressable : View;
  const isHighlighted = highlighted || activeBorder;
  return (
    <Container
      testID={testID}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? (accessibilityLabel ?? "Card") : undefined}
      className={`${elevated ? "card-elevated shadow-card" : "card"} ${isHighlighted ? "glow-border" : ""} pressable-scale ${onPress ? "hover:bg-dark-elevated" : ""} ${className}`.trim().replace(/\s+/g, " ")}
    >
      {children}
    </Container>
  );
}

export function CardRow({
  children,
  onPress,
  className = "",
  testID,
  accessibilityLabel,
}: CardProps) {
  const Container = onPress ? Pressable : View;
  return (
    <Container
      testID={testID}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? (accessibilityLabel ?? "Card row") : undefined}
      className={`card flex-row items-center p-4 pressable-scale ${onPress ? "hover:bg-dark-elevated" : ""} ${className}`.trim().replace(/\s+/g, " ")}
    >
      {children}
    </Container>
  );
}

export function CardIcon({ icon }: { icon: string }) {
  return (
    <View className="w-12 h-12 rounded-xl bg-brand-primary/20 items-center justify-center">
      <Text className="text-xl">{icon}</Text>
    </View>
  );
}
