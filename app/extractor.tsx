import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { PageHeader, Card, Button, Badge, ProgressBar, Loading } from '../src/components';

const DEMO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

type StemType = 'drums' | 'bass' | 'vocals' | 'other';

interface StemResult {
  type: StemType;
  label: string;
  icon: string;
  color: string;
  url: string;
  duration: number;
}

const STEM_META: Record<StemType, { label: string; icon: string; color: string }> = {
  drums:   { label: 'Bateria',    icon: '🥁', color: 'bg-green-600' },
  bass:    { label: 'Baixo',      icon: '🎸', color: 'bg-blue-600' },
  vocals:  { label: 'Vocal',      icon: '🎤', color: 'bg-purple-600' },
  other:   { label: 'Outros',     icon: '🎹', color: 'bg-amber-600' },
};

const PRESET_TRACKS = [
  { id: 'demo1', title: 'Rock Alternativo', artist: 'Banda Exemplo' },
  { id: 'demo2', title: 'Lo-fi Study Beat', artist: 'Produtor Anônimo' },
];

type Phase = 'select' | 'processing' | 'done';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function StemPlayer({ stem, onAddToProject }: { stem: StemResult; onAddToProject: () => void }) {
  const player = useAudioPlayer(stem.url);
  const status = useAudioPlayerStatus(player);
  const meta = STEM_META[stem.type];

  return (
    <Card className="mb-3">
      <View className="p-4 flex-row items-center gap-4">
        <View className={`w-14 h-14 rounded-2xl ${meta.color} items-center justify-center shadow-lg`}>
          <Text className="text-2xl">{meta.icon}</Text>
        </View>

        <View className="flex-1 gap-1">
          <Text className="text-white font-bold text-base">{meta.label}</Text>
          <View className="flex-row items-center gap-2">
            <Badge text={formatTime(stem.duration)} variant="play" />
            <Badge text="Stem" />
          </View>

          <View className="mt-1 h-1 bg-dark-border rounded-full overflow-hidden">
            <View
              className="h-full bg-white/60 rounded-full"
              style={{ width: status.duration ? `${(status.currentTime / status.duration) * 100}%` : '0%' }}
            />
          </View>
        </View>

        <View className="gap-2">
          <Pressable
            onPress={() => (status.playing ? player.pause() : player.play())}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              status.playing ? 'bg-green-600' : 'bg-dark-muted border border-dark-border'
            }`}
          >
            <Text className="text-white text-base">{status.playing ? '⏸' : '▶'}</Text>
          </Pressable>
          <Pressable
            onPress={onAddToProject}
            className="w-10 h-10 rounded-xl bg-brand-accent/20 items-center justify-center active:opacity-70"
          >
            <Text className="text-brand-accent text-base">+</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

export default function Extractor() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('select');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [results, setResults] = useState<StemResult[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const statusMessages = [
    'Analisando espectro de frequências...',
    'Separando bateria...',
    'Extraindo linha de baixo...',
    'Isolando vocais...',
    'Separando instrumentos restantes...',
    'Renderizando stems...',
    'Finalizando...',
  ];

  const startProcessing = useCallback(() => {
    setPhase('processing');
    setProgress(0);
    let step = 0;

    timerRef.current = setInterval(() => {
      step += 1;
      const pct = Math.min(100, (step / statusMessages.length) * 100);
      setProgress(pct);
      setStatusText(statusMessages[Math.min(step - 1, statusMessages.length - 1)]);

      if (pct >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);

        const stems: StemResult[] = [
          { type: 'drums',  label: 'Bateria', icon: '🥁', color: 'bg-green-600',  url: DEMO_URL, duration: 30 },
          { type: 'bass',   label: 'Baixo',   icon: '🎸', color: 'bg-blue-600',   url: DEMO_URL, duration: 28 },
          { type: 'vocals', label: 'Vocal',   icon: '🎤', color: 'bg-purple-600', url: DEMO_URL, duration: 25 },
          { type: 'other',  label: 'Outros',  icon: '🎹', color: 'bg-amber-600',  url: DEMO_URL, duration: 32 },
        ];
        setResults(stems);
        setPhase('done');
      }
    }, 600);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSelectPreset = useCallback((id: string) => {
    setSelectedTrack(id);
  }, []);

  const handleAddToProject = useCallback((stem: StemResult) => {
    router.push(`/studio/new?stem=${stem.type}`);
  }, [router]);

  const handleReset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('select');
    setProgress(0);
    setSelectedTrack(null);
    setResults([]);
    setStatusText('');
  }, []);

  return (
    <View className="flex-1 bg-dark-bg pt-12">
      <View className="px-4 flex-row items-center justify-between mb-2">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60">
          <Text className="text-gray-400 text-lg">← Voltar</Text>
        </Pressable>
        {phase === 'done' && (
          <Pressable onPress={handleReset} className="p-2 active:opacity-60">
            <Text className="text-brand-accent text-sm font-medium">Nova extração</Text>
          </Pressable>
        )}
      </View>

      <PageHeader
        title="Separar Stems"
        subtitle="Extraia faixas individuais de qualquer áudio"
      />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {phase === 'select' && (
          <View>
            <View className="card-elevated p-8 mb-6 items-center border-dashed border-2 border-dark-border active:border-brand-accent">
              <View className="w-16 h-16 rounded-2xl bg-brand-primary/10 items-center justify-center mb-4">
                <Text className="text-3xl">📁</Text>
              </View>
              <Text className="text-white font-semibold text-lg mb-1">Selecionar arquivo de áudio</Text>
              <Text className="text-gray-500 text-sm text-center mb-4 max-w-xs">
                MP3, WAV, FLAC ou M4A
              </Text>
              <Button
                title="Escolher arquivo"
                variant="secondary"
                icon="📂"
                onPress={() => {
                  handleSelectPreset('custom');
                  startProcessing();
                }}
              />
            </View>

            <View className="flex-row items-center gap-3 mb-4">
              <View className="flex-1 h-px bg-dark-border" />
              <Text className="text-gray-600 text-xs font-medium">ou use uma faixa de demonstração</Text>
              <View className="flex-1 h-px bg-dark-border" />
            </View>

            {PRESET_TRACKS.map((track) => (
              <Pressable
                key={track.id}
                onPress={() => {
                  handleSelectPreset(track.id);
                  startProcessing();
                }}
                className="card p-4 mb-3 active:border-brand-accent/50 flex-row items-center gap-4"
              >
                <View className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 items-center justify-center">
                  <Text className="text-xl">♫</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold">{track.title}</Text>
                  <Text className="text-gray-500 text-sm">{track.artist}</Text>
                </View>
                <Text className="text-gray-400">→</Text>
              </Pressable>
            ))}
          </View>
        )}

        {phase === 'processing' && (
          <View className="items-center py-16 px-4">
            <View className="w-24 h-24 rounded-3xl bg-brand-primary/10 items-center justify-center mb-8">
              <Text className="text-5xl">🔊</Text>
            </View>

            <View className="flex-row gap-1.5 mb-8">
              {Array.from({ length: 7 }, (_, i) => (
                <View
                  key={i}
                  className="w-2 bg-brand-primary/60 rounded-full"
                  style={{
                    height: 16 + Math.sin(Date.now() * 0.01 + i * 1.2) * 10,
                    opacity: progress > i * 15 ? 1 : 0.2,
                  }}
                />
              ))}
            </View>

            <Text className="text-white font-medium text-lg mb-1">{statusText}</Text>
            <Text className="text-gray-500 text-sm mb-6">{Math.round(progress)}%</Text>

            <View className="w-full max-w-xs">
              <ProgressBar progress={progress} />
            </View>

            <View className="mt-8 flex-row gap-3 flex-wrap justify-center">
              {(['drums', 'bass', 'vocals', 'other'] as const).map((type) => {
                const meta = STEM_META[type];
                return (
                  <View key={type} className="items-center gap-1 opacity-60">
                    <View className={`w-12 h-12 rounded-xl ${meta.color} items-center justify-center`}>
                      <Text className="text-lg">{meta.icon}</Text>
                    </View>
                    <Text className="text-gray-500 text-xs">{meta.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {phase === 'done' && (
          <View>
            <View className="card-elevated p-4 mb-6 flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-green-600/20 items-center justify-center">
                <Text className="text-green-400 text-lg">✓</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">Extração concluída</Text>
                <Text className="text-gray-500 text-xs">
                  {results.length} stems gerados a partir de {selectedTrack === 'custom' ? 'arquivo selecionado' : 'faixa de demonstração'}
                </Text>
              </View>
            </View>

            {results.map((stem) => (
              <StemPlayer
                key={stem.type}
                stem={stem}
                onAddToProject={() => handleAddToProject(stem)}
              />
            ))}

            <View className="mt-4 gap-3">
              <Button
                title="Adicionar todos ao estúdio"
                icon="+"
                onPress={() => router.push('/studio/new')}
              />
              <Button
                title="Exportar stems"
                variant="secondary"
                icon="📦"
                onPress={() => alert('Exportação iniciada (demo)')}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
