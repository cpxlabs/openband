import { View } from "react-native";

interface ProgressBarProps {
  progress: number;
  className?: string;
  testID?: string;
}

export function ProgressBar({
  progress,
  className = "",
  testID,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-1.5 bg-dark-muted/50 rounded-full overflow-hidden ${className}`}
    >
      <View
        className="h-full bg-brand-primary rounded-full transition-all duration-normal ease-out-quart"
        style={{ width: `${clamped}%` }}
      />
    </View>
  );
}
