import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { MASTERING_CHAIN_PRESETS } from '../lib/mastering';

const EQ_BANDS = [
  { id: 'bass', label: 'Bass', freq: '80Hz' },
  { id: 'lowMid', label: 'Low Mid', freq: '300Hz' },
  { id: 'mid', label: 'Mid', freq: '1kHz' },
  { id: 'highMid', label: 'Hi Mid', freq: '5kHz' },
  { id: 'treble', label: 'Treble', freq: '12kHz' },
];

interface MiniMasteringProps {
  onPresetChange: (index: number) => void;
  activePreset: number;
  eqValues: Record<string, number>;
  onEqChange: (band: string, value: number) => void;
}

export function MiniMastering({ onPresetChange, activePreset, eqValues, onEqChange }: MiniMasteringProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="rounded-xl bg-dark-surface border border-dark-border overflow-hidden">
      <Pressable onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between px-3 py-2 bg-dark-elevated/30 active:opacity-70">
        <View className="flex-row items-center gap-2">
          <Text className="text-brand-accent text-xs">⊡</Text>
          <Text className="text-white text-[11px] font-semibold">Mastering</Text>
          <View className="bg-brand-accent/20 px-1.5 py-0.5 rounded">
            <Text className="text-brand-accent text-[8px] font-bold">{MASTERING_CHAIN_PRESETS[activePreset]?.name || 'Off'}</Text>
          </View>
        </View>
        <Text className="text-gray-500 text-[10px]">{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded && (
        <View className="p-3 gap-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-1.5 pb-1">
              {MASTERING_CHAIN_PRESETS.map((preset, i) => (
                <Pressable key={preset.name} onPress={() => onPresetChange(i)}
                  className={`px-2.5 py-1.5 rounded-lg border ${activePreset === i ? 'bg-brand-accent/20 border-brand-accent' : 'bg-dark-elevated border-dark-border'}`}>
                  <Text className={`text-[9px] font-semibold ${activePreset === i ? 'text-brand-accent' : 'text-gray-300'}`} style={{ flexShrink: 0 }}>{preset.name}</Text>
                  <Text className="text-gray-600 text-[7px]">{preset.plugins.length} plugins</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View className="h-px bg-dark-border" />

          <Text className="text-gray-500 text-[9px] font-semibold uppercase tracking-wider">EQ Rápido</Text>
          <View className="gap-2">
            {EQ_BANDS.map(band => {
              const val = eqValues[band.id] ?? 0;
              return (
                <View key={band.id} className="flex-row items-center gap-2">
                  <View className="w-16">
                    <Text className="text-gray-400 text-[9px] font-medium">{band.label}</Text>
                    <Text className="text-gray-600 text-[7px]">{band.freq}</Text>
                  </View>
                  <View className="flex-1 h-5 bg-dark-bg rounded-full relative overflow-hidden">
                    <View className="absolute left-1/2 top-0 bottom-0 w-px bg-dark-border" />
                    <View
                      className="absolute top-0.5 bottom-0.5 rounded-full bg-brand-accent/60"
                      style={{ left: `${50 + ((val ?? 0) / 12) * 50}%`, right: `${50 - ((val ?? 0) / 12) * 50}%` }}
                    />
                  </View>
                  <View className="flex-row items-center gap-0.5">
                    <Pressable onPress={() => onEqChange(band.id, Math.max(-12, val - 1))}
                      className="w-5 h-5 rounded bg-dark-muted items-center justify-center active:opacity-70">
                      <Text className="text-gray-400 text-[9px]">−</Text>
                    </Pressable>
                    <Text className="text-white text-[9px] font-mono w-7 text-center">{val > 0 ? '+' : ''}{val.toFixed(0)}</Text>
                    <Pressable onPress={() => onEqChange(band.id, Math.min(12, val + 1))}
                      className="w-5 h-5 rounded bg-dark-muted items-center justify-center active:opacity-70">
                      <Text className="text-gray-400 text-[9px]">+</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
