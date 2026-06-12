import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Tipagem básica para simular as tracks da DAW
interface Track {
  id: string;
  name: string;
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number; // 0 a 100
  regions: { id: string; start: number; duration: number }[];
}

export default function Studio() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [bpm] = useState(120);

  // Estado das tracks inspirado no modelo relacional do nosso banco de dados
  const [tracks, setTracks] = useState<Track[]>([
    { id: '1', name: 'Voz Principal', color: 'bg-red-500', muted: false, solo: false, volume: 80, regions: [{ id: 'r1', start: 10, duration: 150 }] },
    { id: '2', name: 'Guitarra Base', color: 'bg-blue-500', muted: false, solo: false, volume: 70, regions: [{ id: 'r2', start: 0, duration: 200 }] },
    { id: '3', name: 'Bateria Loop', color: 'bg-green-500', muted: true, solo: false, volume: 90, regions: [{ id: 'r3', start: 0, duration: 100 }, { id: 'r4', start: 100, duration: 100 }] },
  ]);

  const toggleMute = (trackId: string) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t));
  };

  const toggleSolo = (trackId: string) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, solo: !t.solo } : t));
  };

  return (
    <View className="flex-1 bg-dark-bg select-none">

      {/* 1. TOP BAR / CONTROLES GLOBAIS (Estilo Logic Pro / GarageBand) */}
      <View className="h-14 bg-dark-surface border-b border-dark-border flex-row items-center justify-between px-4">
        <Pressable onPress={() => router.back()} className="p-2 bg-dark-border rounded">
          <Text className="text-gray-400 font-bold">← Sair</Text>
        </Pressable>

        {/* Controles de Transporte (Play, Pause, Rec) */}
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={() => setIsPlaying(!isPlaying)}
            className={`w-10 h-10 rounded-full items-center justify-center ${isPlaying ? 'bg-green-500' : 'bg-dark-border'}`}
          >
            <Text className="text-white font-bold">{isPlaying ? '⏸' : '▶'}</Text>
          </Pressable>

          <Pressable
            onPress={() => setIsRecording(!isRecording)}
            className={`w-10 h-10 rounded-full items-center justify-center ${isRecording ? 'bg-red-600' : 'bg-dark-border'}`}
          >
            <Text className="text-white font-bold">🔴</Text>
          </Pressable>
        </View>

        {/* Display Digital de BPM e Tempo */}
        <View className="bg-[#0b0b0d] px-4 py-1.5 rounded border border-dark-border items-center">
          <Text className="text-emerald-400 font-mono text-xs tracking-widest">TEMPO</Text>
          <Text className="text-white font-mono text-sm">{bpm} BPM | 4/4</Text>
        </View>

        <Pressable className="bg-brand-primary px-4 py-2 rounded-lg">
          <Text className="text-white font-bold text-xs">Salvar</Text>
        </Pressable>
      </View>

      {/* AREA PRINCIPAL: TIMELINE E TRACKS */}
      <View className="flex-1 flex-row">

        {/* 2. COLUNA DA ESQUERDA: CONTROLES DE CADA TRACK (Header de Canal) */}
        <View className="w-36 bg-[#131316] border-r border-dark-border">
          {/* Cabeçalho vazio para alinhar com a régua de tempo */}
          <View className="h-8 bg-dark-surface border-b border-dark-border justify-center px-2">
            <Text className="text-gray-500 text-xs font-bold">TRACKS</Text>
          </View>

          {tracks.map((track) => (
            <View key={track.id} className="h-20 p-2 border-b border-dark-border justify-between bg-dark-surface/50">
              <Text className="text-gray-200 text-xs font-semibold truncate">{track.name}</Text>

              {/* Botões Mute (M) e Solo (S) estilo Ableton/ProTools */}
              <View className="flex-row gap-1 mt-1">
                <Pressable
                  onPress={() => toggleMute(track.id)}
                  className={`w-6 h-6 rounded items-center justify-center border border-dark-border ${track.muted ? 'bg-amber-500' : 'bg-[#222]'}`}
                >
                  <Text className="text-white text-xs font-bold">M</Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleSolo(track.id)}
                  className={`w-6 h-6 rounded items-center justify-center border border-dark-border ${track.solo ? 'bg-green-500' : 'bg-[#222]'}`}
                >
                  <Text className="text-white text-xs font-bold">S</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* 3. ÁREA DA DIREITA: RÉGUA DE TEMPO E BLOCOS DE ÁUDIO (TIMELINE GRID) */}
        <ScrollView horizontal className="flex-1 bg-[#0b0b0d]">
          <View style={{ width: 1200 }}>

            {/* Régua de Compassos (Timeline Ruler) */}
            <View className="h-8 bg-dark-surface border-b border-dark-border flex-row items-center px-2">
              {[...Array(12)].map((_, i) => (
                <Text key={i} style={{ width: 100 }} className="text-gray-600 font-mono text-[10px]">
                  00:{String(i * 5).padStart(2, '0')}
                </Text>
              ))}
            </View>

            {/* Linhas das Tracks onde os Stems/Áudios vão morar */}
            {tracks.map((track) => (
              <View key={track.id} className="h-20 border-b border-dark-border/40 relative justify-center bg-dark-bg/20">

                {/* Renderização das Regiões de Áudio (Waveform visual) */}
                {track.regions.map((region) => (
                  <View
                    key={region.id}
                    style={{ left: region.start, width: region.duration, position: 'absolute' }}
                    className={`h-14 rounded-md border border-white/20 px-2 justify-center shadow-md ${track.color} ${track.muted ? 'opacity-30' : 'opacity-85'}`}
                  >
                    {/* Linha fake simulando a onda senoidal (Waveform) do áudio */}
                    <Text className="text-white/90 text-[10px] font-bold truncate">audio_clip.wav</Text>
                    <View className="w-full h-[2px] bg-white/40 absolute self-center" />
                  </View>
                ))}

              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 4. MIXER INFERIOR (Estilo Mesa de Som) */}
      <View className="h-32 bg-[#141417] border-t border-dark-border flex-row px-4 items-center gap-3">
        <View className="border-r border-dark-border pr-3 h-full justify-center">
          <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider">Mixer</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
          <View className="flex-row gap-4 py-2">
            {tracks.map((track) => (
              <View key={track.id} className="w-24 bg-dark-surface rounded-lg border border-dark-border p-2 items-center justify-between">
                <Text className="text-[10px] text-gray-400 font-medium truncate w-full text-center">{track.name}</Text>

                {/* Medidor de Volume Virtual (Fader Vertical) */}
                <View className="w-3 h-14 bg-[#111] rounded relative justify-end">
                  <View
                    style={{ height: `${track.volume}%` }}
                    className={`w-full rounded-b ${track.muted ? 'bg-gray-600' : 'bg-brand-accent'}`}
                  />
                </View>

                {/* Valor do Volume */}
                <Text className="text-[9px] font-mono text-gray-500">{track.muted ? 'MUTED' : `${track.volume}dB`}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

    </View>
  );
}
