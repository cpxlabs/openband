import { Text, Pressable } from "react-native";
import type { VoiceCommand } from "../lib/voiceCommands";

export function VoiceCommandButton({
  isListening,
  onToggle,
}: {
  onCommand: (cmd: VoiceCommand) => void;
  isListening: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className={`p-3 rounded-full transition-all duration-normal pressable-scale ${isListening ? "bg-red-500" : "bg-dark-surface border border-dark-border"} items-center justify-center`}
    >
      <Text className="text-lg">{isListening ? "🔴" : "🎤"}</Text>
    </Pressable>
  );
}
