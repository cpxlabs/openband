import { View } from 'react-native';

interface ProgressBarProps {
  progress: number;
  className?: string;
  testID?: string;
}

export function ProgressBar({ progress, className = '', testID }: ProgressBarProps) {
  return (
    <View testID={testID} className={`h-1 bg-dark-border rounded-full overflow-hidden ${className}`}>
      <View
        className="h-full bg-brand-primary rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </View>
  );
}
