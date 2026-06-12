import { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { DEMO_AUDIO_URL } from '../../src/lib/constants';

interface Track {
  id: string;
  name: string;
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number;
  regions: { id: string; start: number; duration: number }[];
}

function TimeDisplay({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return (
    <Text className="text-white font-mono text-base tracking-wider">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </Text>
  );
}

export default function Studio() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const [isRecording, setIsRecording] = useState(false);
  const [bpm] = useState(120);

  const [tracks, setTracks] = useState<Track[]>([
    { id: '1', name: 'Voz Principal', color: 'bg-red-500', muted: false, solo: false, volume: 80, regions: [{ id: 'r1', start: 10, duration: 150 }] },
    { id: '2', name: 'Guitarra Base', color: 'bg-blue-500', muted: false, solo: false, volume: 70, regions: [{ id: 'r2', start: 0, duration: 200 }] },
    { id: '3', name: 'Bateria Loop', color: 'bg-green-500', muted: true, solo: false, volume: 90, regions: [{ id: 'r3', start: 0, duration: 100 }, { id: 'r4', start: 100, duration: 100 }] },
  ]);

  const isPlaying = player.playing;
  const currentTime = status.currentTime || 0;
  const duration = status.duration || 240;

  const anySolo = useMemo(() => tracks.some(t => t.solo), [tracks]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      player.replace(DEMO_AUDIO_URL);
      player.play();
    }
  }, [isPlaying, player]);

  const toggleRecording = useCallback(() => {
    setIsRecording(prev => !prev);
  }, []);

  const toggleMute = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t));
  }, []);

  const toggleSolo = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, solo: !t.solo } : t));
  }, []);

  const setTrackVolume = useCallback((trackId: string, vol: number) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, volume: vol } : t));
  }, []);

  const trackVolume = (trackId: string) => {
    return tracks.find(t => t.id === trackId)?.volume ?? 70;
  };

  const isAudible = (track: Track) => {
    if (anySolo) return track.solo;
    return !track.muted;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View className="flex-1 bg-dark-bg select-none">

      <View className="h-14 bg-dark-surface border-b border-dark-border flex-row items-center justify-between px-4">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={togglePlay}
            className={`w-11 h-11 rounded-full items-center justify-center ${isPlaying ? 'bg-green-600' : 'bg-dark-border'}`}
          >
            <Text className="text-white text-lg">{isPlaying ? '⏸' : '▶'}</Text>
          </Pressable>

          <Pressable
            onPress={toggleRecording}
            className={`w-11 h-11 rounded-full items-center justify-center ${isRecording ? 'bg-red-600' : 'bg-dark-border'}`}
          >
            <View className={`w-4 h-4 rounded-sm ${isRecording ? 'bg-white' : 'bg-red-500'}`} />
          </Pressable>
        </View>

        <View className="bg-[#0b0b0d] px-3 py-1.5 rounded-lg border border-dark-border items-center">
          <Text className="text-emerald-400 font-mono text-[10px] tracking-widest">BPM</Text>
          <Text className="text-white font-mono text-sm">{bpm}</Text>
        </View>

        <View className="flex-row items-center gap-2">
          <TimeDisplay seconds={currentTime} />
          <Text className="text-gray-600">/</Text>
          <TimeDisplay seconds={duration} />
        </View>

        <Pressable className="bg-brand-primary px-5 py-2 rounded-xl active:opacity-80">
          <Text className="text-white font-bold text-sm">Salvar</Text>
        </Pressable>
      </View>

      <View className="h-10 bg-dark-surface/50 border-b border-dark-border flex-row items-center px-4">
        <View className="w-36 pr-2">
          <Text className="text-gray-500 text-[10px] font-bold tracking-wider">TRACKS</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
          <View className="flex-row items-center" style={{ width: 1200 }}>
            {Array.from({ length: 25 }, (_, i) => (
              <View key={i} className="flex-row" style={{ width: 48 }}>
                <Text className="text-gray-600 font-mono text-[10px]">
                  {String(Math.floor(i * 2 / 60)).padStart(2, '0')}:{String((i * 2) % 60).padStart(2, '0')}
                </Text>
                {i % 4 === 0 && <View className="w-px h-3 bg-gray-700 absolute right-0" />}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View className="flex-1 flex-row">
        <View className="w-36 bg-[#131316] border-r border-dark-border">
          {tracks.map((track) => (
            <View key={track.id} className="h-20 p-2 border-b border-dark-border justify-between bg-dark-surface/30">
              <Text className="text-gray-200 text-xs font-semibold truncate">{track.name}</Text>
              <View className="flex-row gap-1.5 mt-1">
                <Pressable
                  onPress={() => toggleMute(track.id)}
                  className={`w-7 h-7 rounded items-center justify-center border ${
                    track.muted ? 'bg-amber-500 border-amber-400' : 'bg-[#222] border-dark-border'
                  }`}
                >
                  <Text className={`text-xs font-bold ${track.muted ? 'text-white' : 'text-gray-400'}`}>M</Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleSolo(track.id)}
                  className={`w-7 h-7 rounded items-center justify-center border ${
                    track.solo ? 'bg-green-500 border-green-400' : 'bg-[#222] border-dark-border'
                  }`}
                >
                  <Text className={`text-xs font-bold ${track.solo ? 'text-white' : 'text-gray-400'}`}>S</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <ScrollView horizontal className="flex-1 bg-[#0b0b0d]">
          <View style={{ width: 1200 }}>
            <View className="relative" style={{ height: tracks.length * 80 }}>
              {tracks.map((track) => (
                <View key={track.id} className="absolute w-full" style={{ height: 80, top: tracks.indexOf(track) * 80 }}>
                  <View className="h-20 border-b border-dark-border/30 relative justify-center bg-dark-bg/10">
                    {track.regions.map((region) => (
                      <View
                        key={region.id}
                        style={{ left: region.start * 2.4, width: region.duration * 2.4, position: 'absolute' }}
                        className={`h-14 rounded-lg border border-white/10 px-3 justify-center shadow-sm ${
                          track.color
                        } ${isAudible(track) ? 'opacity-90' : 'opacity-25'}`}
                      >
                        <Text className="text-white/90 text-[10px] font-bold truncate">audio_clip.wav</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              {isPlaying && (
                <View
                  className="absolute top-0 bottom-0 w-0.5 bg-brand-primary z-10 shadow-sm shadow-brand-primary/50"
                  style={{ left: currentTime * 2.4, height: tracks.length * 80 }}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </View>

      <View className="h-28 bg-[#141417] border-t border-dark-border">
        <View className="flex-row items-center gap-3 px-4 py-2 border-b border-dark-border/50">
          <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Mixer</Text>
          <View className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
            <View
              className="h-full bg-brand-primary rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </View>
          {isPlaying && (
            <View className="flex-row gap-0.5">
              {Array.from({ length: 4 }, (_, i) => (
                <View
                  key={i}
                  className="w-1 bg-green-500/60 rounded-full"
                  style={{
                    height: 8 + Math.sin(currentTime * 4 + i * 1.5) * 6,
                    opacity: 0.4 + Math.sin(currentTime * 3 + i) * 0.3,
                  }}
                />
              ))}
            </View>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1 px-4">
          <View className="flex-row gap-4 py-2">
            {tracks.map((track) => (
              <View key={track.id} className="w-24 bg-dark-surface rounded-xl border border-dark-border p-2.5 items-center gap-2">
                <Text className="text-[10px] text-gray-400 font-medium truncate w-full text-center">{track.name}</Text>

                <Pressable
                  onPress={() => {
                    const current = trackVolume(track.id);
                    const next = Math.min(100, Math.max(0, current - 10));
                    setTrackVolume(track.id, next);
                  }}
                  className="w-4 flex-1 bg-[#111] rounded-full relative justify-end overflow-hidden active:opacity-80"
                >
                  <View
                    style={{ height: `${track.volume}%` }}
                    className={`w-full rounded-full ${isAudible(track) ? 'bg-brand-accent' : 'bg-gray-600'}`}
                  />
                </Pressable>

                <View className="flex-row items-center gap-1">
                  <Pressable
                    onPress={() => {
                      const current = trackVolume(track.id);
                      setTrackVolume(track.id, Math.max(0, current - 5));
                    }}
                    className="w-5 h-5 rounded bg-[#222] items-center justify-center active:opacity-70"
                  >
                    <Text className="text-gray-400 text-xs">−</Text>
                  </Pressable>
                  <Text className="text-[9px] font-mono text-gray-500 w-8 text-center">
                    {track.muted ? 'MUT' : `${track.volume}%`}
                  </Text>
                  <Pressable
                    onPress={() => {
                      const current = trackVolume(track.id);
                      setTrackVolume(track.id, Math.min(100, current + 5));
                    }}
                    className="w-5 h-5 rounded bg-[#222] items-center justify-center active:opacity-70"
                  >
                    <Text className="text-gray-400 text-xs">+</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
