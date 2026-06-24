import { useState, useCallback, useRef } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import type { MetronomeSettings } from "../lib/types";

interface MetronomeProps {
  settings: MetronomeSettings;
  onChange: (s: MetronomeSettings) => void;
  isPlaying: boolean;
  testID?: string;
}

const TIME_SIGS: [number, number][] = [
  [4, 4],
  [3, 4],
  [6, 8],
  [2, 4],
  [5, 4],
  [7, 8],
];

export function Metronome({
  settings,
  onChange,
  isPlaying,
  testID,
}: MetronomeProps) {
  const [expanded, setExpanded] = useState(false);
  const tapTimes = useRef<number[]>([]);

  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    tapTimes.current = [...tapTimes.current.filter((t) => now - t < 2000), now];
    if (tapTimes.current.length >= 2) {
      const intervals = tapTimes.current
        .slice(1)
        .map((t, i) => t - tapTimes.current[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avg);
      if (bpm >= 40 && bpm <= 280) {
        onChange({ ...settings, bpm });
      }
    }
  }, [settings, onChange]);

  return (
    <View testID={testID}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center gap-2 bg-[#0b0b0d] px-3 py-1.5 rounded-lg border border-dark-border"
      >
        <Text className="text-emerald-400 font-mono text-[10px] tracking-widest">
          {settings.enabled ? "♩" : "♪"}
        </Text>
        <Text className="text-white font-mono text-sm">{settings.bpm}</Text>
      </Pressable>

      {expanded && (
        <View className="absolute top-full mt-2 right-0 w-72 bg-dark-elevated border border-dark-border rounded-2xl p-4 z-50 shadow-xl">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="label text-gray-300">Metrônomo</Text>
            <Pressable
              onPress={() =>
                onChange({ ...settings, enabled: !settings.enabled })
              }
              className={`w-12 h-6 rounded-full p-0.5 ${settings.enabled ? "bg-emerald-500" : "bg-dark-muted"}`}
            >
              <View
                className={`w-5 h-5 rounded-full bg-white shadow-sm ${settings.enabled ? "ml-6" : "ml-0"}`}
              />
            </Pressable>
          </View>

          <Text className="label mb-1 text-gray-400">BPM</Text>
          <View className="flex-row items-center gap-2 mb-3">
            <Pressable
              onPress={() =>
                onChange({ ...settings, bpm: Math.max(40, settings.bpm - 1) })
              }
              className="w-8 h-8 rounded-lg bg-dark-surface items-center justify-center active:opacity-70"
            >
              <Text className="text-gray-300 text-lg">−</Text>
            </Pressable>
            <TextInput
              value={String(settings.bpm)}
              onChangeText={(t) => {
                const n = parseInt(t) || 120;
                onChange({ ...settings, bpm: Math.min(280, Math.max(40, n)) });
              }}
              keyboardType="number-pad"
              className="flex-1 h-9 bg-dark-surface border border-dark-border rounded-lg text-white font-mono text-center text-sm"
            />
            <Pressable
              onPress={() =>
                onChange({ ...settings, bpm: Math.min(280, settings.bpm + 1) })
              }
              className="w-8 h-8 rounded-lg bg-dark-surface items-center justify-center active:opacity-70"
            >
              <Text className="text-gray-300 text-lg">+</Text>
            </Pressable>
            <Pressable
              onPress={handleTapTempo}
              className="h-9 px-3 rounded-lg bg-brand-accent items-center justify-center active:opacity-70"
            >
              <Text className="text-white text-xs font-bold">Tap</Text>
            </Pressable>
          </View>

          <Text className="label mb-1 text-gray-400">Assinatura</Text>
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {TIME_SIGS.map((sig) => {
              const active =
                settings.timeSig[0] === sig[0] &&
                settings.timeSig[1] === sig[1];
              return (
                <Pressable
                  key={`${sig[0]}/${sig[1]}`}
                  onPress={() => onChange({ ...settings, timeSig: sig })}
                  className={`px-3 py-1.5 rounded-lg border ${active ? "bg-brand-primary/20 border-brand-primary" : "bg-dark-surface border-dark-border"}`}
                >
                  <Text
                    className={`font-mono text-xs ${active ? "text-brand-primary" : "text-gray-400"}`}
                  >
                    {sig[0]}/{sig[1]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="label mb-1 text-gray-400">Acento a cada</Text>
          <View className="flex-row gap-1.5 mb-3">
            {[1, 2, 4].map((n) => (
              <Pressable
                key={n}
                onPress={() => onChange({ ...settings, accentInterval: n })}
                className={`px-3 py-1.5 rounded-lg border ${settings.accentInterval === n ? "bg-emerald-500/20 border-emerald-500" : "bg-dark-surface border-dark-border"}`}
              >
                <Text
                  className={`font-mono text-xs ${settings.accentInterval === n ? "text-emerald-400" : "text-gray-400"}`}
                >
                  {n} tempo{n > 1 ? "s" : ""}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="label mb-1 text-gray-400">Count-In</Text>
          <View className="flex-row gap-1.5 mb-3">
            {[0, 1, 2, 4].map((n) => (
              <Pressable
                key={n}
                onPress={() =>
                  onChange({
                    ...settings,
                    countIn: n > 0,
                    countInBars: Math.max(n, 1),
                  })
                }
                className={`px-3 py-1.5 rounded-lg border ${settings.countIn && settings.countInBars === Math.max(n, 1) ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-surface border-dark-border"}`}
              >
                <Text
                  className={`font-mono text-xs ${settings.countIn && settings.countInBars === Math.max(n, 1) ? "text-brand-accent" : "text-gray-400"}`}
                >
                  {n === 0 ? "Off" : `${n} Compasso${n > 1 ? "s" : ""}`}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="label mb-1 text-gray-400">Volume</Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-gray-500 text-xs">♩</Text>
            <View className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
              <View
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${settings.volume}%` }}
              />
            </View>
            <Text className="text-gray-400 font-mono text-xs w-8 text-right">
              {settings.volume}%
            </Text>
            <Pressable
              onPress={() =>
                onChange({
                  ...settings,
                  volume: Math.min(100, settings.volume + 10),
                })
              }
              className="w-6 h-6 rounded bg-dark-surface items-center justify-center active:opacity-70"
            >
              <Text className="text-gray-400 text-xs">+</Text>
            </Pressable>
          </View>

          {isPlaying && (
            <View className="flex-row gap-1 mt-3 justify-center">
              {Array.from({ length: settings.timeSig[0] }, (_, i) => (
                <View
                  key={i}
                  className={`w-2 h-2 rounded-full ${i % settings.accentInterval === 0 ? "bg-emerald-400" : "bg-emerald-600/50"}`}
                  style={{
                    opacity: 0.6 + Math.sin(Date.now() * 0.008 + i * 2) * 0.4,
                  }}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
