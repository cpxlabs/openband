import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState, AudioModule, setAudioModeAsync, RecordingPresets } from 'expo-audio';
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
  BounceDialog,
  SampleBrowser,
  CodeSampler,
  Tuner,
  PedalRack,
  PianoRoll,
  Looper,
  Sampler,
  Synth,
} from '../../src/components';
import { useHistory } from '../../src/lib/history';
import { useKeyboardShortcuts } from '../../src/lib/keyboard';
import { saveProject, loadProject } from '../../src/lib/projectStore';
import { parseMidi, midiToTrackRegions } from '../../src/lib/midiParser';
import { getGroupVolume } from '../../src/components/TrackGroup';
import type { Plugin, MixSnapshot, MetronomeSettings, RecordSettings, TrackDef, GroupDef, SendBus, TrackAmpChain, TrackRegion, MIDINote } from '../../src/lib/types';
import { useResponsive } from '../../src/lib/responsive';
import { MASTERING_CHAIN_PRESETS, buildMasteringChain } from '../../src/lib/mastering';
import { autoMix, AUTOMIX_GENRES } from '../../src/lib/automix';
import type { AutomationPoint } from '../../src/components/AutomationLane';

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
const TRACK_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];

type PluginSource = 'mastering' | 'masterRack' | 'track' | null;

const INITIAL_TRACKS: TrackDef[] = [
  {
    id: '1', name: 'Voz Principal', color: 'bg-red-500',
    muted: false, solo: false, volume: 80, pan: 0, sends: {}, sidechainSource: null,
    regions: [{ id: 'r1', start: 10, duration: 150 }],
    plugins: [],
    automation: {},
  },
  {
    id: '2', name: 'Guitarra Base', color: 'bg-blue-500',
    muted: false, solo: false, volume: 70, pan: 0, sends: {}, sidechainSource: null,
    regions: [{ id: 'r2', start: 0, duration: 200 }],
    plugins: [],
    automation: {},
  },
  {
    id: '3', name: 'Bateria Loop', color: 'bg-green-500',
    muted: true, solo: false, volume: 90, pan: 0, sends: {}, sidechainSource: null,
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
  const initialBpm = bpmParam ? (parseInt(Array.isArray(bpmParam) ? bpmParam[0] : bpmParam, 10) || 120) : 120;
  const projectKey = Array.isArray(keyParam) ? keyParam[0] : keyParam;
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  useEffect(() => {
    (async () => {
      try {
        const { granted } = await AudioModule.requestRecordingPermissionsAsync();
        if (!granted) {
          Alert.alert('Permissão', 'Permissão para usar o microfone foi negada.');
        }
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      } catch {}
    })();
  }, []);

  const resp = useResponsive();

  const [isRecording, setIsRecording] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>('mixer');
  const [showRecordOptions, setShowRecordOptions] = useState(false);
  const [showBounce, setShowBounce] = useState(false);
  const [showSampleBrowser, setShowSampleBrowser] = useState(false);
  const [showCodeSampler, setShowCodeSampler] = useState(false);
  const [showTuner, setShowTuner] = useState(false);
  const [showLooper, setShowLooper] = useState(false);
  const [showSampler, setShowSampler] = useState(false);
  const [showSynth, setShowSynth] = useState(false);
  const [showPianoRoll, setShowPianoRoll] = useState(false);
  const [editingMidiTrackId, setEditingMidiTrackId] = useState<string | null>(null);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
  const [editingPluginSource, setEditingPluginSource] = useState<PluginSource>(null);
  const [showAutomation, setShowAutomation] = useState<Record<string, boolean>>({});
  const [groups, setGroups] = useState<GroupDef[]>([]);
  const [sendBuses, setSendBuses] = useState<SendBus[]>([]);
  const [trackAmpChains, setTrackAmpChains] = useState<Record<string, TrackAmpChain>>({});
  const [trackAssignments, setTrackAssignments] = useState<Record<string, string | null>>({});
  const [masterPlugins, setMasterPlugins] = useState<Plugin[]>([]);
  const [masteringChain, setMasteringChain] = useState<Plugin[]>(() => buildMasteringChain(MASTERING_CHAIN_PRESETS[0]));
  const [mixSnapshots, setMixSnapshots] = useState<MixSnapshot[]>([]);
  const [activeMixId, setActiveMixId] = useState<string | undefined>();
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null);
  const saveLabelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    state: tracks,
    setState: setTracks,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
  } = useHistory<TrackDef[]>(INITIAL_TRACKS);

  const [metronome, setMetronome] = useState<MetronomeSettings>({
    bpm: initialBpm,
    timeSig: [4, 4],
    accentInterval: 4,
    volume: 60,
    enabled: true,
    countIn: true,
    countInBars: 2,
  });

  const [playbackRate, setPlaybackRate] = useState(1.0);

  const [recordSettings, setRecordSettings] = useState<RecordSettings>({
    armed: false,
    inputSource: 'mic',
    quality: 'high',
    sampleRate: 48000,
    mono: false,
    preRoll: 2,
  });

  useEffect(() => {
    player.playbackRate = playbackRate;
  }, [playbackRate, player]);

  useEffect(() => {
    const saved = loadProject(id);
    if (saved) {
      setTracks(saved.tracks as TrackDef[]);
      setGroups(saved.groups);
      setTrackAssignments(saved.trackAssignments);
      setMasterPlugins(saved.masterPlugins);
      setMasteringChain(saved.masteringChain);
      setMixSnapshots(saved.mixSnapshots);
      setActiveMixId(saved.activeMixId);
      setSendBuses(saved.sendBuses ?? []);
      setTrackAmpChains(saved.trackAmpChains ?? {});
      if (saved.metronome) setMetronome(saved.metronome);
      if (saved.recordSettings) setRecordSettings(saved.recordSettings);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveProject(id, {
        title: projectTitle,
        genre: genreParam || '',
        key: projectKey || '',
        bpm: metronome.bpm,
        tracks: tracks as unknown as TrackDef[],
        groups,
        trackAssignments,
        masterPlugins,
        masteringChain,
        mixSnapshots,
        activeMixId,
        metronome,
        recordSettings,
        sendBuses,
        trackAmpChains,
      });
      setLastSavedLabel('Salvo');
      saveLabelTimerRef.current = setTimeout(() => setLastSavedLabel(null), 2000);
    }, 2000);
    return () => {
      clearTimeout(timer);
      if (saveLabelTimerRef.current) {
        clearTimeout(saveLabelTimerRef.current);
        saveLabelTimerRef.current = null;
      }
    };
  }, [tracks, groups, trackAssignments, masterPlugins, masteringChain, mixSnapshots, activeMixId, metronome, recordSettings, sendBuses, trackAmpChains, id, projectTitle, genreParam, projectKey]);

  const isPlaying = player.playing;
  const currentTime = status.currentTime || 0;
  const duration = status.duration || 240;
  const anySolo = useMemo(() => tracks.some(t => t.solo), [tracks]);

  const togglePlay = useCallback(() => {
    if (isPlaying) { player.pause(); }
    else { player.replace(DEMO_AUDIO_URL); player.play(); }
  }, [isPlaying, player]);

  const toggleRecording = useCallback(async () => {
    if (!recordSettings.armed) { setShowRecordOptions(true); return; }

    if (isRecording) {
      await audioRecorder.stop();
      const uri = recorderState?.url || audioRecorder.uri || '';
      if (uri) {
        const trackId = `rec-${Date.now()}`;
        const newTrack: TrackDef = {
          id: trackId,
          name: `Recording ${tracks.length + 1}`,
          color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
          muted: false,
          solo: false,
          volume: 80,
          pan: 0,
          sends: {}, sidechainSource: null,
          regions: [{ id: `region-${Date.now()}`, start: 0, duration: Math.max(recorderState.durationMillis / 1000, 1), url: uri }],
          plugins: [],
          automation: {},
        };
        setTracks([...tracks, newTrack]);
        setSelectedTrackId(trackId);
      }
      setIsRecording(false);
    } else {
      const bitRateMap: Record<string, number> = {
        low: 64000,
        medium: 128000,
        high: 192000,
        lossless: 1411000,
      };
      await audioRecorder.prepareToRecordAsync({
        sampleRate: recordSettings.sampleRate,
        numberOfChannels: recordSettings.mono ? 1 : 2,
        bitRate: bitRateMap[recordSettings.quality] || 128000,
        extension: recordSettings.quality === 'lossless' ? '.wav' : '.m4a',
      });
      audioRecorder.record();
      setIsRecording(true);
    }
  }, [recordSettings.armed, isRecording, audioRecorder, recorderState.durationMillis, tracks, setTracks, recordSettings.sampleRate, recordSettings.mono, recordSettings.quality]);

  const toggleMute = useCallback((trackId: string) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t));
  }, [tracks, setTracks]);

  const toggleSolo = useCallback((trackId: string) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, solo: !t.solo } : t));
  }, [tracks, setTracks]);

  const setTrackVolume = useCallback((trackId: string, vol: number) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, volume: vol } : t));
  }, [tracks, setTracks]);

  const setTrackPan = useCallback((trackId: string, pan: number) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, pan } : t));
  }, [tracks, setTracks]);

  const setTrackSend = useCallback((trackId: string, busId: string, value: number) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, sends: { ...t.sends, [busId]: value } } : t));
  }, [tracks, setTracks]);

  const setTrackSidechain = useCallback((trackId: string, sourceId: string | null) => {
    setTracks(tracks.map(t => t.id === trackId ? { ...t, sidechainSource: sourceId } : t));
  }, [tracks, setTracks]);

  const trackVolume = (trackId: string) => tracks.find(t => t.id === trackId)?.volume ?? 70;

  const isAudible = (track: TrackDef) => {
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
      trackPans: Object.fromEntries(tracks.map(t => [t.id, t.pan])),
      trackSends: Object.fromEntries(tracks.map(t => [t.id, t.sends])),
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
      pan: snap.trackPans[t.id] ?? t.pan,
      sends: snap.trackSends[t.id] ?? t.sends,
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
      return vA !== vB || snapA.trackMutes[t.id] !== snapB.trackMutes[t.id] || snapA.trackPans[t.id] !== snapB.trackPans[t.id] || snapA.trackSends[t.id] !== snapB.trackSends[t.id];
    });
    const msg = diffTracks.map(t => {
      const vA = snapA.trackVolumes[t.id] ?? 0;
      const vB = snapB.trackVolumes[t.id] ?? 0;
      const pA = snapA.trackPans[t.id] ?? 0;
      const pB = snapB.trackPans[t.id] ?? 0;
      const sA = JSON.stringify(snapA.trackSends[t.id] ?? {});
      const sB = JSON.stringify(snapB.trackSends[t.id] ?? {});
      return `${t.name}: vol ${vA}%→${vB}% | pan ${pA}→${pB} | send ${sA}→${sB}`;
    }).join('\n');
    Alert.alert(`A/B — ${snapA.name} vs ${snapB.name}`, `${msg || 'Nenhuma diferença'} (vol/mute/pan/send)`);
  }, [tracks, mixSnapshots]);

  const handlePluginParamChange = useCallback((pluginId: string, paramId: string, value: number) => {
    const updateChain = (chain: Plugin[]) =>
      chain.map(p => p.id === pluginId ? { ...p, params: { ...p.params, [paramId]: value } } : p);
    if (editingPluginSource === 'mastering') {
      setMasteringChain(prev => updateChain(prev));
    } else if (editingPluginSource === 'masterRack') {
      setMasterPlugins(prev => updateChain(prev));
    } else if (editingPluginSource === 'track' && selectedTrack) {
      setTracks(tracks.map(t => t.id === selectedTrack.id ? { ...t, plugins: updateChain(t.plugins) } : t));
    }
  }, [editingPluginSource, selectedTrack, setTracks, tracks]);

  const handleTogglePlugin = useCallback((pluginId: string) => {
    const toggleChain = (chain: Plugin[]) =>
      chain.map(p => p.id === pluginId ? { ...p, enabled: !p.enabled } : p);
    if (editingPluginSource === 'mastering') {
      setMasteringChain(prev => toggleChain(prev));
    } else if (editingPluginSource === 'masterRack') {
      setMasterPlugins(prev => toggleChain(prev));
    } else if (editingPluginSource === 'track' && selectedTrack) {
      setTracks(tracks.map(t => t.id === selectedTrack.id ? { ...t, plugins: toggleChain(t.plugins) } : t));
    }
  }, [editingPluginSource, selectedTrack, setTracks, tracks]);

  const handleLoadMasteringPreset = useCallback((index: number) => {
    const preset = MASTERING_CHAIN_PRESETS[index];
    if (!preset) return;
    setMasteringChain(buildMasteringChain(preset));
  }, []);

  const handleManualSave = useCallback(() => {
    saveProject(id, {
      title: projectTitle,
      genre: genreParam || '',
      key: projectKey || '',
      bpm: metronome.bpm,
      tracks: tracks as TrackDef[],
      groups,
      trackAssignments,
      masterPlugins,
      masteringChain,
      mixSnapshots,
      activeMixId,
      metronome,
      recordSettings,
      sendBuses,
      trackAmpChains,
    });
    setLastSavedLabel('Salvo ✓');
    setTimeout(() => setLastSavedLabel(null), 2000);
  }, [tracks, groups, trackAssignments, masterPlugins, masteringChain, mixSnapshots, activeMixId, metronome, recordSettings, sendBuses, trackAmpChains, id, projectTitle, genreParam, projectKey]);

  const handleAddSample = useCallback((sample: { id: string; name: string; category: string; color: string; duration: number }) => {
    const trackId = `sample-${Date.now()}`;
    const newTrack: TrackDef = {
      id: trackId,
      name: sample.name,
      color: sample.color,
      muted: false,
      solo: false,
      volume: 75,
      pan: 0,       sends: {}, sidechainSource: null,
      regions: [{ id: `region-${Date.now()}`, start: 0, duration: Math.max(sample.duration * 10, 40) }],
      plugins: [],
      automation: {},
    };
    setTracks([...tracks, newTrack]);
  }, [tracks, setTracks]);

  const handleAddTrack = useCallback(() => {
    const trackId = `track-${Date.now()}`;
    const newTrack: TrackDef = {
      id: trackId,
      name: `Track ${tracks.length + 1}`,
      color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
      muted: false,
      solo: false,
      volume: 75,
      pan: 0, sends: {}, sidechainSource: null,
      regions: [{ id: `region-${Date.now()}`, start: 0, duration: 80 }],
      plugins: [],
      automation: {},
    };
    setTracks([...tracks, newTrack]);
    setSelectedTrackId(trackId);
  }, [tracks, setTracks]);

  const handleImportAudio = useCallback(() => {
    if (Platform.OS !== 'web') {
      Alert.alert('Importar', 'Importação disponível apenas na versão web.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.wav,.mp3,.aiff,.flac,.ogg,.m4a,audio/*';
    input.multiple = true;
    input.onchange = (e: Event) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      const newTracks = Array.from(files).map((file, i) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'wav';
        const approxDuration = Math.max(10, Math.round(file.size / 30000));
        return {
          id: `import-${Date.now()}-${i}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          color: TRACK_COLORS[(tracks.length + i) % TRACK_COLORS.length],
          muted: false,
          solo: false,
          volume: 75,
          pan: 0, sends: {}, sidechainSource: null,
          regions: [{ id: `region-import-${Date.now()}-${i}`, start: i * 4, duration: Math.min(approxDuration, 300) }],
          plugins: [] as Plugin[],
          automation: {} as Record<string, AutomationPoint[]>,
        } as TrackDef;
      });
      setTracks([...tracks, ...newTracks]);
    };
    input.click();
  }, [tracks, setTracks]);

  const handleCodeRender = useCallback((patterns: { name: string; tokens: string[]; unit: string; bpm: number }[]) => {
    const stepSeconds = (unit: string, bpm: number) =>
      unit === '1/4' ? 60 / bpm : unit === '1/8' ? 30 / bpm : 15 / bpm;

    const newTracks: TrackDef[] = patterns.map((pattern, pi) => {
      const step = stepSeconds(pattern.unit, pattern.bpm);
      const tokens = pattern.tokens as string[];
      const regions: TrackRegion[] = [];
      let currentStart = 0;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === 'REST') { currentStart += step; continue; }
        const dur = tokens[i] === 'BASS' ? step * 2 : step * 0.9;
        regions.push({ id: `code-${Date.now()}-${pi}-${i}`, start: currentStart, duration: dur });
        currentStart += step;
      }
      return {
        id: `code-${Date.now()}-${pi}`,
        name: pattern.name + (patterns.length > 1 ? ` ${pi + 1}` : ''),
        color: TRACK_COLORS[(tracks.length + pi) % TRACK_COLORS.length],
        muted: false, solo: false, volume: 75, pan: 0, sends: {}, sidechainSource: null,
        regions,
        plugins: [] as Plugin[],
        automation: {} as Record<string, AutomationPoint[]>,
      } as TrackDef;
    });
    setTracks([...tracks, ...newTracks]);
  }, [tracks, setTracks]);

  const handleMidiImport = useCallback(() => {
    if (Platform.OS !== 'web') { Alert.alert('MIDI', 'Importação MIDI disponível apenas na versão web.'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mid,.midi,audio/midi';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (!result || typeof result === 'string') return;
        const midi = parseMidi(result as ArrayBuffer);
        if (!midi) { Alert.alert('Erro', 'Não foi possível ler o arquivo MIDI.'); return; }
        const newTracks: TrackDef[] = midi.tracks.map((trk, ti) => ({
          id: `midi-${Date.now()}-${ti}`,
          name: `${trk.name} (${trk.instrument})`,
          color: TRACK_COLORS[(tracks.length + ti) % TRACK_COLORS.length],
          muted: false, solo: false, volume: 75, pan: 0, sends: {}, sidechainSource: null,
          regions: midiToTrackRegions(trk, midi.bpm),
          midiNotes: trk.notes.map(n => ({
            pitch: n.note,
            start: n.start / 480,
            duration: n.duration / 480,
            velocity: n.velocity,
          })),
          plugins: [] as Plugin[],
          automation: {} as Record<string, AutomationPoint[]>,
        }));
        setTracks([...tracks, ...newTracks]);
        Alert.alert('MIDI Importado', `${newTracks.length} faixas criadas de "${file.name}" (${midi.bpm} BPM)`);
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  }, [tracks, setTracks]);

  const selectedMidiTrack = useMemo(() => {
    if (!editingMidiTrackId) return null;
    return tracks.find(t => t.id === editingMidiTrackId) || null;
  }, [tracks, editingMidiTrackId]);

  const currentMidiNotes: MIDINote[] = useMemo(() => {
    return selectedMidiTrack?.midiNotes || [];
  }, [selectedMidiTrack]);

  function midiNotesToRegions(notes: MIDINote[], bpm: number): TrackRegion[] {
    if (notes.length === 0) return [];
    const minBeat = Math.min(...notes.map(n => n.start));
    return notes.map((n, i) => ({
      id: `midi-${n.pitch}-${i}-${Date.now()}`,
      start: (n.start - minBeat) * (60 / bpm),
      duration: Math.max(n.duration * (60 / bpm), 0.5),
    }));
  }

  const handleOpenPianoRoll = useCallback((trackId: string) => {
    setEditingMidiTrackId(trackId);
    setShowPianoRoll(true);
  }, []);

  const handlePianoRollChange = useCallback((notes: MIDINote[]) => {
    if (!editingMidiTrackId) return;
    setTracks(tracks.map(t => {
      if (t.id !== editingMidiTrackId) return t;
      return {
        ...t,
        midiNotes: notes,
        regions: midiNotesToRegions(notes, metronome.bpm),
      };
    }));
  }, [editingMidiTrackId, tracks, setTracks, metronome.bpm]);

  const shortcuts = useMemo(() => ({
    play: togglePlay,
    record: toggleRecording,
    undo: undoHistory,
    redo: redoHistory,
    save: handleManualSave,
    bounce: () => setShowBounce(true),
    escape: () => { setEditingPlugin(null); setShowRecordOptions(false); setShowBounce(false); setShowSampleBrowser(false); setShowCodeSampler(false); setShowTuner(false); setShowLooper(false); setShowSampler(false); setShowSynth(false); setShowPianoRoll(false); setEditingMidiTrackId(null); },
    toggleMute: selectedTrack ? () => toggleMute(selectedTrack.id) : undefined,
    toggleSolo: selectedTrack ? () => toggleSolo(selectedTrack.id) : undefined,
  }), [togglePlay, toggleRecording, undoHistory, redoHistory, handleManualSave, selectedTrack, toggleMute, toggleSolo]);

  useKeyboardShortcuts(shortcuts);

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
      <View className={`${resp.isMobile ? 'h-12 px-2' : 'h-14 px-4'} bg-dark-surface border-b border-dark-border flex-row items-center justify-between`}>
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
          <Pressable onPress={() => setShowTuner(true)}
            className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted">
            <Text className="text-gray-300 text-xs">🎵</Text>
          </Pressable>
          <Pressable onPress={() => setShowSampler(true)}
            className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted active:opacity-70">
            <Text className="text-gray-300 text-xs">🎛️</Text>
          </Pressable>
          <Pressable onPress={() => setShowSynth(true)}
            className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted active:opacity-70">
            <Text className="text-gray-300 text-xs">🎹</Text>
          </Pressable>
          <Pressable onPress={() => setShowLooper(true)}
            className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted active:opacity-70">
            <Text className="text-gray-300 text-xs">🔁</Text>
          </Pressable>
          <Pressable onPress={() => setShowCodeSampler(true)}
            className="w-8 h-8 rounded-lg bg-dark-muted items-center justify-center active:opacity-70">
            <Text className="text-gray-400 text-xs">⌨</Text>
          </Pressable>
          <Pressable onPress={() => setShowSampleBrowser(prev => !prev)}
            className={`w-8 h-8 rounded-lg items-center justify-center ${showSampleBrowser ? 'bg-brand-accent/30 border border-brand-accent' : 'bg-dark-muted active:opacity-70'}`}>
            <Text className={`text-xs ${showSampleBrowser ? 'text-brand-accent' : 'text-gray-400'}`}>📂</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2">
          <TimeDisplay seconds={currentTime} />
          <Text className="text-gray-600">/</Text>
          <TimeDisplay seconds={duration} />
        </View>

        <View className="flex-row items-center gap-0.5 bg-dark-bg/40 rounded-lg px-1.5 py-1 border border-dark-border/30">
          <Text className="text-gray-600 text-[9px] font-bold mr-0.5">⟳</Text>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
            <Pressable key={rate} onPress={() => setPlaybackRate(rate)}
              className={`px-1.5 py-0.5 rounded ${Math.abs(playbackRate - rate) < 0.01 ? 'bg-brand-accent/20 border border-brand-accent/40' : 'bg-dark-muted/30'}`}>
              <Text className={`text-[10px] font-mono ${Math.abs(playbackRate - rate) < 0.01 ? 'text-brand-accent font-semibold' : 'text-gray-500'}`}>{rate}x</Text>
            </Pressable>
          ))}
        </View>

        {projectKey && genreParam && (
          <View className="bg-dark-muted px-2.5 py-1 rounded-lg border border-dark-border items-center">
            <Text className="text-gray-500 text-[8px] font-bold tracking-wider">{genreParam.toUpperCase()}</Text>
            <Text className="text-gray-300 font-mono text-[11px]">{projectKey}</Text>
          </View>
        )}

        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => setShowBounce(true)}
            className="w-8 h-8 rounded-lg bg-dark-muted items-center justify-center active:opacity-70">
            <Text className="text-gray-400 text-xs">📦</Text>
          </Pressable>
          {lastSavedLabel && (
            <Text className="text-gray-500 text-[10px] font-medium">{lastSavedLabel}</Text>
          )}
          <Pressable onPress={handleManualSave} className="bg-brand-primary px-5 py-2 rounded-xl active:opacity-80">
            <Text className="text-white font-bold text-sm">Salvar</Text>
          </Pressable>
        </View>
      </View>

      <View className="h-10 bg-dark-surface/50 border-b border-dark-border flex-row items-center px-4">
        <View style={{ width: resp.tracksSidebarWidth }} className="pr-2">
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
        <View style={{ width: resp.tracksSidebarWidth }} className="bg-dark-bg/80 border-r border-dark-border">
          {tracks.map((track) => {
            const gv = getGroupVolume(groups, track.id);
            const trackH = resp.isMobile ? 80 : resp.isDesktop ? 104 : 80;
            return (
              <Pressable
                key={track.id}
                onPress={() => setSelectedTrackId(track.id === selectedTrackId ? null : track.id)}
                className={`p-2 border-b border-dark-border justify-between bg-dark-surface/30 ${
                  selectedTrackId === track.id ? 'border-l-2 border-brand-accent bg-dark-elevated/50' : ''
                }`}
                style={{ height: trackH }}
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
                            className={`w-7 h-7 rounded items-center justify-center border ${track.muted ? 'bg-amber-500 border-amber-400' : 'bg-dark-muted/40 border-dark-border'}`}>
                      <Text className={`text-xs font-bold ${track.muted ? 'text-white' : 'text-gray-400'}`}>M</Text>
                    </Pressable>
                    <Pressable onPress={() => toggleSolo(track.id)}
                            className={`w-7 h-7 rounded items-center justify-center border ${track.solo ? 'bg-green-500 border-green-400' : 'bg-dark-muted/40 border-dark-border'}`}>
                      <Text className={`text-xs font-bold ${track.solo ? 'text-white' : 'text-gray-400'}`}>S</Text>
                    </Pressable>
                    <Pressable onPress={() => setShowAutomation(prev => ({ ...prev, [track.id]: !prev[track.id] }))}
                            className={`w-7 h-7 rounded items-center justify-center border ${showAutomation[track.id] ? 'bg-brand-accent/20 border-brand-accent' : 'bg-dark-muted/40 border-dark-border'}`}>
                      <Text className={`text-xs font-bold ${showAutomation[track.id] ? 'text-brand-accent' : 'text-gray-400'}`}>A</Text>
                    </Pressable>
                    {track.midiNotes && track.midiNotes.length > 0 && (
                      <Pressable onPress={() => handleOpenPianoRoll(track.id)}
                        className="w-7 h-7 rounded items-center justify-center border bg-dark-muted/40 border-dark-border">
                        <Text className="text-xs text-brand-accent font-bold">🎹</Text>
                      </Pressable>
                    )}
                </View>
              </Pressable>
            );
          })}
          <View className="p-1.5 gap-1 border-t border-dark-border bg-dark-surface/20">
            <Pressable onPress={handleAddTrack}
              className="h-8 rounded-lg bg-dark-muted items-center justify-center flex-row gap-1 active:opacity-70">
              <Text className="text-gray-300 text-xs font-bold">+</Text>
              <Text className="text-gray-300 text-[10px] font-semibold">Track</Text>
            </Pressable>
            <Pressable onPress={handleImportAudio}
              className="h-8 rounded-lg bg-dark-muted items-center justify-center flex-row gap-1 active:opacity-70">
              <Text className="text-gray-300 text-xs">📁</Text>
              <Text className="text-gray-300 text-[10px] font-semibold">Audio</Text>
            </Pressable>
            <Pressable onPress={handleMidiImport}
              className="h-8 rounded-lg bg-dark-muted items-center justify-center flex-row gap-1 active:opacity-70">
              <Text className="text-gray-300 text-xs">🎹</Text>
              <Text className="text-gray-300 text-[10px] font-semibold">MIDI</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal className="flex-1 bg-dark-bg">
          <View style={{ width: 1200 }}>
            <View className="relative" style={{ height: tracks.length * (resp.isDesktop ? 104 : 80) }}>
              {tracks.map((track) => {
                const trackIndex = tracks.indexOf(track);
                const showAuto = showAutomation[track.id];
                const trackH = resp.isDesktop ? 104 : 80;
                return (
                  <View key={track.id} className="absolute w-full" style={{ height: showAuto ? trackH + 26 : trackH, top: trackIndex * (showAuto ? trackH + 26 : trackH) }}>
                    <View className="border-b border-dark-border/30 relative justify-center bg-dark-bg/10" style={{ height: trackH }}>
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

      {showSampleBrowser && (
        <View className="h-64 border-t border-dark-border bg-dark-bg">
          <View className="flex-row items-center justify-between px-4 py-1.5 border-b border-dark-border/50">
            <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Sample Browser</Text>
            <Pressable onPress={() => setShowSampleBrowser(false)} className="w-6 h-6 items-center justify-center active:opacity-60">
              <Text className="text-gray-500 text-xs">✕</Text>
            </Pressable>
          </View>
          <SampleBrowser visible onAddSample={handleAddSample} />
        </View>
      )}
      <View className="bg-dark-surface border-t border-dark-border">
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
            <View className={`flex-row items-center gap-3 ${resp.isMobile ? 'px-2 py-1.5' : 'px-4 py-2'} border-b border-dark-border/50 bg-dark-surface/20`}>
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
              <Pressable onPress={() => { if (sendBuses.length < 20) setSendBuses(prev => [...prev, { id: `bus-${Date.now()}`, name: `Send ${prev.length + 1}`, color: '#5ac8fa', volume: 80, muted: false }]); }}
                className="ml-auto px-2 py-1 rounded-md bg-dark-muted/40 border border-dark-border active:opacity-70">
                <Text className={`${resp.isMobile ? 'text-[9px]' : 'text-[10px]'} text-gray-400`}>+Send</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1 px-2 sm:px-4">
              <View className="flex-row gap-3 py-2">
                {tracks.map((track) => {
                  const effVol = getEffectiveVolume(track.id);
                  return (
                    <View key={track.id} style={{ width: resp.channelWidth }} className="bg-dark-surface rounded-xl border border-dark-border p-2.5 items-center gap-1.5">
                      <Text className="text-[10px] text-gray-400 font-medium truncate w-full text-center">{track.name}</Text>
                      <View className="flex-row gap-1">
                        <Pressable onPress={() => toggleMute(track.id)}
                          className={`w-7 h-5 rounded items-center justify-center ${track.muted ? 'bg-red-500/30 border border-red-400' : 'bg-dark-muted/40'}`}>
                          <Text className={`text-[9px] font-bold ${track.muted ? 'text-red-400' : 'text-gray-500'}`}>M</Text>
                        </Pressable>
                        <Pressable onPress={() => toggleSolo(track.id)}
                          className={`w-7 h-5 rounded items-center justify-center ${track.solo ? 'bg-amber-500/30 border border-amber-400' : 'bg-dark-muted/40'}`}>
                          <Text className={`text-[9px] font-bold ${track.solo ? 'text-amber-400' : 'text-gray-500'}`}>S</Text>
                        </Pressable>
                      </View>
                      <Pressable onPress={() => setTrackVolume(track.id, Math.min(100, Math.max(0, trackVolume(track.id) - 10)))}
                        className="w-3 flex-1 bg-dark-bg rounded-full relative justify-end overflow-hidden active:opacity-80">
                        <View style={{ height: `${effVol}%` }} className={`w-full rounded-full ${isAudible(track) ? 'bg-brand-accent' : 'bg-gray-600'}`} />
                      </Pressable>
                      <View className="flex-row items-center gap-1">
                        <Pressable onPress={() => setTrackVolume(track.id, Math.max(0, trackVolume(track.id) - 5))}
                          className="w-5 h-5 rounded bg-dark-muted/40 items-center justify-center active:opacity-70">
                          <Text className="text-gray-400 text-[11px]">−</Text>
                        </Pressable>
                        <Text className="text-[9px] font-mono text-gray-500 w-8 text-center">{track.muted ? 'MUT' : `${effVol}%`}</Text>
                        <Pressable onPress={() => setTrackVolume(track.id, Math.min(100, trackVolume(track.id) + 5))}
                          className="w-5 h-5 rounded bg-dark-muted/40 items-center justify-center active:opacity-70">
                          <Text className="text-gray-400 text-[11px]">+</Text>
                        </Pressable>
                      </View>
                      <View className="w-full h-6 flex-row items-center gap-1">
                        <Text className="text-[9px] text-gray-600 w-4 text-center">L</Text>
                        <View className="flex-1 h-1 bg-dark-bg rounded-full overflow-hidden">
                          <View className="h-full bg-cyan-500 rounded-full" style={{ width: `${(track.pan + 100) / 2}%` }} />
                        </View>
                        <Text className="text-[9px] text-gray-600 w-4 text-center">R</Text>
                      </View>
                      <View className="flex-row items-center gap-1 w-full justify-center">
                        <Pressable onPress={() => setTrackPan(track.id, Math.max(-100, track.pan - 10))}
                          className="w-6 h-5 rounded bg-dark-muted/30 items-center justify-center active:opacity-70">
                          <Text className="text-gray-500 text-[9px]">◀</Text>
                        </Pressable>
                        <Text className="text-[9px] font-mono text-gray-500 w-8 text-center">{track.pan > 0 ? `${track.pan}R` : track.pan < 0 ? `${-track.pan}L` : 'C'}</Text>
                        <Pressable onPress={() => setTrackPan(track.id, Math.min(100, track.pan + 10))}
                          className="w-6 h-5 rounded bg-dark-muted/30 items-center justify-center active:opacity-70">
                          <Text className="text-gray-500 text-[9px]">▶</Text>
                        </Pressable>
                      </View>
                      <View className="w-full flex-row items-center gap-1">
                        <Text className="text-[8px] text-gray-600 w-5">SC:</Text>
                        <Pressable
                          onPress={() => {
                            const others = tracks.filter(t => t.id !== track.id);
                            const currentIdx = others.findIndex(t => t.id === track.sidechainSource);
                            const next = others[(currentIdx + 1) % others.length];
                            setTrackSidechain(track.id, next?.id || null);
                          }}
                          className="flex-1 h-4 rounded bg-dark-muted/30 items-center justify-center active:opacity-70"
                        >
                          <Text className="text-[8px] text-gray-400">
                            {track.sidechainSource ? tracks.find(t => t.id === track.sidechainSource)?.name || '...' : 'OFF'}
                          </Text>
                        </Pressable>
                      </View>
                      {sendBuses.map(bus => (
                        <View key={bus.id} className="w-full flex-row items-center gap-1">
                          <Text className="text-[8px] text-gray-600 w-5 truncate text-right">{bus.name.replace('Send ', 'S')}</Text>
                          <View className="flex-1 h-0.5 bg-dark-bg rounded-full overflow-hidden">
                            <View className="h-full bg-purple-500/70 rounded-full" style={{ width: `${track.sends[bus.id] ?? 0}%` }} />
                          </View>
                          <Pressable onPress={() => setTrackSend(track.id, bus.id, Math.min(100, (track.sends[bus.id] ?? 0) + 5))}
                            className="w-4 h-4 rounded bg-dark-muted/30 items-center justify-center active:opacity-70">
                            <Text className="text-gray-500 text-[8px]">+</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  );
                })}
                {sendBuses.length > 0 && (
                  <View className="w-28 bg-dark-surface/60 rounded-xl border border-dashed border-dark-border p-2.5 items-center gap-1.5">
                    <Text className="text-[10px] text-gray-500 font-medium">Send Buses</Text>
                    {sendBuses.map(bus => (
                      <View key={bus.id} className="w-full flex-row items-center gap-1">
                        <Text className="text-[9px] text-gray-400 flex-1 truncate">{bus.name}</Text>
                        <Pressable onPress={() => setSendBuses(prev => prev.filter(b => b.id !== bus.id))}
                          className="w-4 h-4 rounded bg-red-500/20 items-center justify-center active:opacity-70">
                          <Text className="text-red-400 text-[8px]">×</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {bottomTab === 'fx' && (
          <ScrollView className={`flex-1 ${resp.isMobile ? 'px-2 py-2' : 'px-4 py-3'}`} style={{ maxHeight: resp.isMobile ? 220 : resp.isDesktop ? 320 : 260 }}>
            {selectedTrack ? (
              <View>
                <View className="flex-row items-center gap-2 mb-2 px-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                  <Text className="label text-brand-accent/70">{selectedTrack.name}</Text>
                </View>
                <PluginRack plugins={selectedTrack.plugins} onChange={(pl) => updateTrackPlugins(selectedTrack.id, pl)} onEdit={(p) => { setEditingPlugin(p); setEditingPluginSource('track'); }} trackName={selectedTrack.name} />
                <View className="mt-3">
                  <PedalRack chain={trackAmpChains[selectedTrack.id] ?? { pedals: [], amp: null, cab: null }}
                    onChange={(chain) => setTrackAmpChains(prev => ({ ...prev, [selectedTrack.id]: chain }))}
                    trackName={selectedTrack.name} />
                </View>
                <MasterRack plugins={masterPlugins} onChange={setMasterPlugins} onEdit={(p) => { setEditingPlugin(p); setEditingPluginSource('masterRack'); }} />
              </View>
            ) : (
              <View className="py-4 items-center gap-2">
                <Text className="text-gray-500 text-xs">Selecione uma track para ver os plugins</Text>
                <MasterRack plugins={masterPlugins} onChange={setMasterPlugins} onEdit={(p) => { setEditingPlugin(p); setEditingPluginSource('masterRack'); }} />
              </View>
            )}
          </ScrollView>
        )}

        {bottomTab === 'mastering' && (
          <ScrollView className={`flex-1 ${resp.isMobile ? 'px-2 py-2' : 'px-4 py-3'}`} style={{ maxHeight: 340 }}>
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
                <Pressable key={plugin.id} onPress={() => { setEditingPlugin(plugin); setEditingPluginSource('mastering'); }}
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
                  <Pressable onPress={() => { setEditingPlugin(plugin); setEditingPluginSource('mastering'); }} className="w-6 h-6 items-center justify-center">
                    <Text className="text-gray-500 text-xs">▸</Text>
                  </Pressable>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => router.push('/mastering')}
              className="mt-3 flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600/20 to-brand-accent/20 border border-rose-500/30 active:opacity-80"
            >
              <Text className="text-rose-400 text-sm font-bold">Enviar para Mastering Suite</Text>
              <Text className="text-rose-400/70 text-lg">→</Text>
            </Pressable>
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
          <View className="px-4 py-3" style={{ maxHeight: 280 }}>
            <View className="flex-row items-center gap-2 mb-2">
              <Text className="text-gray-300 text-xs font-semibold">AutoMix</Text>
              {AUTOMIX_GENRES.map(genre => (
                <Pressable
                  key={genre}
                  onPress={() => setTracks(autoMix(tracks, genre))}
                  className="px-2.5 py-1 rounded-lg bg-dark-muted border border-dark-border active:opacity-70"
                >
                  <Text className="text-gray-300 text-[10px] font-medium capitalize">{genre}</Text>
                </Pressable>
              ))}
            </View>
            <MixManager snapshots={mixSnapshots} activeMixId={activeMixId} onSave={handleSaveMix} onLoad={handleLoadMix} onDelete={handleDeleteMix} onCompare={handleCompareMix} />
          </View>
        )}
      </View>

      <RecordOptions settings={recordSettings} onChange={setRecordSettings} visible={showRecordOptions} onClose={() => setShowRecordOptions(false)} />
      <PluginEditor plugin={editingPlugin} onParamChange={handlePluginParamChange} onToggle={handleTogglePlugin} onClose={() => { setEditingPlugin(null); setEditingPluginSource(null); }} />
      <BounceDialog visible={showBounce} onClose={() => setShowBounce(false)} projectTitle={projectTitle} duration={duration} tracks={tracks.map(t => ({ id: t.id, name: t.name, muted: t.muted, solo: t.solo, volume: t.volume, pan: t.pan, regions: t.regions }))} />
      <CodeSampler visible={showCodeSampler} onClose={() => setShowCodeSampler(false)} onRender={handleCodeRender} bpm={metronome.bpm} />
      <Tuner visible={showTuner} onClose={() => setShowTuner(false)} />
      <Sampler visible={showSampler} onClose={() => setShowSampler(false)} onAddToTrack={(name) => {
        const trackId = `sampler-${Date.now()}`;
        const newTrack: TrackDef = {
          id: trackId, name, color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
          muted: false, solo: false, volume: 75, pan: 0, sends: {}, sidechainSource: null,
          regions: [{ id: `s-region-${Date.now()}`, start: 0, duration: 30 }], plugins: [], automation: {},
        };
        setTracks([...tracks, newTrack]);
        setSelectedTrackId(trackId);
        setShowSampler(false);
      }} />
      <Synth visible={showSynth} onClose={() => setShowSynth(false)} bpm={metronome.bpm} />
      <Looper visible={showLooper} onClose={() => setShowLooper(false)} bpm={metronome.bpm} onCommitLoop={(slot, bars) => {
        const region: TrackRegion = { id: `loop-${Date.now()}-${slot}`, start: 0, duration: bars * 4 * (60 / metronome.bpm) };
        const trackId = `loop-${Date.now()}`;
        const newTrack: TrackDef = {
          id: trackId, name: `Loop ${slot + 1}`, color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
          muted: false, solo: false, volume: 75, pan: 0, sends: {}, sidechainSource: null,
          regions: [region], plugins: [], automation: {},
        };
        setTracks([...tracks, newTrack]);
        setSelectedTrackId(trackId);
      }} />
      <PianoRoll
        notes={currentMidiNotes}
        onChange={handlePianoRollChange}
        snap="beat"
        numBars={8}
        bpm={metronome.bpm}
        keySignature="C"
        scale="major"
        visible={showPianoRoll}
        onClose={() => { setShowPianoRoll(false); setEditingMidiTrackId(null); }}
        trackName={selectedMidiTrack?.name}
      />
    </View>
  );
}
