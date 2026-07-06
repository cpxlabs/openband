import { Pressable, Text, ActivityIndicator } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
  className?: string;
  testID?: string;
}

const variantBase = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
};

const sizeStyles = {
  sm: "px-3 py-2",
  md: "px-5 py-3",
  lg: "px-6 py-4",
};

const textSizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

const textStyles = {
  primary: "text-white",
  secondary: "text-gray-200",
  ghost: "text-brand-accent",
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  icon,
  fullWidth,
  className = "",
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`${variantBase[variant]} ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} flex-row items-center justify-center gap-2 pressable-scale ${isDisabled ? "opacity-40" : "hover:opacity-90"} ${className}`.trim().replace(/\s+/g, " ")}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? "white" : "#999"}
          size="small"
        />
      ) : (
        <>
          {icon && <Text className={`${textSizes[size]}`}>{icon}</Text>}
          <Text className={`${textStyles[variant]} font-bold ${textSizes[size]}`} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
