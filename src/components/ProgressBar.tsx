import { View } from 'react-native';

interface ProgressBarProps {
  progress: number;
  className?: string;
}

export function ProgressBar({ progress, className = '' }: ProgressBarProps) {
  return (
    <View className={`h-1 bg-dark-border rounded-full overflow-hidden ${className}`}>
      <View
        className="h-full bg-brand-primary rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </View>
  );
}
