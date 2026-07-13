import { forwardRef, useState, useId } from "react";
import {
  View,
  TextInput as RNTextInput,
  Text,
  type TextInputProps as RNProps,
} from "react-native";

interface TextInputProps extends RNProps {
  label?: string;
  error?: string | null;
  testID?: string;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  {
    label,
    error,
    className = "",
    testID,
    ...props
  },
  ref
) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  const labelId = `label-${id}`;
  const errorId = `error-${id}`;

  return (
    <View className="gap-1.5">
      {label && <Text className="label ml-1" nativeID={labelId}>{label}</Text>}
      <RNTextInput
        ref={ref}
        testID={testID}
        className={`input-field p-4 ${focused ? "input-field-focused" : ""} ${error ? "border-red-500" : ""} ${className}`}
        placeholderTextColor="#555"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabelledBy={label ? labelId : undefined}
        aria-errormessage={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <View className="flex-row items-center gap-1 ml-1" nativeID={errorId}>
          <Text className="text-red-400 text-xs">{error}</Text>
        </View>
      )}
    </View>
  );
});
