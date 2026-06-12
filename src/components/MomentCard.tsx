import { useState, useCallback } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Avatar, Badge, ProgressBar } from '.';
import { MiniMastering } from './MiniMastering';
import { DEMO_AUDIO_URL } from '../lib/constants';

export interface MomentData {
  id: string;
  artistName: string;
  artistHandle: string;
  avatar: string;
  imageUrl?: string;
  caption: string;
  songTitle: string;
  songDuration: number;
  likes: number;
  comments: number;
  userLiked: boolean;
  timeAgo: string;
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

interface MomentCardProps {
  moment: MomentData;
}

export function MomentCard({ moment }: MomentCardProps) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterPreset, setMasterPreset] = useState(0);
  const [liked, setLiked] = useState(moment.userLiked);
  const [likeCount, setLikeCount] = useState(moment.likes);
  const [eqValues, setEqValues] = useState<Record<string, number>>({
    bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0,
  });

  const handlePlay = useCallback(() => {
    if (isPlaying && player.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.replace(DEMO_AUDIO_URL);
      player.play();
      setIsPlaying(true);
    }
  }, [isPlaying, player]);

  const handleLike = useCallback(() => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  }, [liked]);

  const handleEqChange = useCallback((band: string, value: number) => {
    setEqValues(prev => ({ ...prev, [band]: value }));
  }, []);

  const progress = status.duration ? (status.currentTime / status.duration) * 100 : 0;

  return (
    <View className="mb-4 bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
      <View className="p-4 pb-0">
        <View className="flex-row items-center gap-3 mb-3">
          <Avatar name={moment.artistName} size="md" />
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-white font-bold text-sm">{moment.artistName}</Text>
              <View className="bg-brand-primary/20 px-1.5 py-0.5 rounded">
                <Text className="text-brand-primary text-[8px] font-bold">ARTISTA</Text>
              </View>
            </View>
            <Text className="text-gray-500 text-[11px]">{moment.artistHandle} · {moment.timeAgo}</Text>
          </View>
          <Pressable onPress={handleLike} className="items-center active:opacity-60">
            <Text className={`text-lg ${liked ? 'text-brand-primary' : 'text-gray-500'}`}>{liked ? '❤' : '♡'}</Text>
            <Text className={`text-[9px] font-semibold ${liked ? 'text-brand-primary' : 'text-gray-500'}`}>{formatCount(likeCount)}</Text>
          </Pressable>
        </View>

        <Text className="text-gray-200 text-sm leading-relaxed mb-3">{moment.caption}</Text>

        {moment.imageUrl && (
          <View className="rounded-xl overflow-hidden mb-3 h-48 bg-dark-elevated">
            <Image source={{ uri: moment.imageUrl }} className="w-full h-full" resizeMode="cover" />
          </View>
        )}
      </View>

      <View className="mx-4 mb-3 rounded-xl bg-dark-elevated border border-dark-border overflow-hidden">
        <View className="p-3 gap-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1">
              <View className="w-8 h-8 rounded-lg bg-brand-accent/20 items-center justify-center">
                <Text className="text-brand-accent text-sm">♫</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white text-xs font-semibold">{moment.songTitle}</Text>
                <Text className="text-gray-500 text-[9px]">{moment.artistName} · {Math.floor(moment.songDuration / 60)}:{String(moment.songDuration % 60).padStart(2, '0')}</Text>
              </View>
            </View>
            <Pressable onPress={handlePlay}
              className={`w-9 h-9 rounded-full items-center justify-center ${isPlaying ? 'bg-green-600' : 'bg-brand-primary'}`}>
              <Text className="text-white text-sm">{isPlaying ? '⏸' : '▶'}</Text>
            </Pressable>
          </View>

          {isPlaying && (
            <ProgressBar progress={progress} />
          )}

          <MiniMastering
            onPresetChange={setMasterPreset}
            activePreset={masterPreset}
            eqValues={eqValues}
            onEqChange={handleEqChange}
            compact
          />
        </View>
      </View>

      <View className="px-4 pb-3 flex-row items-center gap-4">
        <View className="flex-row items-center gap-1">
          <Text className="text-gray-500 text-xs">💬</Text>
          <Text className="text-gray-500 text-[11px] font-medium">{formatCount(moment.comments)}</Text>
        </View>
        <Pressable onPress={handleLike} className="flex-row items-center gap-1 active:opacity-60">
          <Text className={`text-xs ${liked ? 'text-brand-primary' : 'text-gray-500'}`}>{liked ? '❤' : '♡'}</Text>
          <Text className={`text-[11px] font-medium ${liked ? 'text-brand-primary' : 'text-gray-500'}`}>Curtir</Text>
        </Pressable>
        <View className="flex-row items-center gap-1">
          <Text className="text-gray-500 text-xs">↗</Text>
          <Text className="text-gray-500 text-[11px] font-medium">Compartilhar</Text>
        </View>
      </View>
    </View>
  );
}
