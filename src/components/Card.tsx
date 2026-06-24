import type { ReactNode } from 'react';
import { Pressable, View, Text } from 'react-native';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
  activeBorder?: boolean;
  elevated?: boolean;
  testID?: string;
}

export function Card({ children, onPress, activeBorder = false, elevated = false, className = '', testID }: CardProps) {
  const Container = onPress ? Pressable : View;
  return (
    <Container
      testID={testID}
      onPress={onPress}
      className={`${elevated ? 'card-elevated' : 'card'} ${activeBorder ? 'border-brand-primary/50' : ''} ${onPress ? 'active:opacity-80' : ''} ${className}`}
    >
      {children}
    </Container>
  );
}

export function CardRow({ children, onPress, className = '', testID }: CardProps) {
  const Container = onPress ? Pressable : View;
  return (
    <Container
      testID={testID}
      onPress={onPress}
      className={`flex-row items-center p-4 bg-dark-surface rounded-2xl border border-dark-border ${onPress ? 'active:border-brand-accent/50' : ''} ${className}`}
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
