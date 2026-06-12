import { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { DEMO_AUDIO_URL } from '../lib/constants';

interface SampleEntry {
  id: string;
  name: string;
  category: string;
  color: string;
  duration: number;
}

const SAMPLE_CATEGORIES = [
  { key: 'all', label: 'Todos', icon: '♫' },
  { key: 'drums', label: 'Bateria', icon: '🥁' },
  { key: 'bass', label: 'Baixo', icon: '🎸' },
  { key: 'synth', label: 'Sintetizador', icon: '🎹' },
  { key: 'melodic', label: 'Melódico', icon: '🎵' },
  { key: 'fx', label: 'Efeitos', icon: '✨' },
];

const SAMPLES: SampleEntry[] = [
  { id: 'kit_1', name: 'Kick 808 Profundo', category: 'drums', color: 'bg-red-500', duration: 2 },
  { id: 'kit_2', name: 'Snare Acústico', category: 'drums', color: 'bg-red-500', duration: 1.5 },
  { id: 'kit_3', name: 'Hi-Hat Fechado', category: 'drums', color: 'bg-red-500', duration: 0.5 },
  { id: 'kit_4', name: 'Hi-Hat Aberto', category: 'drums', color: 'bg-red-500', duration: 1 },
  { id: 'kit_5', name: 'Clap Eletrônico', category: 'drums', color: 'bg-red-500', duration: 1 },
  { id: 'kit_6', name: 'Rim Shot', category: 'drums', color: 'bg-red-500', duration: 0.8 },
  { id: 'bass_1', name: 'Sub Bass Puro', category: 'bass', color: 'bg-blue-500', duration: 4 },
  { id: 'bass_2', name: 'Baixo Elétrico', category: 'bass', color: 'bg-blue-500', duration: 4 },
  { id: 'bass_3', name: 'Synth Bass 303', category: 'bass', color: 'bg-blue-500', duration: 4 },
  { id: 'synth_1', name: 'Pad Ambiente', category: 'synth', color: 'bg-purple-600', duration: 8 },
  { id: 'synth_2', name: 'Lead Agudo', category: 'synth', color: 'bg-purple-600', duration: 4 },
  { id: 'synth_3', name: 'Arpejo Rápido', category: 'synth', color: 'bg-purple-600', duration: 4 },
  { id: 'synth_4', name: 'Brass Synth', category: 'synth', color: 'bg-purple-600', duration: 4 },
  { id: 'mel_1', name: 'Violão Dedilhado', category: 'melodic', color: 'bg-green-500', duration: 8 },
  { id: 'mel_2', name: 'Piano Melancólico', category: 'melodic', color: 'bg-green-500', duration: 8 },
  { id: 'mel_3', name: 'Guitarra Slide', category: 'melodic', color: 'bg-green-500', duration: 4 },
  { id: 'mel_4', name: 'Vocal Chop', category: 'melodic', color: 'bg-green-500', duration: 2 },
  { id: 'fx_1', name: 'Riser 4 bars', category: 'fx', color: 'bg-amber-500', duration: 8 },
  { id: 'fx_2', name: 'Impacto', category: 'fx', color: 'bg-amber-500', duration: 1 },
  { id: 'fx_3', name: 'Whoosh', category: 'fx', color: 'bg-amber-500', duration: 2 },
  { id: 'fx_4', name: 'Ruído Branco', category: 'fx', color: 'bg-amber-500', duration: 4 },
];

function SampleCard({ sample, onAddToTrack }: { sample: SampleEntry; onAddToTrack: (s: SampleEntry) => void }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const isThisPlaying = status.isLoaded && status.playing;

  return (
    <View className="bg-dark-surface rounded-xl border border-dark-border overflow-hidden">
      <View className="p-3 gap-2">
        <View className={`w-full h-12 rounded-lg ${sample.color}/20 items-center justify-center`}>
          <Text className="text-xl">{sample.color === 'bg-red-500' ? '🥁' : sample.color === 'bg-blue-500' ? '🎸' : sample.color === 'bg-purple-600' ? '🎹' : sample.color === 'bg-green-500' ? '🎵' : '✨'}</Text>
        </View>
        <Text className="text-white text-xs font-semibold truncate">{sample.name}</Text>
        <Text className="text-gray-600 text-[10px]">{sample.duration.toFixed(1)}s</Text>

        <View className="flex-row gap-1.5">
          <Pressable
            onPress={() => {
              if (isThisPlaying) { player.pause(); }
              else { player.replace(DEMO_AUDIO_URL); player.play(); }
            }}
            className={`flex-1 h-7 rounded-lg items-center justify-center ${isThisPlaying ? 'bg-green-600' : 'bg-dark-muted'}`}
          >
            <Text className="text-white text-[10px] font-bold">{isThisPlaying ? '⏸' : '▶'}</Text>
          </Pressable>
        </View>
      </View>
      <Pressable
        onPress={() => onAddToTrack(sample)}
        className="h-7 bg-brand-accent/20 items-center justify-center active:opacity-70 border-t border-dark-border"
      >
        <Text className="text-brand-accent text-[9px] font-bold">+ TRACK</Text>
      </Pressable>
    </View>
  );
}

interface SampleBrowserProps {
  visible: boolean;
  onAddSample: (sample: SampleEntry) => void;
}

export function SampleBrowser({ visible, onAddSample }: SampleBrowserProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = SAMPLES.filter(s => {
    if (category !== 'all' && s.category !== category) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <View className={`flex-1 ${visible ? '' : 'hidden'}`}>
      <View className="px-4 py-2">
        <View className="bg-dark-elevated rounded-xl border border-dark-border px-3 py-2">
          <TextInput
            placeholder="Buscar samples..."
            placeholderTextColor="#666"
            value={search}
            onChangeText={setSearch}
            className="text-white text-sm"
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-3" style={{ maxHeight: 36 }}>
        <View className="flex-row gap-2">
          {SAMPLE_CATEGORIES.map(cat => (
            <Pressable key={cat.key} onPress={() => setCategory(cat.key)}
              className={`px-3 py-1.5 rounded-full border ${category === cat.key ? 'bg-brand-primary/20 border-brand-primary' : 'bg-dark-elevated border-dark-border'}`}>
              <Text className={`text-xs font-semibold ${category === cat.key ? 'text-brand-primary' : 'text-white'}`}>{cat.icon} {cat.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 80 }}>
        <View className="flex-row flex-wrap gap-2">
          {filtered.map(sample => (
            <View key={sample.id} className="w-[calc(50%-4px)]" style={{ width: '48%' }}>
              <SampleCard sample={sample} onAddToTrack={onAddSample} />
            </View>
          ))}
          {filtered.length === 0 && (
            <View className="w-full py-8 items-center">
              <Text className="text-gray-600 text-sm">Nenhum sample encontrado</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
