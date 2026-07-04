import { View, Text, Pressable } from "react-native";
import type { MasteringInput } from "../lib/masteringSuite";
import {
  formatSampleRate,
  formatBitDepth,
  formatFileSize,
} from "../lib/masteringSuite";

interface MasteringUploadProps {
  input: MasteringInput | null;
  mode: "single" | "stems";
  onModeChange: (mode: "single" | "stems") => void;
  onUpload: () => void;
  onClear: () => void;
  testID?: string;
}

export function MasteringUpload({
  input,
  mode,
  onModeChange,
  onUpload,
  onClear,
  testID,
}: MasteringUploadProps) {
  return (
    <View
      testID={testID}
      className="bg-dark-surface rounded-xl border border-dark-border p-4"
    >
      <View className="flex-row items-center gap-2 mb-3">
        <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
        <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
          Input
        </Text>
      </View>

      <View className="flex-row gap-2 mb-3">
        <Pressable
          onPress={() => onModeChange("single")}
          className={`flex-1 py-2 rounded-lg items-center border ${mode === "single" ? "bg-green-500/20 border-green-500/40" : "bg-dark-muted/30 border-dark-border"}`}
        >
          <Text
            className={`text-xs font-bold ${mode === "single" ? "text-green-400" : "text-gray-400"}`}
          >
            Single File
          </Text>
          <Text
            className={`text-[8px] mt-0.5 ${mode === "single" ? "text-green-400/70" : "text-gray-600"}`}
          >
            Mix estéreo .wav
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onModeChange("stems")}
          className={`flex-1 py-2 rounded-lg items-center border ${mode === "stems" ? "bg-green-500/20 border-green-500/40" : "bg-dark-muted/30 border-dark-border"}`}
        >
          <Text
            className={`text-xs font-bold ${mode === "stems" ? "text-green-400" : "text-gray-400"}`}
          >
            Stems
          </Text>
          <Text
            className={`text-[8px] mt-0.5 ${mode === "stems" ? "text-green-400/70" : "text-gray-600"}`}
          >
            Multi-track .wav
          </Text>
        </Pressable>
      </View>

      {input ? (
        <View className="bg-dark-elevated rounded-lg border border-dark-border/50 p-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-white text-xs font-semibold">
                {input.filename}
              </Text>
              <View className="flex-row gap-3 mt-1 flex-wrap">
                <Text className="text-gray-500 text-[9px]">
                  {formatSampleRate(input.sampleRate)}
                </Text>
                <Text className="text-gray-500 text-[9px]">
                  {formatBitDepth(input.bitDepth)}
                </Text>
                <Text className="text-gray-500 text-[9px]">
                  {formatFileSize(input.size)}
                </Text>
                {input.bpm ? (
                  <Text className="text-gray-500 text-[9px]">{input.bpm} BPM</Text>
                ) : null}
                {input.key ? (
                  <Text className="text-gray-500 text-[9px]">Key: {input.key}</Text>
                ) : null}
                {input.timeSignature ? (
                  <Text className="text-gray-500 text-[9px]">{input.timeSignature}</Text>
                ) : null}
              </View>
              {mode === "stems" && input.stems ? (
                <View className="flex-row gap-2 mt-1.5 flex-wrap">
                  {input.stems.map((s) => (
                    <View
                      key={s.name}
                      className="px-2 py-0.5 rounded bg-dark-muted/50"
                    >
                      <Text className="text-gray-400 text-[8px]">{s.name}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={onClear}
              className="px-2.5 py-1 rounded bg-red-500/20 border border-red-500/30"
            >
              <Text className="text-red-400 text-[10px] font-medium">
                Trocar
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={onUpload}
          className="border-2 border-dashed border-dark-border rounded-xl py-8 items-center active:opacity-70"
        >
          <Text className="text-3xl mb-2">⊞</Text>
          <Text className="text-gray-400 text-sm font-semibold">
            {mode === "single" ? "Upload .wav Mix" : "Upload Stems"}
          </Text>
          <Text className="text-gray-600 text-[10px] mt-1">
            {mode === "single"
              ? "16-bit/44.1kHz ~ 32-bit/96kHz"
              : "Drums, Bass, Vocals, Melodies..."}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
