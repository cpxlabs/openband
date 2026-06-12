import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';

interface GroupDef {
  id: string;
  name: string;
  color: string;
  volume: number;
  muted: boolean;
  trackIds: string[];
}

interface TrackGroupProps {
  groups: GroupDef[];
  tracks: { id: string; name: string; color: string }[];
  onCreateGroup: (name: string, trackIds: string[]) => void;
  onRemoveGroup: (groupId: string) => void;
  onGroupVolume: (groupId: string, vol: number) => void;
  onGroupMute: (groupId: string) => void;
  onAssignTrack: (trackId: string, groupId: string | null) => void;
  trackAssignments: Record<string, string | null>;
}

const GROUP_COLORS = ['#ff6482', '#5ac8fa', '#ffcc00', '#34c759', '#bf5af2', '#ff9f0a', '#00d4aa'];

export function TrackGroupManager({
  groups,
  tracks,
  onCreateGroup,
  onRemoveGroup,
  onGroupVolume,
  onGroupMute,
  onAssignTrack,
  trackAssignments,
}: TrackGroupProps) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <View className="px-4 py-3">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="label text-gray-300 uppercase">Grupos</Text>
        <Pressable
          onPress={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 rounded-lg bg-dark-surface border border-dark-border active:opacity-70"
        >
          <Text className="text-brand-accent text-xs font-bold">{showCreate ? '−' : '+ Grupo'}</Text>
        </Pressable>
      </View>

      {groups.length === 0 && !showCreate && (
        <View className="py-6 items-center">
          <Text className="text-gray-600 text-xs">Nenhum grupo criado</Text>
          <Text className="text-gray-700 text-[9px] mt-1">Agrupe tracks para controle em bus</Text>
        </View>
      )}

      {showCreate && (
        <View className="bg-dark-surface rounded-xl border border-dark-border p-3 mb-3">
          <Text className="text-gray-300 text-xs font-semibold mb-2">Criar Grupo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <View className="flex-row gap-1.5">
              {tracks.map(t => {
                const assigned = trackAssignments[t.id];
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => onAssignTrack(t.id, assigned ? null : `new-${groups.length}`)}
                    className={`px-2.5 py-2 rounded-lg border ${assigned ? 'bg-brand-accent/10 border-brand-accent' : 'bg-dark-elevated border-dark-border'}`}
                  >
                    <View className={`w-2 h-2 rounded-full mb-1 ${t.color}`} />
                    <Text className={`text-[9px] ${assigned ? 'text-brand-accent' : 'text-gray-400'}`}>{t.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Pressable
            onPress={() => {
              const selected = Object.entries(trackAssignments).filter(([, g]) => g && g.startsWith('new')).map(([tId]) => tId);
              if (selected.length === 0) return;
              onCreateGroup(`Grupo ${groups.length + 1}`, selected);
              setShowCreate(false);
            }}
            className="py-2.5 rounded-xl bg-brand-primary items-center active:opacity-80"
          >
            <Text className="text-white text-xs font-bold">Criar Grupo</Text>
          </Pressable>
        </View>
      )}

      {groups.map((g, gi) => (
        <View
          key={g.id}
          className="flex-row items-center gap-3 bg-dark-surface rounded-xl border border-dark-border p-3 mb-2"
        >
          <View className="w-2 h-10 rounded-full" style={{ backgroundColor: GROUP_COLORS[gi % GROUP_COLORS.length] }} />
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-white text-sm font-bold">{g.name}</Text>
              <Pressable
                onPress={() => onGroupMute(g.id)}
                className={`px-2 py-0.5 rounded-md border ${g.muted ? 'bg-amber-500/20 border-amber-500/50' : 'border-dark-border'}`}
              >
                <Text className={`text-[9px] font-bold ${g.muted ? 'text-amber-400' : 'text-gray-500'}`}>M</Text>
              </Pressable>
            </View>
            <View className="flex-row gap-1 mt-1.5">
              {g.trackIds.map(tId => {
                const t = tracks.find(tr => tr.id === tId);
                return t ? (
                  <View key={tId} className={`w-1.5 h-1.5 rounded-full ${t.color}`} />
                ) : null;
              })}
            </View>
            <View className="flex-row items-center gap-2 mt-1.5">
              <View className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
                <View className="h-full rounded-full" style={{ width: `${g.volume}%`, backgroundColor: GROUP_COLORS[gi % GROUP_COLORS.length] }} />
              </View>
              <Pressable
                onPress={() => onGroupVolume(g.id, Math.max(0, g.volume - 5))}
                className="w-5 h-5 rounded bg-dark-elevated items-center justify-center active:opacity-70"
              >
                <Text className="text-gray-400 text-[9px]">−</Text>
              </Pressable>
              <Text className="text-gray-500 font-mono text-[9px] w-7 text-right">{g.volume}%</Text>
              <Pressable
                onPress={() => onGroupVolume(g.id, Math.min(100, g.volume + 5))}
                className="w-5 h-5 rounded bg-dark-elevated items-center justify-center active:opacity-70"
              >
                <Text className="text-gray-400 text-[9px]">+</Text>
              </Pressable>
              <Pressable
                onPress={() => onRemoveGroup(g.id)}
                className="w-5 h-5 rounded items-center justify-center active:opacity-70"
              >
                <Text className="text-gray-600 text-[9px]">✕</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function getGroupVolume(groups: { id: string; volume: number; muted: boolean; trackIds: string[] }[], trackId: string): { volume: number; muted: boolean } | null {
  const group = groups.find(g => g.trackIds.includes(trackId));
  if (!group) return null;
  return { volume: group.volume, muted: group.muted };
}
