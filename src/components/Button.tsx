import { Pressable, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  className?: string;
}

const variantStyles = {
  primary: 'bg-brand-primary active:opacity-80',
  secondary: 'bg-dark-muted border border-dark-border active:opacity-80',
  ghost: 'active:opacity-60',
};

const textStyles = {
  primary: 'text-white',
  secondary: 'text-gray-200',
  ghost: 'text-brand-accent',
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, className = '' }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${variantStyles[variant]} rounded-xl p-4 flex-row items-center justify-center gap-2 ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : '#999'} size="small" />
      ) : (
        <>
          {icon && <Text className="text-base">{icon}</Text>}
          <Text className={`${textStyles[variant]} font-bold text-base`}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
