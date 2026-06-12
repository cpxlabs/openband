import { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { DEMO_AUDIO_URL } from '../../src/lib/constants';
import {
  Metronome,
  RecordOptions,
  PluginRack,
  MasterRack,
  PluginEditor,
  MixManager,
  WaveformClip,
  AutomationLane,
  TrackGroupManager,
  LufsMeter,
} from '../../src/components';
import { useHistory } from '../../src/lib/history';
import { getGroupVolume } from '../../src/components/TrackGroup';
import type { Plugin, MixSnapshot, MetronomeSettings, RecordSettings } from '../../src/lib/types';
import { MASTERING_CHAIN_PRESETS, buildMasteringChain } from '../../src/lib/mastering';
import type { AutomationPoint } from '../../src/components/AutomationLane';

interface Track {
  id: string;
  name: string;
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number;
  regions: { id: string; start: number; duration: number }[];
  plugins: Plugin[];
  automation: Record<string, AutomationPoint[]>;
}

interface GroupDef {
  id: string;
  name: string;
  color: string;
  volume: number;
  muted: boolean;
  trackIds: string[];
}

type BottomTab = 'mixer' | 'fx' | 'mastering' | 'groups' | 'mixes';

function TimeDisplay({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return (
    <Text className="text-white font-mono text-base tracking-wider">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </Text>
  );
}

const GROUP_COLORS = ['#ff6482', '#5ac8fa', '#ffcc00', '#34c759', '#bf5af2', '#ff9f0a', '#00d4aa'];

const INITIAL_TRACKS: Track[] = [
  {
    id: '1', name: 'Voz Principal', color: 'bg-red-500',
    muted: false, solo: false, volume: 80,
    regions: [{ id: 'r1', start: 10, duration: 150 }],
    plugins: [],
    automation: {},
  },
  {
    id: '2', name: 'Guitarra Base', color: 'bg-blue-500',
    muted: false, solo: false, volume: 70,
    regions: [{ id: 'r2', start: 0, duration: 200 }],
    plugins: [],
    automation: {},
  },
  {
    id: '3', name: 'Bateria Loop', color: 'bg-green-500',
    muted: true, solo: false, volume: 90,
    regions: [{ id: 'r3', start: 0, duration: 100 }, { id: 'r4', start: 100, duration: 100 }],
    plugins: [],
    automation: {},
  },
];

export default function Studio() {
  const { id, genre: genreParam, key: keyParam, bpm: bpmParam, title: titleParam } = useLocalSearchParams<{
    id: string;
    genre?: string;
    key?: string;
    bpm?: string;
    title?: string;
  }>();
  const router = useRouter();
  const projectTitle = (Array.isArray(titleParam) ? titleParam[0] : titleParam) || 'Projeto';
  const initialBpm = bpmParam ? parseInt(Array.isArray(bpmParam) ? bpmParam[0] : bpmParam, 10) || 120 : 120;
  const projectKey = Array.isArray(keyParam) ? keyParam[0] : keyParam;
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const [isRecording, setIsRecording] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>('mixer');
  const [showRecordOptions, setShowRecordOptions] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
  const [showAutomation, setShowAutomation] = useState<Record<string, boolean>>({});
  const [groups, setGroups] = useState<GroupDef[]>([]);
  const [trackAssignments, setTrackAssignments] = useState<Record<string, string | null>>({});
  const [masterPlugins, setMasterPlugins] = useState<Plugin[]>([]);
  const [masteringChain, setMasteringChain] = useState<Plugin[]>(() => buildMasteringChain(MASTERING_CHAIN_PRESETS[0]));
  const [mixSnapshots, setMixSnapshots] = useState<MixSnapshot[]>([]);
  const [activeMixId, setActiveMixId] = useState<string | undefined>();

  const {
    state: tracks,
    setState: setTracks,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
  } = useHistory<Track[]>(INITIAL_TRACKS);

  const [metronome, setMetronome] = useState<MetronomeSettings>({
    bpm: initialBpm,
    timeSig: [4, 4],
    accentInterval: 4,
    volume: 60,
    enabled: true,
    countIn: true,
    countInBars: 2,
  });

  const [recordSettings, setRecordSettings] = useState<RecordSettings>({
    armed: false,
    inputSource: 'mic',
    quality: 'high',
    sampleRate: 48000,
    mono: false,
    preRoll: 2,
  });

  const isPlaying = player.playing;
  const currentTime = status.currentTime || 0;
  const duration = status.duration || 240;
  const anySolo = useMemo(() => tracks.some(t => t.solo), [tracks]);

  const togglePlay = useCallback(() => {
    if (isPlaying) { player.pause(); }
    else { player.replace(DEMO_AUDIO_URL); player.play(); }
  }, [isPlaying, player]);

  const toggleRecording = useCallback(() => {
    if (!recordSettings.armed) { setShowRecordOptions(true); return; }
    setIsRecording(prev => !prev);
  }, [recordSettings.armed]);

  const toggleMute = useCallback((trackId: string) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t));
  }, [tracks, setTracks]);

  const toggleSolo = useCallback((trackId: string) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, solo: !t.solo } : t));
  }, [tracks, setTracks]);

  const setTrackVolume = useCallback((trackId: string, vol: number) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, volume: vol } : t));
  }, [tracks, setTracks]);

  const trackVolume = (trackId: string) => tracks.find(t => t.id === trackId)?.volume ?? 70;

  const isAudible = (track: Track) => {
    if (anySolo) return track.solo;
    const groupVol = getGroupVolume(groups, track.id);
    if (groupVol?.muted) return false;
    return !track.muted;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const selectedTrack = useMemo(() => tracks.find(t => t.id === selectedTrackId) || null, [tracks, selectedTrackId]);

  const updateTrackPlugins = useCallback((trackId: string, plugins: Plugin[]) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, plugins } : t));
  }, [tracks, setTracks]);

  const updateAutomation = useCallback((trackId: string, param: string, points: AutomationPoint[]) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, automation: { ...t.automation, [param]: points } } : t));
  }, [tracks, setTracks]);

  const handleSaveMix = useCallback((name: string) => {
    const snapshot: MixSnapshot = {
      id: `mix-${Date.now()}`,
      name,
      created: Date.now(),
      trackVolumes: Object.fromEntries(tracks.map(t => [t.id, t.volume])),
      trackMutes: Object.fromEntries(tracks.map(t => [t.id, t.muted])),
      trackSolos: Object.fromEntries(tracks.map(t => [t.id, t.solo])),
      plugins: Object.fromEntries(tracks.map(t => [t.id, t.plugins])),
    };
    setMixSnapshots(prev => [...prev, snapshot]);
    setActiveMixId(snapshot.id);
  }, [tracks]);

  const handleLoadMix = useCallback((snapId: string) => {
    const snap = mixSnapshots.find(s => s.id === snapId);
    if (!snap) return;
    setTracks(tracks.map(t => ({
      ...t,
      volume: snap.trackVolumes[t.id] ?? t.volume,
      muted: snap.trackMutes[t.id] ?? t.muted,
      solo: snap.trackSolos[t.id] ?? t.solo,
      plugins: snap.plugins[t.id] ?? t.plugins,
    })));
    setActiveMixId(snapId);
  }, [mixSnapshots, setTracks, tracks]);

  const handleDeleteMix = useCallback((snapId: string) => {
    setMixSnapshots(prev => prev.filter(s => s.id !== snapId));
    if (activeMixId === snapId) setActiveMixId(undefined);
  }, [activeMixId]);

  const handleCompareMix = useCallback((idA: string, idB: string) => {
    const snapA = mixSnapshots.find(s => s.id === idA);
    const snapB = mixSnapshots.find(s => s.id === idB);
    if (!snapA || !snapB) return;
    const diffTracks = tracks.filter(t => {
      const vA = snapA.trackVolumes[t.id];
      const vB = snapB.trackVolumes[t.id];
      return vA !== vB || snapA.trackMutes[t.id] !== snapB.trackMutes[t.id];
    });
    const msg = diffTracks.map(t => {
      const vA = snapA.trackVolumes[t.id] ?? 0;
      const vB = snapB.trackVolumes[t.id] ?? 0;
      return `${t.name}: ${vA}% → ${vB}%`;
    }).join('\n');
    alert(`A/B — ${snapA.name} vs ${snapB.name}\n\n${msg || 'Nenhuma diferença'} (volumes/mutes)`);
  }, [tracks, mixSnapshots]);

  const handlePluginParamChange = useCallback((pluginId: string, paramId: string, value: number) => {
    const updateChain = (chain: Plugin[]) =>
      chain.map(p => p.id === pluginId ? { ...p, params: { ...p.params, [paramId]: value } } : p);
    setMasteringChain(prev => updateChain(prev));
    setMasterPlugins(prev => updateChain(prev));
    if (selectedTrack) {
      setTracks(tracks.map(t => t.id === selectedTrack.id ? { ...t, plugins: updateChain(t.plugins) } : t));
    }
  }, [selectedTrack, setTracks, tracks]);

  const handleTogglePlugin = useCallback((pluginId: string) => {
    const toggleChain = (chain: Plugin[]) =>
      chain.map(p => p.id === pluginId ? { ...p, enabled: !p.enabled } : p);
    setMasteringChain(prev => toggleChain(prev));
    setMasterPlugins(prev => toggleChain(prev));
    if (selectedTrack) {
      setTracks(tracks.map(t => t.id === selectedTrack.id ? { ...t, plugins: toggleChain(t.plugins) } : t));
    }
  }, [selectedTrack, setTracks, tracks]);

  const handleLoadMasteringPreset = useCallback((index: number) => {
    const preset = MASTERING_CHAIN_PRESETS[index];
    if (!preset) return;
    setMasteringChain(buildMasteringChain(preset));
  }, []);

  const getEffectiveVolume = (trackId: string): number => {
    const gv = getGroupVolume(groups, trackId);
    const tv = trackVolume(trackId);
    return gv ? Math.round(tv * (gv.volume / 100)) : tv;
  };

  const bottomTabs: { key: BottomTab; label: string; icon: string }[] = [
    { key: 'mixer', label: 'Mixer', icon: '◉' },
    { key: 'fx', label: 'FX', icon: '◈' },
    { key: 'mastering', label: 'Master', icon: '⊡' },
    { key: 'groups', label: 'Grupos', icon: '◈' },
    { key: 'mixes', label: 'Mixes', icon: '☰' },
  ];

  return (
    <View className="flex-1 bg-dark-bg select-none">
      <View className="h-14 bg-dark-surface border-b border-dark-border flex-row items-center justify-between px-4">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={togglePlay}
            className={`w-11 h-11 rounded-full items-center justify-center ${isPlaying ? 'bg-green-600' : 'bg-dark-border'}`}>
            <Text className="text-white text-lg">{isPlaying ? '⏸' : '▶'}</Text>
          </Pressable>
          <Pressable onPress={toggleRecording}
            className={`w-11 h-11 rounded-full items-center justify-center ${isRecording ? 'bg-red-600' : recordSettings.armed ? 'bg-red-500/30' : 'bg-dark-border'}`}>
            <View className={`w-4 h-4 rounded-sm ${isRecording ? 'bg-white' : 'bg-red-500'}`} />
          </Pressable>
          <Pressable onPress={() => setShowRecordOptions(true)}
            className="w-8 h-8 rounded-lg bg-dark-muted items-center justify-center active:opacity-70">
            <Text className="text-gray-400 text-xs">⚙</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-1.5">
          <Pressable onPress={undoHistory}
            className={`w-8 h-8 rounded-lg items-center justify-center ${canUndo ? 'bg-dark-muted active:opacity-70' : 'opacity-30'}`}>
            <Text className="text-gray-300 text-xs">↩</Text>
          </Pressable>
          <Pressable onPress={redoHistory}
            className={`w-8 h-8 rounded-lg items-center justify-center ${canRedo ? 'bg-dark-muted active:opacity-70' : 'opacity-30'}`}>
            <Text className="text-gray-300 text-xs">↪</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-3">
          <Metronome settings={metronome} onChange={setMetronome} isPlaying={isPlaying} />
          <MixManager snapshots={mixSnapshots} activeMixId={activeMixId} onSave={handleSaveMix} onLoad={handleLoadMix} onDelete={handleDeleteMix} onCompare={handleCompareMix} />
        </View>

        <View className="flex-row items-center gap-2">
          <TimeDisplay seconds={currentTime} />
          <Text className="text-gray-600">/</Text>
          <TimeDisplay seconds={duration} />
        </View>

        {projectKey && genreParam && (
          <View className="bg-dark-muted px-2.5 py-1 rounded-lg border border-dark-border items-center">
            <Text className="text-gray-500 text-[8px] font-bold tracking-wider">{genreParam.toUpperCase()}</Text>
            <Text className="text-gray-300 font-mono text-[11px]">{projectKey}</Text>
          </View>
        )}

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
          {tracks.map((track) => {
            const gv = getGroupVolume(groups, track.id);
            return (
              <Pressable
                key={track.id}
                onPress={() => setSelectedTrackId(track.id === selectedTrackId ? null : track.id)}
                className={`h-20 p-2 border-b border-dark-border justify-between bg-dark-surface/30 ${
                  selectedTrackId === track.id ? 'border-l-2 border-brand-accent bg-dark-elevated/50' : ''
                }`}
              >
                <Text className="text-gray-200 text-xs font-semibold truncate">{track.name}</Text>
                <View className="flex-row items-center gap-1 mt-0.5">
                  {track.plugins.filter(p => p.enabled).slice(0, 3).map(p => (
                    <View key={p.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                  ))}
                  {gv && <View className="w-3 h-1.5 rounded-full bg-gray-600" />}
                </View>
                <View className="flex-row gap-1.5 mt-1">
                  <Pressable onPress={() => toggleMute(track.id)}
                    className={`w-7 h-7 rounded items-center justify-center border ${track.muted ? 'bg-amber-500 border-amber-400' : 'bg-[#222] border-dark-border'}`}>
                    <Text className={`text-xs font-bold ${track.muted ? 'text-white' : 'text-gray-400'}`}>M</Text>
                  </Pressable>
                  <Pressable onPress={() => toggleSolo(track.id)}
                    className={`w-7 h-7 rounded items-center justify-center border ${track.solo ? 'bg-green-500 border-green-400' : 'bg-[#222] border-dark-border'}`}>
                    <Text className={`text-xs font-bold ${track.solo ? 'text-white' : 'text-gray-400'}`}>S</Text>
                  </Pressable>
                  <Pressable onPress={() => setShowAutomation(prev => ({ ...prev, [track.id]: !prev[track.id] }))}
                    className={`w-7 h-7 rounded items-center justify-center border ${showAutomation[track.id] ? 'bg-brand-accent/20 border-brand-accent' : 'bg-[#222] border-dark-border'}`}>
                    <Text className={`text-xs font-bold ${showAutomation[track.id] ? 'text-brand-accent' : 'text-gray-400'}`}>A</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </View>

        <ScrollView horizontal className="flex-1 bg-[#0b0b0d]">
          <View style={{ width: 1200 }}>
            <View className="relative" style={{ height: tracks.length * 80 }}>
              {tracks.map((track) => {
                const trackIndex = tracks.indexOf(track);
                const showAuto = showAutomation[track.id];
                return (
                  <View key={track.id} className="absolute w-full" style={{ height: showAuto ? 106 : 80, top: trackIndex * (showAuto ? 106 : 80) }}>
                    <View className="h-20 border-b border-dark-border/30 relative justify-center bg-dark-bg/10">
                      {track.regions.map((region) => (
                        <View
                          key={region.id}
                          style={{ left: region.start * 2.4, width: region.duration * 2.4, position: 'absolute' }}
                          className={`h-14 rounded-lg border border-white/10 overflow-hidden shadow-sm ${
                            track.color
                          } ${isAudible(track) ? 'opacity-90' : 'opacity-25'}`}
                        >
                          <WaveformClip
                            regionId={region.id}
                            duration={region.duration}
                            color={track.color}
                            audible={isAudible(track)}
                            height={56}
                          />
                        </View>
                      ))}
                    </View>
                    {showAuto && (
                      <View className="h-[26px] bg-dark-bg/20 border-b border-dark-border/20">
                        <AutomationLane
                          points={track.automation.volume || []}
                          onChange={(pts) => updateAutomation(track.id, 'volume', pts)}
                          duration={duration}
                          color="#5ac8fa"
                          visible
                          label="Volume"
                          minValue={0}
                          maxValue={100}
                        />
                      </View>
                    )}
                  </View>
                );
              })}

              {isPlaying && (
                <View
                  className="absolute top-0 bottom-0 w-0.5 bg-brand-primary z-10 shadow-sm shadow-brand-primary/50"
                  style={{ left: currentTime * 2.4 }}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </View>

      <View className="bg-[#141417] border-t border-dark-border">
        <View className="flex-row border-b border-dark-border/50">
          {bottomTabs.map(tab => (
            <Pressable key={tab.key} onPress={() => setBottomTab(tab.key)}
              className={`flex-1 py-2.5 flex-row items-center justify-center gap-1.5 ${
                bottomTab === tab.key ? 'bg-dark-surface border-b-2 border-brand-primary' : 'opacity-60'
              }`}>
              <Text className={`text-xs ${bottomTab === tab.key ? 'text-brand-primary' : 'text-gray-400'}`}>{tab.icon}</Text>
              <Text className={`text-xs font-bold ${bottomTab === tab.key ? 'text-brand-primary' : 'text-gray-400'}`}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

        {bottomTab === 'mixer' && (
          <View>
            <View className="flex-row items-center gap-3 px-4 py-2 border-b border-dark-border/50 bg-dark-surface/20">
              <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Mixer</Text>
              <View className="flex-1 h-1.5 bg-dark-border rounded-full overflow-hidden">
                <View className="h-full bg-brand-primary rounded-full" style={{ width: `${progressPct}%` }} />
              </View>
              {isPlaying && (
                <View className="flex-row gap-0.5">
                  {Array.from({ length: 4 }, (_, i) => (
                    <View key={i} className="w-1 bg-green-500/60 rounded-full" style={{ height: 8 + Math.sin(currentTime * 4 + i * 1.5) * 6, opacity: 0.4 + Math.sin(currentTime * 3 + i) * 0.3 }} />
                  ))}
                </View>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1 px-4">
              <View className="flex-row gap-4 py-2">
                {tracks.map((track) => {
                  const effVol = getEffectiveVolume(track.id);
                  return (
                    <View key={track.id} className="w-24 bg-dark-surface rounded-xl border border-dark-border p-2.5 items-center gap-2">
                      <Text className="text-[10px] text-gray-400 font-medium truncate w-full text-center">{track.name}</Text>
                      <Pressable onPress={() => setTrackVolume(track.id, Math.min(100, Math.max(0, trackVolume(track.id) - 10)))}
                        className="w-4 flex-1 bg-[#111] rounded-full relative justify-end overflow-hidden active:opacity-80">
                        <View style={{ height: `${effVol}%` }} className={`w-full rounded-full ${isAudible(track) ? 'bg-brand-accent' : 'bg-gray-600'}`} />
                      </Pressable>
                      <View className="flex-row items-center gap-1">
                        <Pressable onPress={() => setTrackVolume(track.id, Math.max(0, trackVolume(track.id) - 5))}
                          className="w-5 h-5 rounded bg-[#222] items-center justify-center active:opacity-70">
                          <Text className="text-gray-400 text-xs">−</Text>
                        </Pressable>
                        <Text className="text-[9px] font-mono text-gray-500 w-8 text-center">{track.muted ? 'MUT' : `${effVol}%`}</Text>
                        <Pressable onPress={() => setTrackVolume(track.id, Math.min(100, trackVolume(track.id) + 5))}
                          className="w-5 h-5 rounded bg-[#222] items-center justify-center active:opacity-70">
                          <Text className="text-gray-400 text-xs">+</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {bottomTab === 'fx' && (
          <ScrollView className="flex-1 px-4 py-3" style={{ maxHeight: 220 }}>
            {selectedTrack ? (
              <View>
                <View className="flex-row items-center gap-2 mb-2 px-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                  <Text className="label text-brand-accent/70">{selectedTrack.name}</Text>
                </View>
                <PluginRack plugins={selectedTrack.plugins} onChange={(pl) => updateTrackPlugins(selectedTrack.id, pl)} onEdit={setEditingPlugin} trackName={selectedTrack.name} />
                <MasterRack plugins={masterPlugins} onChange={setMasterPlugins} onEdit={setEditingPlugin} />
              </View>
            ) : (
              <View className="py-4 items-center gap-2">
                <Text className="text-gray-500 text-xs">Selecione uma track para ver os plugins</Text>
                <MasterRack plugins={masterPlugins} onChange={setMasterPlugins} onEdit={setEditingPlugin} />
              </View>
            )}
          </ScrollView>
        )}

        {bottomTab === 'mastering' && (
          <ScrollView className="flex-1 px-4 py-3" style={{ maxHeight: 340 }}>
            <LufsMeter isPlaying={isPlaying} />
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <View className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <Text className="label text-rose-400/70 uppercase">Mastering Chain</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-w-[200px]">
                <View className="flex-row gap-1">
                  {MASTERING_CHAIN_PRESETS.map((preset, i) => (
                    <Pressable key={preset.name} onPress={() => handleLoadMasteringPreset(i)}
                      className="px-2 py-1 rounded-md border border-dark-border bg-dark-surface">
                      <Text className="text-gray-400 text-[9px] font-medium">{preset.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
            {masteringChain.map((plugin, i) => {
              const isTruePeak = plugin.type === 'truePeakLimiter';
              return (
                <Pressable key={plugin.id} onPress={() => setEditingPlugin(plugin)}
                  className={`flex-row items-center gap-3 px-3 py-2.5 rounded-xl mb-1.5 border ${isTruePeak ? 'bg-red-500/10 border-red-500/30' : 'bg-dark-surface/80 border-dark-border'}`}>
                  <View className="flex-row items-center gap-2 flex-1">
                    <View className="w-1 h-8 rounded-full" style={{ backgroundColor: plugin.color }} />
                    <View>
                      <Text className="text-white text-xs font-semibold">{plugin.name}</Text>
                      <Text className="text-gray-500 text-[9px]">{isTruePeak ? 'TRUE PEAK — Final Safety' : `#${i + 1} in chain`}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => handleTogglePlugin(plugin.id)}
                    className={`w-8 h-6 rounded-md border items-center justify-center ${plugin.enabled ? (isTruePeak ? 'bg-red-500/30 border-red-500/50' : 'bg-dark-elevated border-dark-border') : 'bg-dark-surface border-dark-border/30'}`}>
                    <Text className={`text-[9px] font-bold ${plugin.enabled ? (isTruePeak ? 'text-red-400' : 'text-white') : 'text-gray-600'}`}>{plugin.enabled ? 'ON' : 'OFF'}</Text>
                  </Pressable>
                  <Pressable onPress={() => setEditingPlugin(plugin)} className="w-6 h-6 items-center justify-center">
                    <Text className="text-gray-500 text-xs">▸</Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {bottomTab === 'groups' && (
          <ScrollView className="flex-1" style={{ maxHeight: 260 }}>
            <TrackGroupManager
              groups={groups}
              tracks={tracks}
              onCreateGroup={(name, trackIds) => {
                const g: GroupDef = { id: `group-${Date.now()}`, name, color: GROUP_COLORS[groups.length % GROUP_COLORS.length], volume: 80, muted: false, trackIds };
                setGroups(prev => [...prev, g]);
                setTrackAssignments(prev => {
                  const next = { ...prev };
                  trackIds.forEach(tId => { next[tId] = g.id; });
                  return next;
                });
              }}
              onRemoveGroup={(groupId) => {
                setGroups(prev => prev.filter(g => g.id !== groupId));
                setTrackAssignments(prev => {
                  const next = { ...prev };
                  Object.keys(next).forEach(k => { if (next[k] === groupId) next[k] = null; });
                  return next;
                });
              }}
              onGroupVolume={(groupId, vol) => setGroups(prev => prev.map(g => g.id === groupId ? { ...g, volume: vol } : g))}
              onGroupMute={(groupId) => setGroups(prev => prev.map(g => g.id === groupId ? { ...g, muted: !g.muted } : g))}
              onAssignTrack={(trackId, groupId) => setTrackAssignments(prev => ({ ...prev, [trackId]: groupId }))}
              trackAssignments={trackAssignments}
            />
          </ScrollView>
        )}

        {bottomTab === 'mixes' && (
          <View className="px-4 py-3" style={{ maxHeight: 220 }}>
            <MixManager snapshots={mixSnapshots} activeMixId={activeMixId} onSave={handleSaveMix} onLoad={handleLoadMix} onDelete={handleDeleteMix} onCompare={handleCompareMix} />
          </View>
        )}
      </View>

      <RecordOptions settings={recordSettings} onChange={setRecordSettings} visible={showRecordOptions} onClose={() => setShowRecordOptions(false)} />
      <PluginEditor plugin={editingPlugin} onParamChange={handlePluginParamChange} onToggle={handleTogglePlugin} onClose={() => setEditingPlugin(null)} />
    </View>
  );
}
