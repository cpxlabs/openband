import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { TOKEN_MAP, parsePattern, type TokenKey } from "../lib/codeSampler";

export { parsePattern };

type StepUnit = "1/4" | "1/8" | "1/16";

const PRESET_PATTERNS: { name: string; code: string }[] = [
  {
    name: "808 Classic",
    code: "KICK SNARE HH KICK SNARE HH KICK SNARE HH KICK SNARE HH",
  },
  {
    name: "Trap Roll",
    code: "KICK CLAP HH HH KICK CLAP HH HH KICK CLAP HH OH KICK CLAP HH HH",
  },
  {
    name: "Hip Hop",
    code: "KICK SNARE HH KICK KICK SNARE HH KICK SNARE HH HH KICK SNARE OH",
  },
  {
    name: "Four on Floor",
    code: "KICK HH SNARE HH KICK HH SNARE HH KICK HH SNARE HH KICK HH SNARE HH",
  },
  { name: "Half Time", code: "KICK SNARE KICK KICK SNARE KICK SNARE KICK" },
  {
    name: "Bassline Basic",
    code: "BASS REST BASS REST BASS REST BASS REST BASS REST BASS REST BASS REST BASS REST",
  },
];

interface CodeSamplerProps {
  visible: boolean;
  onClose: () => void;
  onRender: (
    tracks: { name: string; tokens: TokenKey[]; unit: StepUnit; bpm: number }[],
  ) => void;
  bpm: number;
  testID?: string;
}

export function CodeSampler({
  visible,
  onClose,
  onRender,
  bpm,
  testID,
}: CodeSamplerProps) {
  const [code, setCode] = useState(
    "KICK SNARE HH KICK SNARE HH KICK SNARE HH KICK SNARE HH",
  );
  const [unit, setUnit] = useState<StepUnit>("1/8");
  const [patternBpm, setPatternBpm] = useState(bpm);
  const [useBpm, setUseBpm] = useState(true);

  const tokens = useMemo(() => {
    const { tokens: parsed } = parsePattern(code);
    return parsed.filter((t) => t === "REST" || TOKEN_MAP[t as TokenKey]);
  }, [code]);
  const effectiveBpm = Math.max(1, useBpm ? bpm : patternBpm);

  const handleRender = useCallback(() => {
    onRender([{ name: "Code Pattern", tokens, unit, bpm: effectiveBpm }]);
    onClose();
  }, [onRender, tokens, unit, effectiveBpm, onClose]);

  const handlePreset = useCallback((presetCode: string) => {
    setCode(presetCode);
  }, []);

  const stepSeconds =
    unit === "1/4"
      ? 60 / effectiveBpm
      : unit === "1/8"
        ? 30 / effectiveBpm
        : 15 / effectiveBpm;
  const totalDuration = tokens.length * stepSeconds;

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
        <Pressable className="w-full max-w-lg max-h-[80%] bg-dark-surface rounded-3xl border border-dark-border overflow-hidden">
          <View className="p-5 border-b border-dark-border">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-white text-lg font-bold">Code Sampler</Text>
              <Pressable
                onPress={onClose}
                className="w-7 h-7 items-center justify-center active:opacity-60"
              >
                <Text className="text-gray-500 text-sm">✕</Text>
              </Pressable>
            </View>
            <Text className="text-gray-500 text-xs">
              Escreva padrões com código para gerar faixas
            </Text>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          >
            <Text className="label mb-2">Tokens disponíveis</Text>
            <View className="flex-row flex-wrap gap-1.5 mb-4">
              {(Object.keys(TOKEN_MAP) as TokenKey[]).map((key) => (
                <View
                  key={key}
                  className={`${TOKEN_MAP[key].color} px-2 py-0.5 rounded-md flex-row items-center gap-1`}
                >
                  <Text className="text-white text-[9px] font-bold">{key}</Text>
                </View>
              ))}
            </View>

            <Text className="label mb-2">Código do padrão</Text>
            <View className="bg-dark-elevated rounded-xl border border-dark-border p-3 mb-3">
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="KICK SNARE HH ..."
                placeholderTextColor="#666"
                className="text-white text-sm font-mono"
                multiline
                autoCapitalize="characters"
              />
            </View>

            <Text className="label mb-2">Presets</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              <View className="flex-row gap-2">
                {PRESET_PATTERNS.map((p) => (
                  <Pressable
                    key={p.name}
                    onPress={() => handlePreset(p.code)}
                    className="px-3 py-2 rounded-xl bg-dark-elevated border border-dark-border active:opacity-70"
                  >
                    <Text className="text-gray-300 text-xs font-semibold">
                      {p.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View className="flex-row items-center gap-3 mb-4">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-gray-400 text-[10px] font-semibold">
                  Step:
                </Text>
                {(["1/4", "1/8", "1/16"] as StepUnit[]).map((u) => (
                  <Pressable
                    key={u}
                    onPress={() => setUnit(u)}
                    className={`px-2 py-1 rounded-lg border ${unit === u ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-elevated border-dark-border"}`}
                  >
                    <Text
                      className={`text-[10px] font-semibold ${unit === u ? "text-brand-accent" : "text-white"}`}
                    >
                      {u}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {!useBpm && (
                <View className="flex-row items-center gap-1">
                  <Text className="text-gray-400 text-[10px] font-semibold">
                    BPM:
                  </Text>
                  <TextInput
                    value={String(patternBpm)}
                    onChangeText={(t) => setPatternBpm(Number(t) || 120)}
                    keyboardType="numeric"
                    className="text-white text-xs font-mono bg-dark-elevated border border-dark-border rounded-lg px-2 py-1 w-14 text-center"
                  />
                </View>
              )}
              <Pressable
                onPress={() => setUseBpm(!useBpm)}
                className={`px-2 py-1 rounded-lg border ${useBpm ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-elevated border-dark-border"}`}
              >
                <Text
                  className={`text-[10px] font-semibold ${useBpm ? "text-brand-accent" : "text-gray-400"}`}
                >
                  Seg BPM
                </Text>
              </Pressable>
            </View>

            <Text className="label mb-2">
              Preview — {tokens.length} steps ({totalDuration.toFixed(1)}s @{" "}
              {effectiveBpm} BPM)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              className="mb-4"
            >
              <View className="flex-row gap-0.5 py-1">
                {tokens.map((t, i) => (
                  <View
                    key={i}
                    className={`w-10 h-10 rounded-lg ${TOKEN_MAP[t]?.color || "bg-dark-muted"} items-center justify-center ${i % 4 === 3 ? "mr-0.5" : ""}`}
                  >
                    <Text className="text-white text-[8px] font-bold text-center leading-tight">
                      {t}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>

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
                disabled={tokens.length === 0}
              >
                <Text className="text-white text-sm font-bold">
                  Renderizar → Track
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
