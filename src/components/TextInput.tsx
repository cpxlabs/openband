import { useState } from "react";
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

export function TextInput({
  label,
  error,
  className = "",
  testID,
  ...props
}: TextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-1.5">
      {label && <Text className="label ml-1">{label}</Text>}
      <RNTextInput
        testID={testID}
        className={`input-field p-4 ${focused ? "input-field-focused" : ""} ${error ? "border-red-500" : ""} ${className}`}
        placeholderTextColor="#555"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error && (
        <View className="flex-row items-center gap-1 ml-1">
          <Text className="text-red-400 text-xs">{error}</Text>
        </View>
      )}
    </View>
  );
}
