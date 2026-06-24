import { View, Text, Pressable, ScrollView } from 'react-native';
import type { RecordSettings } from '../lib/types';

interface RecordOptionsProps {
  settings: RecordSettings;
  onChange: (s: RecordSettings) => void;
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

const QUALITY_LABELS: Record<string, string> = {
  low: 'Baixa (128kbps)',
  medium: 'Média (256kbps)',
  high: 'Alta (320kbps)',
  lossless: 'Lossless (WAV)',
};

const QUALITY_ICONS: Record<string, string> = {
  low: '◯',
  medium: '◔',
  high: '◕',
  lossless: '●',
};

const INPUT_SOURCES = [
  { id: 'mic' as const, label: 'Microfone', icon: '🎤' },
  { id: 'line' as const, label: 'Linha (DI)', icon: '🔌' },
  { id: 'virtual' as const, label: 'Virtual (Loopback)', icon: '💻' },
];

const SAMPLE_RATES = [44100, 48000, 96000];

export function RecordOptions({ settings, onChange, visible, onClose, testID }: RecordOptionsProps) {
  if (!visible) return null;

  return (
    <View testID={testID} className="absolute inset-0 z-50 bg-black/60 justify-end">
      <View className="bg-dark-elevated border-t border-dark-border rounded-t-3xl max-h-[80%]">
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-dark-border">
          <View className="flex-row items-center gap-2">
            <View className={`w-3 h-3 rounded-full ${settings.armed ? 'bg-red-500' : 'bg-gray-600'}`} />
            <Text className="text-white text-lg font-bold">Opções de Gravação</Text>
          </View>
          <Pressable
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-dark-surface items-center justify-center active:opacity-70"
          >
            <Text className="text-gray-400 text-lg">✕</Text>
          </Pressable>
        </View>

        <ScrollView className="px-5 py-4">
          <Text className="label mb-2 text-gray-300">Armar Gravação</Text>
          <Pressable
            onPress={() => onChange({ ...settings, armed: !settings.armed })}
            className={`flex-row items-center justify-between p-3 rounded-xl border mb-4 ${
              settings.armed
                ? 'bg-red-500/10 border-red-500/40'
                : 'bg-dark-surface border-dark-border'
            }`}
          >
            <Text className={`font-semibold ${settings.armed ? 'text-red-400' : 'text-gray-400'}`}>
              {settings.armed ? 'Armado — Pronto para gravar' : 'Desarmado'}
            </Text>
            <View className={`w-12 h-6 rounded-full p-0.5 ${settings.armed ? 'bg-red-500' : 'bg-dark-muted'}`}>
              <View className={`w-5 h-5 rounded-full bg-white shadow-sm ${settings.armed ? 'ml-6' : 'ml-0'}`} />
            </View>
          </Pressable>

          <Text className="label mb-2 text-gray-300">Fonte de Entrada</Text>
          <View className="flex-row gap-2 mb-4">
            {INPUT_SOURCES.map(src => (
              <Pressable
                key={src.id}
                onPress={() => onChange({ ...settings, inputSource: src.id })}
                className={`flex-1 p-3 rounded-xl border items-center gap-1 ${
                  settings.inputSource === src.id
                    ? 'bg-brand-accent/10 border-brand-accent'
                    : 'bg-dark-surface border-dark-border'
                }`}
              >
                <Text className="text-lg">{src.icon}</Text>
                <Text
                  className={`text-xs font-medium text-center ${
                    settings.inputSource === src.id ? 'text-brand-accent' : 'text-gray-400'
                  }`}
                >
                  {src.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="label mb-2 text-gray-300">Qualidade</Text>
          <View className="flex-row gap-2 mb-4">
            {(['low', 'medium', 'high', 'lossless'] as const).map(q => (
              <Pressable
                key={q}
                onPress={() => onChange({ ...settings, quality: q })}
                className={`flex-1 p-2.5 rounded-xl border items-center gap-0.5 ${
                  settings.quality === q
                    ? 'bg-brand-primary/10 border-brand-primary'
                    : 'bg-dark-surface border-dark-border'
                }`}
              >
                <Text className={`text-sm ${settings.quality === q ? 'text-brand-primary' : 'text-gray-500'}`}>
                  {QUALITY_ICONS[q]}
                </Text>
                <Text
                  className={`text-[9px] font-medium text-center ${
                    settings.quality === q ? 'text-brand-primary' : 'text-gray-500'
                  }`}
                >
                  {QUALITY_LABELS[q].split(' ')[0]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="label mb-2 text-gray-300">Taxa de Amostragem</Text>
          <View className="flex-row gap-2 mb-4">
            {SAMPLE_RATES.map(sr => (
              <Pressable
                key={sr}
                onPress={() => onChange({ ...settings, sampleRate: sr as RecordSettings['sampleRate'] })}
                className={`flex-1 p-3 rounded-xl border items-center ${
                  settings.sampleRate === sr
                    ? 'bg-brand-accent/10 border-brand-accent'
                    : 'bg-dark-surface border-dark-border'
                }`}
              >
                <Text
                  className={`font-mono text-xs ${
                    settings.sampleRate === sr ? 'text-brand-accent' : 'text-gray-400'
                  }`}
                >
                  {sr / 1000}kHz
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="label mb-2 text-gray-300">Canais</Text>
          <View className="flex-row gap-2 mb-4">
            {[
              { id: false as const, label: 'Estéreo', icon: '◉◉' },
              { id: true as const, label: 'Mono', icon: '◉' },
            ].map(ch => (
              <Pressable
                key={ch.label}
                onPress={() => onChange({ ...settings, mono: ch.id })}
                className={`flex-1 p-3 rounded-xl border items-center gap-1 ${
                  settings.mono === ch.id
                    ? 'bg-brand-accent/10 border-brand-accent'
                    : 'bg-dark-surface border-dark-border'
                }`}
              >
                <Text
                  className={`text-sm ${settings.mono === ch.id ? 'text-brand-accent' : 'text-gray-500'}`}
                >
                  {ch.icon}
                </Text>
                <Text
                  className={`text-xs font-medium ${
                    settings.mono === ch.id ? 'text-brand-accent' : 'text-gray-400'
                  }`}
                >
                  {ch.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="label mb-2 text-gray-300">Pré-Roll (segundos)</Text>
          <View className="flex-row gap-2 mb-6">
            {[0, 1, 2, 5].map(n => (
              <Pressable
                key={n}
                onPress={() => onChange({ ...settings, preRoll: n })}
                className={`flex-1 p-3 rounded-xl border items-center ${
                  settings.preRoll === n
                    ? 'bg-dark-muted border-gray-500'
                    : 'bg-dark-surface border-dark-border'
                }`}
              >
                <Text
                  className={`font-mono text-sm ${
                    settings.preRoll === n ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {n}s
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
