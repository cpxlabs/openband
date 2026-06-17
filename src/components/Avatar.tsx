import { View, Text } from 'react-native';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-xl',
  lg: 'w-16 h-16 text-2xl',
};

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <View className={`${sizes[size]} rounded-2xl bg-brand-primary/30 items-center justify-center`}>
      <Text className={`${sizes[size]} text-white font-bold text-center leading-none`}>{initial}</Text>
    </View>
  );
}
