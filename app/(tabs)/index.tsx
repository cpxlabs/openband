import { useState, useCallback, useRef } from 'react';
import { FlatList, View, Text } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Card, Badge, ProgressBar, PageHeader } from '../../src/components';

const DEMO_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

const MOCK_POSTS = [
  { id: '1', title: 'Solo de Guitarra Pesado', author: '@joaomusico99', plays: 234 },
  { id: '2', title: 'Beat Lo-fi Chill 2026', author: '@sintetizadorvirtual', plays: 189 },
  { id: '3', title: 'Bateria Eletrônica', author: '@drummerbr', plays: 567 },
  { id: '4', title: 'Baixo Synthwave', author: '@synthwavebr', plays: 92 },
];

function formatPlays(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function Feed() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const currentPostRef = useRef(MOCK_POSTS[0]);

  const handlePlay = useCallback((post: typeof MOCK_POSTS[0]) => {
    if (playingId === post.id && player.playing) {
      player.pause();
      setPlayingId(null);
      return;
    }
    currentPostRef.current = post;
    player.replace(DEMO_AUDIO_URL);
    player.play();
    setPlayingId(post.id);
  }, [playingId, player]);

  return (
    <View className="flex-1 bg-dark-bg pt-12">
      <PageHeader title="Feed" subtitle="Descubra novos sons" />

      {playingId && (
        <View className="flex-row items-center gap-2 px-4 py-2 bg-brand-primary/10 border-b border-brand-primary/20">
          <View className="w-2 h-2 rounded-full bg-green-500" />
          <Text className="text-green-400 text-xs font-medium flex-1">
            Tocando: {currentPostRef.current.title}
          </Text>
        </View>
      )}

      <FlatList
        data={MOCK_POSTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => {
          const isThisPlaying = playingId === item.id && player.playing;
          const progress = status.duration ? (status.currentTime / status.duration) * 100 : 0;

          return (
            <Card
              onPress={() => handlePlay(item)}
              activeBorder={isThisPlaying}
              className="mx-4 mb-3"
            >
              <View className="p-5">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-4">
                    <Text className="text-white font-bold text-lg leading-tight">{item.title}</Text>
                    <Text className="text-gray-400 text-sm mt-1">{item.author}</Text>
                  </View>
                  <Badge text={formatPlays(item.plays)} icon="▶" variant="play" />
                </View>

                <View className="mt-4">
                  <View
                    className={`h-12 rounded-xl items-center justify-center flex-row gap-2 ${
                      isThisPlaying ? 'bg-green-600' : 'btn-secondary'
                    }`}
                  >
                    <Text className={`text-base ${isThisPlaying ? 'text-white' : 'text-brand-primary'}`}>
                      {isThisPlaying ? '⏸' : '▶'}
                    </Text>
                    <Text className={`font-bold text-sm ${isThisPlaying ? 'text-white' : 'text-brand-primary'}`}>
                      {isThisPlaying ? 'Pausar' : 'Ouvir'}
                    </Text>
                  </View>
                </View>
              </View>

              {isThisPlaying && <ProgressBar progress={progress} />}
            </Card>
          );
        }}
      />
    </View>
  );
}
