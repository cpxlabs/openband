import { useState, useCallback } from "react";
import { View, Text, Pressable, Modal, TextInput } from "react-native";

interface PromptSamplerProps {
  visible: boolean;
  onClose: () => void;
  onRender: (data: { prompt: string; bpm: number; key: string }) => void;
  bpm: number;
  testID?: string;
}

export function PromptSampler({
  visible,
  onClose,
  onRender,
  bpm,
  testID,
}: PromptSamplerProps) {
  const [prompt, setPrompt] = useState("");
  const [promptBpm, setPromptBpm] = useState(bpm);
  const [key, setKey] = useState("C Major");

  const handleRender = useCallback(() => {
    onRender({ prompt, bpm: promptBpm, key });
    onClose();
  }, [onRender, prompt, promptBpm, key, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable
        className="flex-1 bg-black/60 justify-center items-center px-3"
        onPress={onClose}
      >
        <Pressable
          className="w-full max-w-lg bg-dark-surface rounded-3xl border border-dark-border overflow-hidden"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="p-5 border-b border-dark-border">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-white text-lg font-bold">
                Prompt MIDI Generator
              </Text>
              <Pressable
                onPress={onClose}
                className="w-7 h-7 items-center justify-center active:opacity-60"
              >
                <Text className="text-gray-500 text-sm">✕</Text>
              </Pressable>
            </View>
            <Text className="text-gray-500 text-xs">
              Descreva a melodia que você deseja
            </Text>
          </View>

          <View className="p-5">
            <Text className="label mb-2">Prompt</Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g., chill piano melody in C major"
              placeholderTextColor="#666"
              className="text-white text-sm bg-dark-elevated rounded-xl border border-dark-border p-3 mb-4"
              multiline
            />

            <View className="flex-row gap-4 mb-4">
              <View className="flex-1">
                <Text className="label mb-2">BPM</Text>
                <TextInput
                  value={String(promptBpm)}
                  onChangeText={(t) => setPromptBpm(Number(t) || 120)}
                  keyboardType="numeric"
                  className="text-white text-sm bg-dark-elevated border border-dark-border rounded-xl px-3 py-2"
                />
              </View>
              <View className="flex-1">
                <Text className="label mb-2">Key</Text>
                <TextInput
                  value={key}
                  onChangeText={setKey}
                  className="text-white text-sm bg-dark-elevated border border-dark-border rounded-xl px-3 py-2"
                />
              </View>
            </View>

            <View className="h-px bg-dark-border mb-4" />

            <View className="flex-row gap-3">
              <Pressable
                onPress={onClose}
                className="flex-1 py-3 rounded-xl border border-dark-border items-center active:opacity-70"
              >
                <Text className="text-gray-400 text-sm font-semibold">
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={handleRender}
                className="flex-1 py-3 rounded-xl bg-brand-primary items-center active:opacity-80 disabled:opacity-50"
                disabled={!prompt}
              >
                <Text className="text-white text-sm font-bold">Gerar MIDI</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
