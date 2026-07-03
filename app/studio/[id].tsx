import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  setAudioModeAsync,
  RecordingPresets,
} from "expo-audio";
import { renderTracksToUrl, disposeAudioContext } from "../../src/lib/midiSynth";
import { audioSystem } from "../../src/lib/universalAudio";
import { API_BASE_URL } from "../../src/lib/apiUrl";
import { startClock, stopClock, onClockTick, disposeClockManager } from "../../src/lib/clockManager";
import { assignTrackToBus } from "../../src/lib/busRouter";
import { buildAutomationSchedule, interpolateAutomationValue, type ScheduledAutomationPoint } from "../../src/lib/automationEngine";
import {
  Metronome,
  RecordOptions,
  PluginRack,
  MasterRack,
  PluginEditor,
  MixManager,
  WaveformCanvas,
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
  PromptSampler,
  OneKnobProcessor,
  ONE_KNOB_TYPES,
  VisualEQ,
  ChordTrack,
  CommandPalette,
  BranchManager,
  CommitModal,
  OutputSelector,
  VuMeter,
  TrackColorPicker,
} from "../../src/components";
import { registerCommand, initKeyBindings, disposeKeyBindings } from "../../src/lib/commandRegistry";
import { chordsToMIDINotes } from "../../src/lib/harmonicAssistant";
import { useHistory } from "../../src/lib/history";
import { useKeyboardShortcuts } from "../../src/lib/keyboard";
import { saveProject, loadProject } from "../../src/lib/projectStore";
import { parseMidi, midiToTrackRegions } from "../../src/lib/midiParser";
import { getGroupVolume } from "../../src/components/TrackGroup";
import type {
  Plugin,
  MixSnapshot,
  MetronomeSettings,
  RecordSettings,
  TrackDef,
  GroupDef,
  BusDef,
  SendBus,
  TrackAmpChain,
  TrackRegion,
  MIDINote,
} from "../../src/lib/types";
import { EQ_DEFAULT_BANDS } from "../../src/lib/types";
import type { Mood } from "../../src/lib/projectTemplates";
import { useResponsive } from "../../src/lib/responsive";
import {
  MASTERING_CHAIN_PRESETS,
  buildMasteringChain,
} from "../../src/lib/mastering";
import { autoMix, AUTOMIX_GENRES } from "../../src/lib/automix";
import { generateTracksForGenre } from "../../src/lib/projectTemplates";
import { setMasteringInput } from "../../src/lib/masteringBridge";
import type { AutomationPoint } from "../../src/lib/types";
import { pitchShift } from "../../src/lib/timeStretch";
import { audioBufferToWavBlob } from "../../src/lib/audio";
import { useWebAudioPlayer } from "../../src/hooks/useWebAudioPlayer";

type BottomTab = "mixer" | "fx" | "mastering" | "groups" | "buses" | "mixes" | "chords";

function TimeDisplay({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return (
    <Text className="text-white font-mono text-base tracking-wider">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </Text>
  );
}

const GROUP_COLORS = [
  "#ff6482",
  "#5ac8fa",
  "#ffcc00",
  "#34c759",
  "#bf5af2",
  "#ff9f0a",
  "#00d4aa",
];
const TRACK_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-red-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-lime-500",
  "bg-rose-500",
];

type PluginSource = "mastering" | "masterRack" | "track" | null;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

export default function Studio() {
  const {
    id,
    genre: genreParam,
    key: keyParam,
    bpm: bpmParam,
    title: titleParam,
    mood: moodParam,
    numBars: numBarsParam,
    timeSignature: tsParam,
    scratch: scratchParam,
  } = useLocalSearchParams<{
    id: string;
    genre?: string;
    key?: string;
    bpm?: string;
    title?: string;
    mood?: string;
    numBars?: string;
    timeSignature?: string;
    scratch?: string;
  }>();
  const rawMood = Array.isArray(moodParam) ? moodParam[0] : moodParam;
  const allMoods: Mood[] = ["dark", "bright", "warm", "cold", "aggressive", "chill", "epic", "minimal", "nostalgic", "euphoric"];
  const projectMood: Mood | undefined = allMoods.includes(rawMood as Mood) ? (rawMood as Mood) : undefined;
  const router = useRouter();
  const projectTitle =
    (Array.isArray(titleParam) ? titleParam[0] : titleParam) || "Projeto";
  const initialBpm = bpmParam
    ? parseInt(Array.isArray(bpmParam) ? bpmParam[0] : bpmParam, 10) || 120
    : 120;
  const projectKey = Array.isArray(keyParam) ? keyParam[0] : keyParam;
  const initialNumBars = numBarsParam
    ? parseInt(Array.isArray(numBarsParam) ? numBarsParam[0] : numBarsParam, 10) || 8
    : 8;
  const projectTimeSig = Array.isArray(tsParam) ? tsParam[0] : tsParam || "4/4";
  const isScratch = Array.isArray(scratchParam) ? scratchParam[0] : scratchParam === "1";
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const webAudio = useWebAudioPlayer();
  const isWeb = Platform.OS === "web";
  const currentUrlRef = useRef<string | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  useEffect(() => {
    (async () => {
      try {
        const { granted } =
          await AudioModule.requestRecordingPermissionsAsync();
        if (!granted) {
          Alert.alert(
            "Permissão",
            "Permissão para usar o microfone foi negada.",
          );
        }
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      } catch (e) {
        console.warn("Failed to set audio mode:", e);
      }
    })();
    return () => {
      disposeAudioContext();
      disposeClockManager();
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    };
  }, []);

  const resp = useResponsive();

  const [isRecording, setIsRecording] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>("mixer");
  const [showRecordOptions, setShowRecordOptions] = useState(false);
  const [showBounce, setShowBounce] = useState(false);
  const [showSampleBrowser, setShowSampleBrowser] = useState(false);
  const [showCodeSampler, setShowCodeSampler] = useState(false);
  const [showTuner, setShowTuner] = useState(false);
  const [showLooper, setShowLooper] = useState(false);
  const [showSampler, setShowSampler] = useState(false);
  const [showSynth, setShowSynth] = useState(false);
  const [showPromptSampler, setShowPromptSampler] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showBranchManager, setShowBranchManager] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [showOutputSelector, setShowOutputSelector] = useState(false);
  const [colorPickerTrackId, setColorPickerTrackId] = useState<string | null>(null);
  const [oneKnobValues, setOneKnobValues] = useState<
    Record<string, Record<string, number>>
  >({});
  const [chords, setChords] = useState<
    { id: string; degree: number; quality: import("../../src/lib/harmony").ChordQuality; beats: number }[]
  >([]);
  const [showPianoRoll, setShowPianoRoll] = useState(false);
  const [editingMidiTrackId, setEditingMidiTrackId] = useState<string | null>(
    null,
  );
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
  const [editingPluginSource, setEditingPluginSource] =
    useState<PluginSource>(null);
  const [showAutomation, setShowAutomation] = useState<Record<string, boolean>>(
    {},
  );
  const [showPanAutomation, setShowPanAutomation] = useState<Record<string, boolean>>(
    {},
  );
  const [groups, setGroups] = useState<GroupDef[]>([]);
  const [buses, setBuses] = useState<BusDef[]>([]);
  const [sendBuses, setSendBuses] = useState<SendBus[]>([]);
  const [trackAmpChains, setTrackAmpChains] = useState<
    Record<string, TrackAmpChain>
  >({});
  const [trackAssignments, setTrackAssignments] = useState<
    Record<string, string | null>
  >({});
  const [masterPlugins, setMasterPlugins] = useState<Plugin[]>([]);
  const [masteringChain, setMasteringChain] = useState<Plugin[]>(() =>
    buildMasteringChain(MASTERING_CHAIN_PRESETS[0]),
  );
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
  } = useHistory<TrackDef[]>(
    isScratch ? [] : generateTracksForGenre(genreParam || "pop", initialBpm, projectKey, projectMood, initialNumBars, projectTimeSig),
  );

  const [metronome, setMetronome] = useState<MetronomeSettings>({
    bpm: initialBpm,
    timeSig: [4, 4],
    accentInterval: 4,
    volume: 60,
    enabled: true,
    countIn: true,
    countInBars: 2,
  });

  const [currentBeat, setCurrentBeat] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [pitchShiftSemitones, setPitchShiftSemitones] = useState(0);
  const [pitchCorrected, setPitchCorrected] = useState(false);

  const [recordSettings, setRecordSettings] = useState<RecordSettings>({
    armed: false,
    inputSource: "mic",
    quality: "high",
    sampleRate: 48000,
    mono: false,
    preRoll: 2,
  });

  useEffect(() => {
    if (isWeb) webAudio.setPlaybackRate(playbackRate);
    else player.playbackRate = playbackRate;
  }, [playbackRate, player, isWeb, webAudio]);

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
      setBuses(saved.buses ?? []);
      setSendBuses(saved.sendBuses ?? []);
      setTrackAmpChains(saved.trackAmpChains ?? {});
      if (saved.metronome) setMetronome(saved.metronome);
      if (saved.recordSettings) setRecordSettings(saved.recordSettings);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveProject(id, {
        title: projectTitle,
        genre: genreParam || "",
        key: projectKey || "",
        mood: projectMood,
        bpm: metronome.bpm,
        tracks,
        groups,
        buses,
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
      setLastSavedLabel("Salvo");
      saveLabelTimerRef.current = setTimeout(
        () => setLastSavedLabel(null),
        2000,
      );
    }, 2000);
    return () => {
      clearTimeout(timer);
      if (saveLabelTimerRef.current) {
        clearTimeout(saveLabelTimerRef.current);
        saveLabelTimerRef.current = null;
      }
    };
  }, [
    tracks,
    groups,
    trackAssignments,
    masterPlugins,
    masteringChain,
    mixSnapshots,
    activeMixId,
    metronome,
    recordSettings,
    sendBuses,
    buses,
    trackAmpChains,
    id,
    projectTitle,
    genreParam,
    projectKey,
    projectMood,
  ]);

  const isPlaying = isWeb ? webAudio.isPlaying : player.playing;
  const currentTime = isWeb ? webAudio.currentTime : status.currentTime || 0;
  const duration = isWeb ? webAudio.duration : status.duration || 240;
  const anySolo = useMemo(() => tracks.some((t) => t.solo), [tracks]);

  // Pre-compute automation schedules once when automation data changes
  // Uses binary search interpolation per-frame instead of O(n) schedule rebuild
  const automationSchedules = useMemo(() => {
    const schedules = new Map<string, ScheduledAutomationPoint[]>();
    for (const track of tracks) {
      if (track.automation?.volume?.length) {
        schedules.set(track.id, buildAutomationSchedule(track.automation.volume, metronome.bpm));
      }
    }
    return schedules;
  }, [tracks, metronome.bpm]);

  const automatedVolume = useCallback(
    (trackId: string): number => {
      const schedule = automationSchedules.get(trackId);
      if (!schedule) {
        // Fallback: get current track volume directly
        return tracks.find((t) => t.id === trackId)?.volume ?? 70;
      }
      const automated = interpolateAutomationValue(schedule, currentTime);
      return Math.max(0, Math.min(100, automated));
    },
    [automationSchedules, currentTime, tracks],
  );

  useEffect(() => {
    if (isPlaying) {
      startClock(25);
    } else {
      stopClock();
      setCurrentBeat(0);
    }
    return () => {
      if (!isPlaying) stopClock();
    };
  }, [isPlaying]);

  useEffect(() => {
    const unsub = onClockTick((_time, audioTime) => {
      const beatsPerMeasure = projectTimeSig.split("/").map(Number)[0];
      const beat = ((audioTime * metronome.bpm) / 60) % (beatsPerMeasure * 4);
      setCurrentBeat(beat);
    });
    return unsub;
  }, [metronome.bpm, projectTimeSig]);

  const togglePlay = useCallback(async () => {
    const playing = isWeb ? webAudio.isPlaying : player.playing;
    if (playing) {
      if (isWeb) webAudio.pause(); else player.pause();
      return;
    }

    await audioSystem.ensureContext();

    if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    let url = await renderTracksToUrl(tracks, initialBpm, projectMood, buses);
    if (url && pitchCorrected && playbackRate !== 1) {
      const sharedCtx = await audioSystem.ensureContext();
      if (sharedCtx) {
        try {
          const resp = await fetch(url);
          const arrayBuf = await resp.arrayBuffer();
          const audioBuf = await sharedCtx.decodeAudioData(arrayBuf);
          const shifted = await pitchShift(audioBuf, -Math.log2(playbackRate) * 12);
          const offline = new OfflineAudioContext(
            shifted.numberOfChannels,
            shifted.length,
            shifted.sampleRate,
          );
          const source = offline.createBufferSource();
          source.buffer = shifted;
          source.connect(offline.destination);
          source.start();
          const rendered = await offline.startRendering();
          const blob = await audioBufferToWavBlob(rendered);
          const pitchUrl = URL.createObjectURL(blob);
          const originalUrl = url;
          url = pitchUrl;
          URL.revokeObjectURL(originalUrl);
        } catch (e) {
          console.warn("Pitch correction failed, using original:", e);
        }
      }
    }
    if (url) {
      try {
        currentUrlRef.current = url;
        if (isWeb) {
          await webAudio.replace(url);
          await webAudio.play();
        } else {
          await player.replace(url);
          await player.play();
        }
      } catch (e) {
        console.warn("Playback failed:", e);
      }
    }
  }, [player, webAudio, isWeb, tracks, initialBpm, projectMood, buses, pitchCorrected, playbackRate]);

  // Stop playback when studio unmounts
  useEffect(() => () => {
    if (isWeb) webAudio.pause(); else player.pause();
  }, [player, isWeb, webAudio]);

  const toggleRecording = useCallback(async () => {
    try {
      if (!recordSettings.armed) {
        setShowRecordOptions(true);
        return;
      }

      if (isRecording) {
        await audioRecorder.stop();
        const uri = recorderState?.url || audioRecorder.uri || "";
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
            sends: {},
            sidechainSource: null,
            regions: [
              {
                id: `region-${Date.now()}`,
                start: 0,
                duration: Math.max(
                  (recorderState?.durationMillis ?? 0) / 1000,
                  1,
                ),
                url: uri,
              },
            ],
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
          extension: recordSettings.quality === "lossless" ? ".wav" : ".m4a",
        });
        audioRecorder.record();
        setIsRecording(true);
      }
    } catch (e) {
      console.warn("Recording failed:", e);
      Alert.alert("Erro", "Falha ao gravar áudio.");
      setIsRecording(false);
    }
  }, [
    recordSettings.armed,
    isRecording,
    audioRecorder,
    recorderState.durationMillis,
    tracks,
    setTracks,
    recordSettings.sampleRate,
    recordSettings.mono,
    recordSettings.quality,
  ]);

  const rerenderAfterMuteSolo = useCallback(
    async (updatedTracks: TrackDef[]) => {
      try {
        await audioSystem.ensureContext();
        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
        let url = await renderTracksToUrl(updatedTracks, initialBpm, projectMood, buses);
        if (url && pitchCorrected && playbackRate !== 1) {
          const sharedCtx = await audioSystem.ensureContext();
          if (sharedCtx) {
            try {
              const resp = await fetch(url);
              const arrayBuf = await resp.arrayBuffer();
              const audioBuf = await sharedCtx.decodeAudioData(arrayBuf);
              const shifted = await pitchShift(audioBuf, -Math.log2(playbackRate) * 12);
              const offline = new OfflineAudioContext(
                shifted.numberOfChannels,
                shifted.length,
                shifted.sampleRate,
              );
              const source = offline.createBufferSource();
              source.buffer = shifted;
              source.connect(offline.destination);
              source.start();
              const rendered = await offline.startRendering();
              const blob = await audioBufferToWavBlob(rendered);
              const pitchUrl = URL.createObjectURL(blob);
              const originalUrl = url;
              url = pitchUrl;
              URL.revokeObjectURL(originalUrl);
            } catch (e) {
              console.warn("Pitch correction failed in rerender:", e);
            }
          }
        }
        if (url) {
          try {
            currentUrlRef.current = url;
            if (isWeb) {
              await webAudio.replace(url);
              webAudio.seekTo(0);
              await webAudio.play();
            } else {
              await player.replace(url);
              player.currentTime = 0;
              await player.play();
            }
          } catch (e) {
            console.warn("Auto-play after mute/solo failed:", e);
          }
        }
      } catch (e) {
        console.warn("rerenderAfterMuteSolo render failed:", e);
      }
    },
    [player, webAudio, isWeb, initialBpm, projectMood, buses, pitchCorrected, playbackRate],
  );

  const toggleMute = useCallback(
    (trackId: string) => {
      const updated = tracks.map((t) =>
        t.id === trackId ? { ...t, muted: !t.muted } : t,
      );
      setTracks(updated);
      rerenderAfterMuteSolo(updated).catch((e) =>
        console.warn("toggleMute rerender failed:", e),
      );
    },
    [tracks, setTracks, rerenderAfterMuteSolo],
  );

  const toggleSolo = useCallback(
    (trackId: string) => {
      const updated = tracks.map((t) =>
        t.id === trackId ? { ...t, solo: !t.solo } : t,
      );
      setTracks(updated);
      rerenderAfterMuteSolo(updated).catch((e) =>
        console.warn("toggleSolo rerender failed:", e),
      );
    },
    [tracks, setTracks, rerenderAfterMuteSolo],
  );

  const deleteTrack = useCallback(
    (trackId: string) => {
      setTracks(tracks.filter((t) => t.id !== trackId));
      if (selectedTrackId === trackId) setSelectedTrackId(null);
    },
    [tracks, setTracks, selectedTrackId],
  );

  const setTrackVolume = useCallback(
    (trackId: string, vol: number) => {
      setTracks(
        tracks.map((t) => (t.id === trackId ? { ...t, volume: vol } : t)),
      );
    },
    [tracks, setTracks],
  );

  const setTrackPan = useCallback(
    (trackId: string, pan: number) => {
      setTracks(tracks.map((t) => (t.id === trackId ? { ...t, pan } : t)));
    },
    [tracks, setTracks],
  );

  const setTrackColor = useCallback(
    (trackId: string, color: string) => {
      setTracks(tracks.map((t) => (t.id === trackId ? { ...t, color } : t)));
    },
    [tracks, setTracks],
  );

  const setTrackSend = useCallback(
    (trackId: string, busId: string, value: number) => {
      setTracks(
        tracks.map((t) =>
          t.id === trackId
            ? { ...t, sends: { ...t.sends, [busId]: value } }
            : t,
        ),
      );
    },
    [tracks, setTracks],
  );

  const setTrackSidechain = useCallback(
    (trackId: string, sourceId: string | null) => {
      setTracks(
        tracks.map((t) =>
          t.id === trackId ? { ...t, sidechainSource: sourceId } : t,
        ),
      );
    },
    [tracks, setTracks],
  );

  const setTrackOutput = useCallback(
    (trackId: string, outputId: string | null) => {
      setTracks(
        tracks.map((t) =>
          t.id === trackId ? { ...t, outputId } : t,
        ),
      );
    },
    [tracks, setTracks],
  );

  const trackVolume = (trackId: string) =>
    tracks.find((t) => t.id === trackId)?.volume ?? 70;

  const isAudible = (track: TrackDef) => {
    if (anySolo) return track.solo;
    const groupVol = getGroupVolume(groups, track.id);
    if (groupVol?.muted) return false;
    return !track.muted;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const selectedTrack = useMemo(
    () => tracks.find((t) => t.id === selectedTrackId) || null,
    [tracks, selectedTrackId],
  );

  const updateTrackPlugins = useCallback(
    (trackId: string, plugins: Plugin[]) => {
      setTracks(tracks.map((t) => (t.id === trackId ? { ...t, plugins } : t)));
    },
    [tracks, setTracks],
  );

  const updateAutomation = useCallback(
    (trackId: string, param: string, points: AutomationPoint[]) => {
      setTracks(
        tracks.map((t) =>
          t.id === trackId
            ? { ...t, automation: { ...t.automation, [param]: points } }
            : t,
        ),
      );
    },
    [tracks, setTracks],
  );

  const handleSaveMix = useCallback(
    (name: string) => {
      const snapshot: MixSnapshot = {
        id: `mix-${Date.now()}`,
        name,
        created: Date.now(),
        trackVolumes: Object.fromEntries(tracks.map((t) => [t.id, t.volume])),
        trackPans: Object.fromEntries(tracks.map((t) => [t.id, t.pan])),
        trackSends: Object.fromEntries(tracks.map((t) => [t.id, t.sends])),
        trackMutes: Object.fromEntries(tracks.map((t) => [t.id, t.muted])),
        trackSolos: Object.fromEntries(tracks.map((t) => [t.id, t.solo])),
        plugins: Object.fromEntries(tracks.map((t) => [t.id, t.plugins])),
      };
      setMixSnapshots((prev) => [...prev, snapshot]);
      setActiveMixId(snapshot.id);
    },
    [tracks],
  );

  const handleLoadMix = useCallback(
    (snapId: string) => {
      const snap = mixSnapshots.find((s) => s.id === snapId);
      if (!snap) return;
      setTracks(
        tracks.map((t) => ({
          ...t,
          volume: snap.trackVolumes[t.id] ?? t.volume,
          pan: snap.trackPans[t.id] ?? t.pan,
          sends: snap.trackSends[t.id] ?? t.sends,
          muted: snap.trackMutes[t.id] ?? t.muted,
          solo: snap.trackSolos[t.id] ?? t.solo,
          plugins: snap.plugins[t.id] ?? t.plugins,
        })),
      );
      setActiveMixId(snapId);
    },
    [mixSnapshots, setTracks, tracks],
  );

  const handleDeleteMix = useCallback(
    (snapId: string) => {
      setMixSnapshots((prev) => prev.filter((s) => s.id !== snapId));
      if (activeMixId === snapId) setActiveMixId(undefined);
    },
    [activeMixId],
  );

  const handleCompareMix = useCallback(
    (idA: string, idB: string) => {
      const snapA = mixSnapshots.find((s) => s.id === idA);
      const snapB = mixSnapshots.find((s) => s.id === idB);
      if (!snapA || !snapB) return;
      const diffTracks = tracks.filter((t) => {
        const vA = snapA.trackVolumes[t.id];
        const vB = snapB.trackVolumes[t.id];
        return (
          vA !== vB ||
          snapA.trackMutes[t.id] !== snapB.trackMutes[t.id] ||
          snapA.trackPans[t.id] !== snapB.trackPans[t.id] ||
          snapA.trackSends[t.id] !== snapB.trackSends[t.id]
        );
      });
      const msg = diffTracks
        .map((t) => {
          const vA = snapA.trackVolumes[t.id] ?? 0;
          const vB = snapB.trackVolumes[t.id] ?? 0;
          const pA = snapA.trackPans[t.id] ?? 0;
          const pB = snapB.trackPans[t.id] ?? 0;
          const sA = JSON.stringify(snapA.trackSends[t.id] ?? {});
          const sB = JSON.stringify(snapB.trackSends[t.id] ?? {});
          return `${t.name}: vol ${vA}%→${vB}% | pan ${pA}→${pB} | send ${sA}→${sB}`;
        })
        .join("\n");
      Alert.alert(
        `A/B — ${snapA.name} vs ${snapB.name}`,
        `${msg || "Nenhuma diferença"} (vol/mute/pan/send)`,
      );
    },
    [tracks, mixSnapshots],
  );

  const handlePluginParamChange = useCallback(
    (pluginId: string, paramId: string, value: number) => {
      const updateChain = (chain: Plugin[]) =>
        chain.map((p) =>
          p.id === pluginId
            ? { ...p, params: { ...p.params, [paramId]: value } }
            : p,
        );
      if (editingPluginSource === "mastering") {
        setMasteringChain((prev) => updateChain(prev));
      } else if (editingPluginSource === "masterRack") {
        setMasterPlugins((prev) => updateChain(prev));
      } else if (editingPluginSource === "track" && selectedTrack) {
        setTracks(
          tracks.map((t) =>
            t.id === selectedTrack.id
              ? { ...t, plugins: updateChain(t.plugins) }
              : t,
          ),
        );
      }
    },
    [editingPluginSource, selectedTrack, setTracks, tracks],
  );

  const handleTogglePlugin = useCallback(
    (pluginId: string) => {
      const toggleChain = (chain: Plugin[]) =>
        chain.map((p) =>
          p.id === pluginId ? { ...p, enabled: !p.enabled } : p,
        );
      if (editingPluginSource === "mastering") {
        setMasteringChain((prev) => toggleChain(prev));
      } else if (editingPluginSource === "masterRack") {
        setMasterPlugins((prev) => toggleChain(prev));
      } else if (editingPluginSource === "track" && selectedTrack) {
        setTracks(
          tracks.map((t) =>
            t.id === selectedTrack.id
              ? { ...t, plugins: toggleChain(t.plugins) }
              : t,
          ),
        );
      }
    },
    [editingPluginSource, selectedTrack, setTracks, tracks],
  );

  const handleLoadMasteringPreset = useCallback((index: number) => {
    const preset = MASTERING_CHAIN_PRESETS[index];
    if (!preset) return;
    setMasteringChain(buildMasteringChain(preset));
  }, []);

  const handleManualSave = useCallback(() => {
    saveProject(id, {
      title: projectTitle,
      genre: genreParam || "",
      key: projectKey || "",
      mood: projectMood,
      bpm: metronome.bpm,
      tracks: tracks as TrackDef[],
      groups,
      buses,
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
    setLastSavedLabel("Salvo ✓");
    setTimeout(() => setLastSavedLabel(null), 2000);
  }, [
    tracks,
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
    id,
    projectTitle,
    genreParam,
    projectKey,
  ]);

  const handleAddSample = useCallback(
    (sample: {
      id: string;
      name: string;
      category: string;
      color: string;
      duration: number;
    }) => {
      const trackId = `sample-${Date.now()}`;
      const newTrack: TrackDef = {
        id: trackId,
        name: sample.name,
        color: sample.color,
        muted: false,
        solo: false,
        volume: 75,
        pan: 0,
        sends: {},
        sidechainSource: null,
        regions: [
          {
            id: `region-${Date.now()}`,
            start: 0,
            duration: Math.max(sample.duration * 10, 40),
          },
        ],
        plugins: [],
        automation: {},
      };
      setTracks([...tracks, newTrack]);
    },
    [tracks, setTracks],
  );

  const handleAddTrack = useCallback(() => {
    const trackId = `track-${Date.now()}`;
    const name = `Track ${tracks.length + 1}`;
    const busId = assignTrackToBus(name);
    const newTrack: TrackDef = {
      id: trackId,
      name,
      color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
      muted: false,
      solo: false,
      volume: 75,
      pan: 0,
      sends: {},
      sidechainSource: null,
      outputId: busId,
      regions: [{ id: `region-${Date.now()}`, start: 0, duration: 80 }],
      plugins: [],
      automation: {},
    };
    setTracks([...tracks, newTrack]);
    setSelectedTrackId(trackId);
  }, [tracks, setTracks]);

  const handleAddMidiTrack = useCallback(() => {
    const trackId = `midi-${Date.now()}`;
    const name = `MIDI ${tracks.length + 1}`;
    const busId = assignTrackToBus("synth");
    const newTrack: TrackDef = {
      id: trackId,
      name,
      color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
      muted: false,
      solo: false,
      volume: 75,
      pan: 0,
      sends: {},
      sidechainSource: null,
      outputId: busId,
      regions: [],
      midiNotes: [],
      plugins: [],
      automation: {},
    };
    setTracks([...tracks, newTrack]);
    setSelectedTrackId(trackId);
  }, [tracks, setTracks]);

  const handleImportAudio = useCallback(() => {
    if (Platform.OS !== "web") {
      Alert.alert("Importar", "Importação disponível apenas na versão web.");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".wav,.mp3,.aiff,.flac,.ogg,.m4a,audio/*";
    input.multiple = true;
    input.onchange = (e: Event) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      const newTracks = Array.from(files).map((file, i) => {
        const approxDuration = Math.max(10, Math.round(file.size / 30000));
        return {
          id: `import-${Date.now()}-${i}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          color: TRACK_COLORS[(tracks.length + i) % TRACK_COLORS.length],
          muted: false,
          solo: false,
          volume: 75,
          pan: 0,
          sends: {},
          sidechainSource: null,
          regions: [
            {
              id: `region-import-${Date.now()}-${i}`,
              start: i * 4,
              duration: Math.min(approxDuration, 300),
            },
          ],
          plugins: [] as Plugin[],
          automation: {} as Record<string, AutomationPoint[]>,
        } as TrackDef;
      });
      setTracks([...tracks, ...newTracks]);
    };
    input.click();
  }, [tracks, setTracks]);

  const handleCodeRender = useCallback(
    (
      patterns: { name: string; tokens: string[]; unit: string; bpm: number }[],
    ) => {
      const stepSeconds = (unit: string, bpm: number) =>
        unit === "1/4" ? 60 / bpm : unit === "1/8" ? 30 / bpm : 15 / bpm;

      const newTracks: TrackDef[] = patterns.map((pattern, pi) => {
        const step = stepSeconds(pattern.unit, pattern.bpm);
        const tokens = pattern.tokens as string[];
        const regions: TrackRegion[] = [];
        let currentStart = 0;
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i] === "REST") {
            currentStart += step;
            continue;
          }
          const dur = tokens[i] === "BASS" ? step * 2 : step * 0.9;
          regions.push({
            id: `code-${Date.now()}-${pi}-${i}`,
            start: currentStart,
            duration: dur,
          });
          currentStart += step;
        }
        return {
          id: `code-${Date.now()}-${pi}`,
          name: pattern.name + (patterns.length > 1 ? ` ${pi + 1}` : ""),
          color: TRACK_COLORS[(tracks.length + pi) % TRACK_COLORS.length],
          muted: false,
          solo: false,
          volume: 75,
          pan: 0,
          sends: {},
          sidechainSource: null,
          regions,
          plugins: [] as Plugin[],
          automation: {} as Record<string, AutomationPoint[]>,
        } as TrackDef;
      });
      setTracks([...tracks, ...newTracks]);
    },
    [tracks, setTracks],
  );

  const handlePromptMidiRender = useCallback(
    async (data: { prompt: string; bpm: number; key: string }) => {
      try {
        const apiBase = API_BASE_URL || (process.env.EXPO_PUBLIC_API_URL as string) || "";
        const response = await fetch(
          `${apiBase}/api/generate-midi`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );

        if (!response.ok) throw new Error(`Failed to generate MIDI (${response.status}): ${await response.text()}`);

        const result = await response.json();

        const trackId = `gen-${Date.now()}`;
        const newTrack: TrackDef = {
          id: trackId,
          name: `Gen: ${data.prompt}`,
          color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
          muted: false,
          solo: false,
          volume: 80,
          pan: 0,
          sends: {},
          sidechainSource: null,
          regions: result.midiData.map((n: { start: number; duration: number; note: number }) => ({
            id: `reg-${Date.now()}-${n.start}`,
            start: n.start * (60 / result.bpm),
            duration: n.duration * (60 / result.bpm),
          })),
          midiNotes: result.midiData.map((n: { start: number; duration: number; note: number }) => ({
            pitch: n.note,
            start: n.start,
            duration: n.duration,
            velocity: 100,
          })),
          plugins: [],
          automation: {},
        };

        setTracks([...tracks, newTrack]);
        setSelectedTrackId(trackId);
      } catch (err) {
        console.warn("MIDI generation failed:", err);
        Alert.alert("Erro", "Falha ao gerar MIDI.");
      }
    },
    [tracks, setTracks],
  );

  const handleMidiImport = useCallback(() => {
    if (Platform.OS !== "web") {
      Alert.alert("MIDI", "Importação MIDI disponível apenas na versão web.");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".mid,.midi,audio/midi";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (!result || typeof result === "string") return;
        const midi = parseMidi(result as ArrayBuffer);
        if (!midi) {
          Alert.alert("Erro", "Não foi possível ler o arquivo MIDI.");
          return;
        }
        const newTracks: TrackDef[] = midi.tracks.map((trk, ti) => ({
          id: `midi-${Date.now()}-${ti}`,
          name: `${trk.name} (${trk.instrument})`,
          color: TRACK_COLORS[(tracks.length + ti) % TRACK_COLORS.length],
          muted: false,
          solo: false,
          volume: 75,
          pan: 0,
          sends: {},
          sidechainSource: null,
          regions: midiToTrackRegions(
            trk,
            midi.bpm,
            midi.ticksPerQuarter,
            midi.smpteFps,
            midi.ticksPerFrame,
          ),
          midiNotes: trk.notes.map((n) => ({
            pitch: n.note,
            start: n.start / midi.ticksPerQuarter,
            duration: n.duration / midi.ticksPerQuarter,
            velocity: n.velocity,
          })),
          plugins: [] as Plugin[],
          automation: {} as Record<string, AutomationPoint[]>,
        }));
        setTracks([...tracks, ...newTracks]);
        Alert.alert(
          "MIDI Importado",
          `${newTracks.length} faixas criadas de "${file.name}" (${midi.bpm} BPM)`,
        );
      };
      reader.onerror = () => {
        Alert.alert("Erro", "Falha ao ler o arquivo MIDI.");
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  }, [tracks, setTracks]);

  const selectedMidiTrack = useMemo(() => {
    if (!editingMidiTrackId) return null;
    return tracks.find((t) => t.id === editingMidiTrackId) || null;
  }, [tracks, editingMidiTrackId]);

  const currentMidiNotes: MIDINote[] = useMemo(() => {
    return selectedMidiTrack?.midiNotes || [];
  }, [selectedMidiTrack]);

  function midiNotesToRegions(notes: MIDINote[], bpm: number): TrackRegion[] {
    if (notes.length === 0) return [];
    const safeBpm = Math.max(1, bpm);
    const minBeat = Math.min(...notes.map((n) => n.start));
    return notes.map((n, i) => ({
      id: `midi-${n.pitch}-${i}-${Date.now()}`,
      start: (n.start - minBeat) * (60 / safeBpm),
      duration: Math.max(n.duration * (60 / safeBpm), 0.5),
    }));
  }

  const handleOpenPianoRoll = useCallback((trackId: string) => {
    setEditingMidiTrackId(trackId);
    setShowPianoRoll(true);
  }, []);

  const handlePianoRollChange = useCallback(
    (notes: MIDINote[]) => {
      if (!editingMidiTrackId) return;
      setTracks(
        tracks.map((t) => {
          if (t.id !== editingMidiTrackId) return t;
          return {
            ...t,
            midiNotes: notes,
            regions: midiNotesToRegions(notes, metronome.bpm),
          };
        }),
      );
    },
    [editingMidiTrackId, tracks, setTracks, metronome.bpm],
  );

  const shortcuts = useMemo(
    () => ({
      play: togglePlay,
      record: toggleRecording,
      undo: undoHistory,
      redo: redoHistory,
      save: handleManualSave,
      bounce: () => setShowBounce(true),
      escape: () => {
        setEditingPlugin(null);
        setShowRecordOptions(false);
        setShowBounce(false);
        setShowSampleBrowser(false);
        setShowCodeSampler(false);
        setShowTuner(false);
        setShowLooper(false);
        setShowSampler(false);
        setShowSynth(false);
        setShowPianoRoll(false);
        setShowCommandPalette(false);
        setShowBranchManager(false);
        setShowCommitModal(false);
        setEditingMidiTrackId(null);
      },
      toggleMute: selectedTrack
        ? () => toggleMute(selectedTrack.id)
        : undefined,
      toggleSolo: selectedTrack
        ? () => toggleSolo(selectedTrack.id)
        : undefined,
      delete: selectedTrack ? () => deleteTrack(selectedTrack.id) : undefined,
    }),
    [
      togglePlay,
      toggleRecording,
      undoHistory,
      redoHistory,
      handleManualSave,
      selectedTrack,
      toggleMute,
      toggleSolo,
      deleteTrack,
    ],
  );

  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    registerCommand("transport.play", "Play", "Start/stop playback", "Transport", togglePlay, "Space");
    registerCommand("transport.record", "Record", "Toggle recording", "Transport", toggleRecording, "R");
    registerCommand("edit.undo", "Undo", "Undo last action", "Edit", undoHistory, "Ctrl+Z");
    registerCommand("edit.redo", "Redo", "Redo last action", "Edit", redoHistory, "Ctrl+Shift+Z");
    registerCommand("edit.delete", "Delete", "Delete selected track", "Edit", () => selectedTrack && deleteTrack(selectedTrack.id), "Delete", "Backspace");
    registerCommand("track.add", "Add Track", "Add a new track to the project", "Track", handleAddTrack, "Ctrl+T");
    registerCommand("track.mute", "Mute Track", "Toggle mute on selected track", "Track", () => selectedTrack && toggleMute(selectedTrack.id));
    registerCommand("track.solo", "Solo Track", "Toggle solo on selected track", "Track", () => selectedTrack && toggleSolo(selectedTrack.id));
    registerCommand("mixer.open", "Open Mixer", "Switch to mixer view", "View", () => setBottomTab("mixer"), "Ctrl+M");
    registerCommand("file.save", "Save", "Save current project", "File", handleManualSave, "Ctrl+S");
    registerCommand("file.export", "Export", "Open export/bounce dialog", "File", () => setShowBounce(true), "Ctrl+Shift+E");
    registerCommand("file.branch", "Branch Manager", "Open project branching", "File", () => setShowBranchManager(true), "Ctrl+B");
    registerCommand("file.commit", "Commit Changes", "Open commit modal", "File", () => setShowCommitModal(true), "Ctrl+Shift+C");
    registerCommand("view.browser", "Sample Browser", "Toggle sample browser", "View", () => setShowSampleBrowser((p) => !p), "Ctrl+I");
    registerCommand("palette.toggle", "Command Palette", "Open command palette", "System", () => setShowCommandPalette(true), "Ctrl+K");
    initKeyBindings();
    return () => {
      disposeKeyBindings();
    };
  }, [togglePlay, toggleRecording, undoHistory, redoHistory, handleManualSave, selectedTrack, toggleMute, toggleSolo, deleteTrack, handleAddTrack, setBottomTab, setShowBounce, setShowBranchManager, setShowCommitModal, setShowSampleBrowser, setShowCommandPalette]);

  const getEffectiveVolume = useCallback((trackId: string): number => {
    const gv = getGroupVolume(groups, trackId);
    const tv = tracks.find((t) => t.id === trackId)?.volume ?? 70;
    const baseVol = isPlaying ? automatedVolume(trackId) : tv;
    return gv ? Math.round(baseVol * (gv.volume / 100)) : baseVol;
  }, [groups, isPlaying, automatedVolume, tracks]);

  const bottomTabs: { key: BottomTab; label: string; icon: string }[] = [
    { key: "mixer", label: "Mixer", icon: "◉" },
    { key: "fx", label: "FX", icon: "✦" },
    { key: "mastering", label: "Master", icon: "♛" },
    { key: "groups", label: "Grupos", icon: "◈" },
    { key: "buses", label: "Buses", icon: "⏚" },
    { key: "mixes", label: "Mixes", icon: "☰" },
    { key: "chords", label: "Chords", icon: "♪" },
  ];

  return (
    <View className="flex-1 bg-dark-bg select-none">
      <View
        className={`${resp.isMobile ? "h-12 px-2" : "h-14 px-4"} bg-dark-surface border-b border-dark-border flex-row items-center justify-between`}
      >
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => player && (player.currentTime = Math.max(0, player.currentTime - 5))}
            className="w-8 h-8 rounded-lg bg-dark-muted items-center justify-center active:opacity-70"
          >
            <Text className="text-gray-300 text-xs">⏮</Text>
          </Pressable>
          <Pressable
            onPress={togglePlay}
            className={`w-11 h-11 rounded-full items-center justify-center ${isPlaying ? "bg-green-600" : "bg-dark-border"}`}
          >
            <Text className="text-white text-lg">{isPlaying ? "⏸" : "▶"}</Text>
          </Pressable>
          <Pressable
            onPress={toggleRecording}
            className={`w-11 h-11 rounded-full items-center justify-center ${isRecording ? "bg-red-600" : recordSettings.armed ? "bg-red-500/30" : "bg-dark-border"}`}
          >
            <View
              className={`w-4 h-4 rounded-sm ${isRecording ? "bg-white" : "bg-red-500"}`}
            />
          </Pressable>
          <Pressable
            onPress={() => player && (player.currentTime = Math.max(0, player.currentTime + 5))}
            className="w-8 h-8 rounded-lg bg-dark-muted items-center justify-center active:opacity-70"
          >
            <Text className="text-gray-300 text-xs">⏭</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (player) player.currentTime = 0;
            }}
            className="w-8 h-8 rounded-lg bg-dark-muted items-center justify-center active:opacity-70"
          >
            <Text className="text-gray-300 text-xs">⏹</Text>
          </Pressable>
        </View>

        {/* Time display */}
        <View className="flex-row items-center gap-2">
          <Text className="text-gray-400 text-xs font-mono">
            {formatTime(player?.currentTime ?? 0)}
          </Text>
          <Text className="text-gray-600 text-xs">/</Text>
          <Text className="text-gray-500 text-xs font-mono">
            {formatTime(progressPct > 0 ? (player?.currentTime ?? 0) / progressPct : 0)}
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          <Pressable
            onPress={undoHistory}
            className={`w-8 h-8 rounded-lg items-center justify-center ${canUndo ? "bg-dark-muted active:opacity-70" : "opacity-30"}`}
          >
            <Text className="text-gray-300 text-xs">↩</Text>
          </Pressable>
          <Pressable
            onPress={redoHistory}
            className={`w-8 h-8 rounded-lg items-center justify-center ${canRedo ? "bg-dark-muted active:opacity-70" : "opacity-30"}`}
          >
            <Text className="text-gray-300 text-xs">↪</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-3">
          <Metronome
            settings={metronome}
            onChange={setMetronome}
            isPlaying={isPlaying}
          />
          <MixManager
            snapshots={mixSnapshots}
            activeMixId={activeMixId}
            onSave={handleSaveMix}
            onLoad={handleLoadMix}
            onDelete={handleDeleteMix}
            onCompare={handleCompareMix}
          />
          <Pressable
            onPress={() => setShowTuner(true)}
            className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted"
          >
            <Text className="text-gray-300 text-xs">🎵</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowCommandPalette(true)}
            className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted active:opacity-70"
          >
            <Text className="text-gray-300 text-xs">⌘</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowBranchManager(true)}
            className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted active:opacity-70"
          >
            <Text className="text-gray-300 text-xs">⎇</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowCommitModal(true)}
            className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted active:opacity-70"
          >
            <Text className="text-gray-300 text-xs">✓</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowSampler(true)}
            className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted active:opacity-70"
          >
            <Text className="text-gray-300 text-xs">🎛️</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowSynth(true)}
            className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted active:opacity-70"
          >
            <Text className="text-gray-300 text-xs">🎹</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowOutputSelector(true)}
            className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted active:opacity-70"
          >
            <Text className="text-gray-300 text-xs">🔊</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowLooper(true)}
            className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted active:opacity-70"
          >
            <Text className="text-gray-300 text-xs">🔁</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowCodeSampler(true)}
            className="w-8 h-8 rounded-lg bg-dark-muted items-center justify-center active:opacity-70"
          >
            <Text className="text-gray-400 text-xs">⌨</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowPromptSampler(true)}
            className="w-8 h-8 rounded-lg bg-brand-accent/20 items-center justify-center active:opacity-70"
          >
            <Text className="text-brand-accent text-xs">✨</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowSampleBrowser((prev) => !prev)}
            className={`w-8 h-8 rounded-lg items-center justify-center ${showSampleBrowser ? "bg-brand-accent/30 border border-brand-accent" : "bg-dark-muted active:opacity-70"}`}
          >
            <Text
              className={`text-xs ${showSampleBrowser ? "text-brand-accent" : "text-gray-400"}`}
            >
              📂
            </Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2">
          <TimeDisplay seconds={currentTime} />
          <Text className="text-gray-600">/</Text>
          <TimeDisplay seconds={duration} />
          {isPlaying && (
            <Text className="text-gray-500 text-[9px] font-mono ml-1">
              ♩{Math.floor(currentBeat) + 1}
            </Text>
          )}
        </View>

        <View className="flex-row items-center gap-0.5 bg-dark-bg/40 rounded-lg px-1.5 py-1 border border-dark-border/30">
          <Text className="text-gray-600 text-[9px] font-bold mr-0.5">⟳</Text>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
            <Pressable
              key={rate}
              onPress={() => setPlaybackRate(rate)}
              className={`px-1.5 py-0.5 rounded ${Math.abs(playbackRate - rate) < 0.01 ? "bg-brand-accent/20 border border-brand-accent/40" : "bg-dark-muted/30"}`}
            >
              <Text
                className={`text-[10px] font-mono ${Math.abs(playbackRate - rate) < 0.01 ? "text-brand-accent font-semibold" : "text-gray-500"}`}
              >
                {rate}x
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row items-center gap-0.5 bg-dark-bg/40 rounded-lg px-1.5 py-1 border border-dark-border/30">
          <Pressable
            onPress={() => setPitchCorrected(!pitchCorrected)}
            className={`px-1.5 py-0.5 rounded ${pitchCorrected ? "bg-brand-accent/20 border border-brand-accent/40" : "bg-dark-muted/30"}`}
          >
            <Text
              className={`text-[9px] font-bold ${pitchCorrected ? "text-brand-accent" : "text-gray-500"}`}
            >
              ♪
            </Text>
          </Pressable>
          {[-12, -7, -5, -1, 0, 1, 5, 7, 12].map((semi) => (
            <Pressable
              key={semi}
              onPress={() => setPitchShiftSemitones(semi)}
              className={`px-1 py-0.5 rounded ${Math.abs(pitchShiftSemitones - semi) < 0.01 ? "bg-brand-accent/20 border border-brand-accent/40" : "bg-dark-muted/30"}`}
            >
              <Text
                className={`text-[9px] font-mono ${Math.abs(pitchShiftSemitones - semi) < 0.01 ? "text-brand-accent font-semibold" : "text-gray-500"}`}
              >
                {semi === 0 ? "0" : semi > 0 ? `+${semi}` : semi}
              </Text>
            </Pressable>
          ))}
        </View>

        {projectKey && genreParam && (
          <View className="bg-dark-muted px-2.5 py-1 rounded-lg border border-dark-border items-center">
            <Text className="text-gray-500 text-[8px] font-bold tracking-wider">
              {genreParam.toUpperCase()}
            </Text>
            <Text className="text-gray-300 font-mono text-[11px]">
              {projectKey}
            </Text>
          </View>
        )}

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setShowBounce(true)}
            className="w-8 h-8 rounded-lg bg-dark-muted items-center justify-center active:opacity-70"
          >
            <Text className="text-gray-400 text-xs">📦</Text>
          </Pressable>
          {lastSavedLabel && (
            <Text className="text-gray-500 text-[10px] font-medium">
              {lastSavedLabel}
            </Text>
          )}
          <Pressable
            onPress={handleManualSave}
            className="bg-brand-primary px-5 py-2 rounded-xl active:opacity-80"
          >
            <Text className="text-white font-bold text-sm">Salvar</Text>
          </Pressable>
        </View>
      </View>

      <View className="h-10 bg-dark-surface/50 border-b border-dark-border flex-row items-center px-4">
        <View style={{ width: resp.tracksSidebarWidth }} className="pr-2">
          <Text className="text-gray-500 text-[10px] font-bold tracking-wider">
            TRACKS
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-1"
        >
          <View className="flex-row items-center" style={{ width: 1200 }}>
            {Array.from({ length: 25 }, (_, i) => (
              <View key={i} className="flex-row" style={{ width: 48 }}>
                <Text className="text-gray-600 font-mono text-[10px]">
                  {String(Math.floor((i * 2) / 60)).padStart(2, "0")}:
                  {String((i * 2) % 60).padStart(2, "0")}
                </Text>
                {i % 4 === 0 && (
                  <View className="w-px h-3 bg-gray-700 absolute right-0" />
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View className="flex-1 flex-row">
        <View
          style={{ width: resp.tracksSidebarWidth }}
          className="bg-dark-bg/80 border-r border-dark-border"
        >
          {tracks.map((track) => {
            const gv = getGroupVolume(groups, track.id);
            const trackH = resp.isMobile ? 80 : resp.isDesktop ? 104 : 80;
            return (
              <View key={track.id} className="relative">
                <Pressable
                  onPress={() =>
                    setSelectedTrackId(
                      track.id === selectedTrackId ? null : track.id,
                    )
                  }
                  className={`p-2 border-b border-dark-border justify-between bg-dark-surface/30 ${
                    selectedTrackId === track.id
                      ? "border-l-2 border-brand-accent bg-dark-elevated/50"
                      : ""
                  }`}
                  style={{ height: trackH }}
                >
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-gray-200 text-xs font-semibold truncate flex-1">
                      {track.name}
                    </Text>
                    <View className="h-8">
                      <VuMeter
                        level={track.volume / 100}
                        peakLevel={isAudible(track) ? Math.min(1, track.volume / 100 + Math.random() * 0.05) : 0}
                      />
                    </View>
                  </View>
                  <View className="flex-row items-center gap-1 mt-0.5">
                    {track.plugins
                      .filter((p) => p.enabled)
                      .slice(0, 3)
                      .map((p) => (
                        <View
                          key={p.id}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                      ))}
                    {gv && (
                      <View className="w-3 h-1.5 rounded-full bg-gray-600" />
                    )}
                  </View>
                  <View className="flex-row gap-1.5 mt-1">
                    <Pressable
                      onPress={() =>
                        setColorPickerTrackId(
                          colorPickerTrackId === track.id ? null : track.id,
                        )
                      }
                      className={`w-7 h-7 rounded items-center justify-center border ${track.color} border-dark-border`}
                    />
                    <Pressable
                      onPress={() => toggleMute(track.id)}
                      className={`w-7 h-7 rounded items-center justify-center border ${track.muted ? "bg-amber-500 border-amber-400" : "bg-dark-muted/40 border-dark-border"}`}
                    >
                      <Text
                        className={`text-xs font-bold ${track.muted ? "text-white" : "text-gray-400"}`}
                      >
                        M
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => toggleSolo(track.id)}
                      className={`w-7 h-7 rounded items-center justify-center border ${track.solo ? "bg-green-500 border-green-400" : "bg-dark-muted/40 border-dark-border"}`}
                    >
                      <Text
                        className={`text-xs font-bold ${track.solo ? "text-white" : "text-gray-400"}`}
                      >
                        S
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setShowAutomation((prev) => ({
                          ...prev,
                          [track.id]: !prev[track.id],
                        }))
                      }
                      className={`w-7 h-7 rounded items-center justify-center border ${showAutomation[track.id] ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-muted/40 border-dark-border"}`}
                    >
                      <Text
                        className={`text-xs font-bold ${showAutomation[track.id] ? "text-brand-accent" : "text-gray-400"}`}
                      >
                      V
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setShowPanAutomation((prev) => ({
                        ...prev,
                        [track.id]: !prev[track.id],
                      }))
                    }
                    className={`w-7 h-7 rounded items-center justify-center border ${showPanAutomation[track.id] ? "bg-brand-accent/20 border-brand-accent" : "bg-dark-muted/40 border-dark-border"}`}
                  >
                    <Text
                      className={`text-xs font-bold ${showPanAutomation[track.id] ? "text-brand-accent" : "text-gray-400"}`}
                    >
                      P
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleOpenPianoRoll(track.id)}
                    className="w-7 h-7 rounded items-center justify-center border bg-dark-muted/40 border-dark-border"
                  >
                    <Text className="text-xs text-brand-accent font-bold">
                      🎹
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
              <TrackColorPicker
                visible={colorPickerTrackId === track.id}
                currentColor={track.color}
                onSelect={(color) => setTrackColor(track.id, color)}
                onClose={() => setColorPickerTrackId(null)}
              />
            </View>
            );
          })}
          <View className="p-1.5 gap-1 border-t border-dark-border bg-dark-surface/20">
            <Pressable
              onPress={handleAddTrack}
              className="h-8 rounded-lg bg-dark-muted items-center justify-center flex-row gap-1 active:opacity-70"
            >
              <Text className="text-gray-300 text-xs font-bold">+</Text>
              <Text className="text-gray-300 text-[10px] font-semibold">
                Track
              </Text>
            </Pressable>
            <Pressable
              onPress={handleImportAudio}
              className="h-8 rounded-lg bg-dark-muted items-center justify-center flex-row gap-1 active:opacity-70"
            >
              <Text className="text-gray-300 text-xs">📁</Text>
              <Text className="text-gray-300 text-[10px] font-semibold">
                Audio
              </Text>
            </Pressable>
            <Pressable
              onPress={handleAddMidiTrack}
              className="h-8 rounded-lg bg-dark-muted items-center justify-center flex-row gap-1 active:opacity-70"
            >
              <Text className="text-gray-300 text-xs">🎹</Text>
              <Text className="text-gray-300 text-[10px] font-semibold">
                MIDI
              </Text>
            </Pressable>
            <Pressable
              onPress={handleMidiImport}
              className="h-8 rounded-lg bg-dark-muted items-center justify-center flex-row gap-1 active:opacity-70"
            >
              <Text className="text-gray-300 text-xs">📂</Text>
              <Text className="text-gray-300 text-[10px] font-semibold">
                Import
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal className="flex-1 bg-dark-bg">
          <View style={{ width: 1200 }}>
            <View
              className="relative"
              style={{ height: tracks.length * (resp.isDesktop ? 104 : 80) }}
            >
              {tracks.map((track, trackIndex) => {
                const showAuto = showAutomation[track.id];
                const showPanAuto = showPanAutomation[track.id];
                const trackH = resp.isDesktop ? 104 : 80;
                const laneCount = (showAuto ? 1 : 0) + (showPanAuto ? 1 : 0);
                return (
                  <View
                    key={track.id}
                    className="absolute w-full"
                    style={{
                      height: showAuto || showPanAuto ? trackH + laneCount * 26 : trackH,
                      top: trackIndex * (showAuto || showPanAuto ? trackH + laneCount * 26 : trackH),
                    }}
                  >
                    <View
                      className="border-b border-dark-border/30 relative justify-center bg-dark-bg/10"
                      style={{ height: trackH }}
                    >
                      {track.regions.map((region) => (
                        <View
                          key={region.id}
                          style={{
                            left: region.start * 2.4,
                            width: region.duration * 2.4,
                            position: "absolute",
                          }}
                          className={`h-14 rounded-lg border border-white/10 overflow-hidden shadow-sm ${
                            track.color
                          } ${isAudible(track) ? "opacity-90" : "opacity-25"}`}
                        >
                          <WaveformCanvas
                            regionId={region.id}
                            duration={region.duration}
                            color={track.color}
                            audible={isAudible(track)}
                            selected={selectedTrackId === track.id}
                            muted={track.muted}
                            height={56}
                          />
                        </View>
                      ))}
                    </View>
                    {showAuto && (
                      <View className="h-[26px] bg-dark-bg/20 border-b border-dark-border/20">
                        <AutomationLane
                          points={track.automation.volume || []}
                          onChange={(pts) =>
                            updateAutomation(track.id, "volume", pts)
                          }
                          duration={duration}
                          color="#5ac8fa"
                          visible
                          label="Volume"
                          minValue={0}
                          maxValue={100}
                          showCurveToggle
                        />
                      </View>
                    )}
                    {showPanAuto && (
                      <View className="h-[26px] bg-dark-bg/20 border-b border-dark-border/20">
                        <AutomationLane
                          points={track.automation.pan || []}
                          onChange={(pts) =>
                            updateAutomation(track.id, "pan", pts)
                          }
                          duration={duration}
                          color="#bf5af2"
                          visible
                          label="Pan"
                          minValue={-100}
                          maxValue={100}
                          showCurveToggle
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
            <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
              Sample Browser
            </Text>
            <Pressable
              onPress={() => setShowSampleBrowser(false)}
              className="w-6 h-6 items-center justify-center active:opacity-60"
            >
              <Text className="text-gray-500 text-xs">✕</Text>
            </Pressable>
          </View>
          <SampleBrowser visible onAddSample={handleAddSample} />
        </View>
      )}
      <View className="bg-dark-surface border-t border-dark-border">
        <View className="flex-row border-b border-dark-border/50">
          {bottomTabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setBottomTab(tab.key)}
              className={`flex-1 py-2.5 flex-row items-center justify-center gap-1.5 ${
                bottomTab === tab.key
                  ? "bg-dark-surface border-b-2 border-brand-primary"
                  : "opacity-60"
              }`}
            >
              <Text
                className={`text-xs ${bottomTab === tab.key ? "text-brand-primary" : "text-gray-400"}`}
              >
                {tab.icon}
              </Text>
              <Text
                className={`text-xs font-bold ${bottomTab === tab.key ? "text-brand-primary" : "text-gray-400"}`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {bottomTab === "mixer" && (
          <View>
            <View
              className={`flex-row items-center gap-3 ${resp.isMobile ? "px-2 py-1.5" : "px-4 py-2"} border-b border-dark-border/50 bg-dark-surface/20`}
            >
              <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                Mixer
              </Text>
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
              <Pressable
                onPress={() => {
                  if (sendBuses.length < 20)
                    setSendBuses((prev) => [
                      ...prev,
                      {
                        id: `bus-${Date.now()}`,
                        name: `Send ${prev.length + 1}`,
                        color: "#5ac8fa",
                        volume: 80,
                        muted: false,
                      },
                    ]);
                }}
                className="ml-auto px-2 py-1 rounded-md bg-dark-muted/40 border border-dark-border active:opacity-70"
              >
                <Text
                  className={`${resp.isMobile ? "text-[9px]" : "text-[10px]"} text-gray-400`}
                >
                  +Send
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className={`flex-1 ${resp.isMobile ? "px-2" : "px-4"}`}
            >
              <View className="flex-row gap-3 py-2">
                {tracks.map((track) => {
                  const effVol = getEffectiveVolume(track.id);
                  return (
                    <View
                      key={track.id}
                      style={{ width: resp.channelWidth }}
                      className="bg-dark-surface rounded-xl border border-dark-border p-2.5 items-center gap-1.5"
                    >
                      <Text className="text-[10px] text-gray-400 font-medium truncate w-full text-center">
                        {track.name}
                      </Text>
                      <View className="flex-row gap-1">
                        <Pressable
                          onPress={() => toggleMute(track.id)}
                          className={`w-7 h-5 rounded items-center justify-center ${track.muted ? "bg-red-500/30 border border-red-400" : "bg-dark-muted/40"}`}
                        >
                          <Text
                            className={`text-[9px] font-bold ${track.muted ? "text-red-400" : "text-gray-500"}`}
                          >
                            M
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => toggleSolo(track.id)}
                          className={`w-7 h-5 rounded items-center justify-center ${track.solo ? "bg-amber-500/30 border border-amber-400" : "bg-dark-muted/40"}`}
                        >
                          <Text
                            className={`text-[9px] font-bold ${track.solo ? "text-amber-400" : "text-gray-500"}`}
                          >
                            S
                          </Text>
                        </Pressable>
                      </View>
                      <View className="flex-row items-stretch flex-1 w-full gap-1">
                        <VuMeter
                          level={effVol / 100}
                          peakLevel={isAudible(track) ? Math.min(1, effVol / 100 + Math.random() * 0.05) : 0}
                        />
                        <Pressable
                          onPress={() =>
                            setTrackVolume(
                              track.id,
                              Math.min(
                                100,
                                Math.max(0, trackVolume(track.id) - 10),
                              ),
                            )
                          }
                          className="w-3 flex-1 bg-dark-bg rounded-full relative justify-end overflow-hidden active:opacity-80"
                        >
                          <View
                            style={{ height: `${effVol}%` }}
                            className={`w-full rounded-full ${isAudible(track) ? "bg-brand-accent" : "bg-gray-600"}`}
                          />
                        </Pressable>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Pressable
                          onPress={() =>
                            setTrackVolume(
                              track.id,
                              Math.max(0, trackVolume(track.id) - 5),
                            )
                          }
                          className="w-5 h-5 rounded bg-dark-muted/40 items-center justify-center active:opacity-70"
                        >
                          <Text className="text-gray-400 text-[11px]">−</Text>
                        </Pressable>
                        <Text className="text-[9px] font-mono text-gray-500 w-8 text-center">
                          {track.muted ? "MUT" : `${effVol}%`}
                        </Text>
                        <Pressable
                          onPress={() =>
                            setTrackVolume(
                              track.id,
                              Math.min(100, trackVolume(track.id) + 5),
                            )
                          }
                          className="w-5 h-5 rounded bg-dark-muted/40 items-center justify-center active:opacity-70"
                        >
                          <Text className="text-gray-400 text-[11px]">+</Text>
                        </Pressable>
                      </View>
                      <View className="w-full h-6 flex-row items-center gap-1">
                        <Text className="text-[9px] text-gray-600 w-4 text-center">
                          L
                        </Text>
                        <View className="flex-1 h-1 bg-dark-bg rounded-full overflow-hidden">
                          <View
                            className="h-full bg-cyan-500 rounded-full"
                            style={{ width: `${(track.pan + 100) / 2}%` }}
                          />
                        </View>
                        <Text className="text-[9px] text-gray-600 w-4 text-center">
                          R
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1 w-full justify-center">
                        <Pressable
                          onPress={() =>
                            setTrackPan(
                              track.id,
                              Math.max(-100, track.pan - 10),
                            )
                          }
                          className="w-6 h-5 rounded bg-dark-muted/30 items-center justify-center active:opacity-70"
                        >
                          <Text className="text-gray-500 text-[9px]">◀</Text>
                        </Pressable>
                        <Text className="text-[9px] font-mono text-gray-500 w-8 text-center">
                          {track.pan > 0
                            ? `${track.pan}R`
                            : track.pan < 0
                              ? `${-track.pan}L`
                              : "C"}
                        </Text>
                        <Pressable
                          onPress={() =>
                            setTrackPan(track.id, Math.min(100, track.pan + 10))
                          }
                          className="w-6 h-5 rounded bg-dark-muted/30 items-center justify-center active:opacity-70"
                        >
                          <Text className="text-gray-500 text-[9px]">▶</Text>
                        </Pressable>
                      </View>
                      <View className="w-full flex-row items-center gap-1">
                        <Text className="text-[8px] text-gray-600 w-5">
                          SC:
                        </Text>
                        <Pressable
                          onPress={() => {
                            const others = tracks.filter(
                              (t) => t.id !== track.id,
                            );
                            if (others.length === 0) {
                              setTrackSidechain(track.id, null);
                              return;
                            }
                            const currentIdx = others.findIndex(
                              (t) => t.id === track.sidechainSource,
                            );
                            const next =
                              others[(currentIdx + 1) % others.length];
                            setTrackSidechain(track.id, next?.id || null);
                          }}
                          className="flex-1 h-4 rounded bg-dark-muted/30 items-center justify-center active:opacity-70"
                        >
                          <Text className="text-[8px] text-gray-400">
                            {track.sidechainSource
                              ? tracks.find(
                                  (t) => t.id === track.sidechainSource,
                                )?.name || "..."
                              : "OFF"}
                          </Text>
                        </Pressable>
                      </View>
                      <View className="w-full flex-row items-center gap-1 mb-1">
                        <Text className="text-[8px] text-gray-600 w-5">
                          Bus:
                        </Text>
                        <Pressable
                          onPress={() => {
                            const allBuses = [{ id: "master", name: "Master" }, ...buses];
                            const currentIdx = allBuses.findIndex(
                              (b) =>
                                (b.id === "master" && !track.outputId) ||
                                b.id === track.outputId,
                            );
                            const next = allBuses[(currentIdx + 1) % allBuses.length];
                            setTrackOutput(track.id, next.id === "master" ? null : next.id);
                          }}
                          className="flex-1 h-4 rounded bg-dark-muted/30 items-center justify-center active:opacity-70"
                        >
                          <Text className="text-[8px] text-gray-400">
                            {track.outputId
                              ? buses.find((b) => b.id === track.outputId)?.name || "Bus"
                              : "Master"}
                          </Text>
                        </Pressable>
                      </View>
                      {sendBuses.map((bus) => (
                        <View
                          key={bus.id}
                          className="w-full flex-row items-center gap-1"
                        >
                          <Text className="text-[8px] text-gray-600 w-5 truncate text-right">
                            {bus.name.replace("Send ", "S")}
                          </Text>
                          <View className="flex-1 h-0.5 bg-dark-bg rounded-full overflow-hidden">
                            <View
                              className="h-full bg-purple-500/70 rounded-full"
                              style={{ width: `${track.sends[bus.id] ?? 0}%` }}
                            />
                          </View>
                          <Pressable
                            onPress={() =>
                              setTrackSend(
                                track.id,
                                bus.id,
                                Math.min(100, (track.sends[bus.id] ?? 0) + 5),
                              )
                            }
                            className="w-4 h-4 rounded bg-dark-muted/30 items-center justify-center active:opacity-70"
                          >
                            <Text className="text-gray-500 text-[8px]">+</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  );
                })}
                {buses.length > 0 && (
                  <View className="w-28 bg-dark-surface/60 rounded-xl border border-dashed border-dark-border p-2.5 items-center gap-1.5">
                    <Text className="text-[10px] text-gray-500 font-medium">
                      Buses
                    </Text>
                    {buses.map((bus) => (
                      <View
                        key={bus.id}
                        className="w-full flex-row items-center gap-1"
                      >
                        <Text className="text-[9px] text-gray-400 flex-1 truncate">
                          {bus.name}
                        </Text>
                        <Pressable
                          onPress={() =>
                            setBuses((prev) =>
                              prev.filter((b) => b.id !== bus.id),
                            )
                          }
                          className="w-4 h-4 rounded bg-red-500/20 items-center justify-center active:opacity-70"
                        >
                          <Text className="text-red-400 text-[8px]">×</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
                {sendBuses.length > 0 && (
                  <View className="w-28 bg-dark-surface/60 rounded-xl border border-dashed border-dark-border p-2.5 items-center gap-1.5">
                    <Text className="text-[10px] text-gray-500 font-medium">
                      Send Buses
                    </Text>
                    {sendBuses.map((bus) => (
                      <View
                        key={bus.id}
                        className="w-full flex-row items-center gap-1"
                      >
                        <Text className="text-[9px] text-gray-400 flex-1 truncate">
                          {bus.name}
                        </Text>
                        <Pressable
                          onPress={() =>
                            setSendBuses((prev) =>
                              prev.filter((b) => b.id !== bus.id),
                            )
                          }
                          className="w-4 h-4 rounded bg-red-500/20 items-center justify-center active:opacity-70"
                        >
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
        {bottomTab === "buses" && (
          <View className="flex-1 p-3">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-300 label">Sub-Mix Buses</Text>
              <Pressable
                onPress={() => {
                  const id = `bus-${Date.now()}`;
                  const name = `Bus ${buses.length + 1}`;
                  const colors = ["#ff6482", "#5ac8fa", "#ffcc00", "#34c759", "#bf5af2"];
                  setBuses((prev) => [
                    ...prev,
                    {
                      id,
                      name,
                      color: colors[prev.length % colors.length],
                      volume: 1,
                      muted: false,
                      plugins: [],
                    },
                  ]);
                }}
                className="px-3 py-1.5 rounded-lg bg-brand-accent/20 border border-brand-accent/40 active:opacity-70"
              >
                <Text className="text-brand-accent text-xs font-bold">+ Bus</Text>
              </Pressable>
            </View>
            {buses.length === 0 && (
              <View className="flex-1 items-center justify-center">
                <Text className="text-gray-600 text-xs">
                  Nenhum bus de áudio. Crie um para agrupar tracks.
                </Text>
              </View>
            )}
            <ScrollView className="flex-1">
              {buses.map((bus) => {
                const assignedTracks = tracks.filter((t) => t.outputId === bus.id);
                return (
                  <View
                    key={bus.id}
                    className="bg-dark-surface rounded-xl border border-dark-border p-3 mb-2"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-2">
                        <View
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: bus.color }}
                        />
                        <Text className="text-white font-medium text-sm">
                          {bus.name}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Pressable
                          onPress={() =>
                            setBuses((prev) =>
                              prev.map((b) =>
                                b.id === bus.id ? { ...b, muted: !b.muted } : b,
                              ),
                            )
                          }
                          className={`px-2 py-1 rounded ${bus.muted ? "bg-red-500/30 border border-red-400" : "bg-dark-muted/40"}`}
                        >
                          <Text
                            className={`text-[9px] font-bold ${bus.muted ? "text-red-400" : "text-gray-500"}`}
                          >
                            M
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            setBuses((prev) =>
                              prev.filter((b) => b.id !== bus.id),
                            )
                          }
                          className="w-6 h-6 rounded bg-red-500/20 items-center justify-center active:opacity-70"
                        >
                          <Text className="text-red-400 text-xs">×</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2 mb-2">
                      <Text className="text-gray-500 text-xs w-12">Vol:</Text>
                      <View className="flex-1 h-1.5 bg-dark-bg rounded-full overflow-hidden">
                        <View
                          className="h-full bg-brand-accent rounded-full"
                          style={{ width: `${bus.volume * 100}%` }}
                        />
                      </View>
                      <Text className="text-gray-400 font-mono text-xs w-8 text-right">
                        {Math.round(bus.volume * 100)}%
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-gray-500 text-xs w-12">Vol:</Text>
                      <Pressable
                        onPress={() =>
                          setBuses((prev) =>
                            prev.map((b) =>
                              b.id === bus.id
                                ? { ...b, volume: Math.max(0, b.volume - 0.1) }
                                : b,
                            ),
                          )
                        }
                        className="w-6 h-6 rounded bg-dark-muted/30 items-center justify-center active:opacity-70"
                      >
                        <Text className="text-gray-400 text-xs">−</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          setBuses((prev) =>
                            prev.map((b) =>
                              b.id === bus.id
                                ? { ...b, volume: Math.min(2, b.volume + 0.1) }
                                : b,
                            ),
                          )
                        }
                        className="w-6 h-6 rounded bg-dark-muted/30 items-center justify-center active:opacity-70"
                      >
                        <Text className="text-gray-400 text-xs">+</Text>
                      </Pressable>
                    </View>
                    {assignedTracks.length > 0 && (
                      <View className="flex-row flex-wrap gap-1 mt-2">
                        {assignedTracks.map((t) => (
                          <View
                            key={t.id}
                            className="px-1.5 py-0.5 rounded bg-dark-muted/40"
                          >
                            <Text className="text-[8px] text-gray-500">
                              {t.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {bottomTab === "fx" && (
          <ScrollView
            className={`flex-1 ${resp.isMobile ? "px-2 py-2" : "px-4 py-3"}`}
            style={{
              maxHeight: resp.isMobile ? 220 : resp.isDesktop ? 320 : 260,
            }}
          >
            {selectedTrack ? (
              <View>
                <View className="flex-row items-center gap-2 mb-2 px-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                  <Text className="label text-brand-accent/70">
                    {selectedTrack.name}
                  </Text>
                </View>
                <PluginRack
                  plugins={selectedTrack.plugins}
                  onChange={(pl) => updateTrackPlugins(selectedTrack.id, pl)}
                  onEdit={(p) => {
                    setEditingPlugin(p);
                    setEditingPluginSource("track");
                  }}
                  trackName={selectedTrack.name}
                />
                <View className="mt-3">
                  <PedalRack
                    chain={
                      trackAmpChains[selectedTrack.id] ?? {
                        pedals: [],
                        amp: null,
                        cab: null,
                      }
                    }
                    onChange={(chain) =>
                      setTrackAmpChains((prev) => ({
                        ...prev,
                        [selectedTrack.id]: chain,
                      }))
                    }
                    trackName={selectedTrack.name}
                  />
                </View>
                <View className="mt-3">
                  <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2 px-1">
                    Quick FX
                  </Text>
                  <View className="flex-row flex-wrap gap-3 px-1">
                    {ONE_KNOB_TYPES.map((knobType) => (
                      <OneKnobProcessor
                        key={knobType}
                        type={knobType}
                        value={
                          oneKnobValues[selectedTrack.id]?.[knobType] ?? 0
                        }
                        onChange={(_type, v) => {
                          setOneKnobValues((prev) => ({
                            ...prev,
                            [selectedTrack.id]: {
                              ...(prev[selectedTrack.id] ?? {}),
                              [_type]: v,
                            },
                          }));
                        }}
                      />
                    ))}
                  </View>
                </View>
                <MasterRack
                  plugins={masterPlugins}
                  onChange={setMasterPlugins}
                  onEdit={(p) => {
                    setEditingPlugin(p);
                    setEditingPluginSource("masterRack");
                  }}
                />
              </View>
            ) : (
              <View className="py-4 items-center gap-2">
                <Text className="text-gray-500 text-xs">
                  Selecione uma track para ver os plugins
                </Text>
                <MasterRack
                  plugins={masterPlugins}
                  onChange={setMasterPlugins}
                  onEdit={(p) => {
                    setEditingPlugin(p);
                    setEditingPluginSource("masterRack");
                  }}
                />
              </View>
            )}
          </ScrollView>
        )}

        {bottomTab === "mastering" && (
          <ScrollView
            className={`flex-1 ${resp.isMobile ? "px-2 py-2" : "px-4 py-3"}`}
            style={{ maxHeight: 340 }}
          >
            <LufsMeter isPlaying={isPlaying} />
            <View className="mt-3 mb-3">
              <VisualEQ
                bands={(() => {
                  const eq = masterPlugins.find((p) => p.type === "eq");
                  if (!eq) return EQ_DEFAULT_BANDS;
                  return Array.from({ length: 8 }, (_, i) => ({
                    freq: eq.params[`b${i}_freq`] ?? EQ_DEFAULT_BANDS[i].freq,
                    gain: eq.params[`b${i}_gain`] ?? EQ_DEFAULT_BANDS[i].gain,
                    q: eq.params[`b${i}_q`] ?? EQ_DEFAULT_BANDS[i].q,
                    type: eq.params[`b${i}_type`] ?? EQ_DEFAULT_BANDS[i].type,
                    enabled: eq.params[`b${i}_enabled`] ?? EQ_DEFAULT_BANDS[i].enabled,
                  }));
                })()}
                onChange={(index, params) => {
                  const eqIdx = masterPlugins.findIndex(
                    (p) => p.type === "eq",
                  );
                  if (eqIdx === -1) return;
                  const updated = [...masterPlugins];
                  const newParams = { ...updated[eqIdx].params };
                  if (params.freq !== undefined) newParams[`b${index}_freq`] = params.freq;
                  if (params.gain !== undefined) newParams[`b${index}_gain`] = params.gain;
                  if (params.q !== undefined) newParams[`b${index}_q`] = params.q;
                  if (params.type !== undefined) newParams[`b${index}_type`] = params.type;
                  if (params.enabled !== undefined) newParams[`b${index}_enabled`] = params.enabled;
                  updated[eqIdx] = {
                    ...updated[eqIdx],
                    params: newParams,
                  };
                  setMasterPlugins(updated);
                }}
              />
            </View>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <View className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <Text className="label text-rose-400/70 uppercase">
                  Mastering Chain
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="max-w-[200px]"
              >
                <View className="flex-row gap-1">
                  {MASTERING_CHAIN_PRESETS.map((preset, i) => (
                    <Pressable
                      key={preset.name}
                      onPress={() => handleLoadMasteringPreset(i)}
                      className="px-2 py-1 rounded-md border border-dark-border bg-dark-surface"
                    >
                      <Text className="text-gray-400 text-[9px] font-medium">
                        {preset.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
            {masteringChain.map((plugin, i) => {
              const isTruePeak = plugin.type === "truePeakLimiter";
              return (
                <Pressable
                  key={plugin.id}
                  onPress={() => {
                    setEditingPlugin(plugin);
                    setEditingPluginSource("mastering");
                  }}
                  className={`flex-row items-center gap-3 px-3 py-2.5 rounded-xl mb-1.5 border ${isTruePeak ? "bg-red-500/10 border-red-500/30" : "bg-dark-surface/80 border-dark-border"}`}
                >
                  <View className="flex-row items-center gap-2 flex-1">
                    <View
                      className="w-1 h-8 rounded-full"
                      style={{ backgroundColor: plugin.color }}
                    />
                    <View>
                      <Text className="text-white text-xs font-semibold">
                        {plugin.name}
                      </Text>
                      <Text className="text-gray-500 text-[9px]">
                        {isTruePeak
                          ? "TRUE PEAK — Final Safety"
                          : `#${i + 1} in chain`}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleTogglePlugin(plugin.id)}
                    className={`w-8 h-6 rounded-md border items-center justify-center ${plugin.enabled ? (isTruePeak ? "bg-red-500/30 border-red-500/50" : "bg-dark-elevated border-dark-border") : "bg-dark-surface border-dark-border/30"}`}
                  >
                    <Text
                      className={`text-[9px] font-bold ${plugin.enabled ? (isTruePeak ? "text-red-400" : "text-white") : "text-gray-600"}`}
                    >
                      {plugin.enabled ? "ON" : "OFF"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setEditingPlugin(plugin);
                      setEditingPluginSource("mastering");
                    }}
                    className="w-6 h-6 items-center justify-center"
                  >
                    <Text className="text-gray-500 text-xs">▸</Text>
                  </Pressable>
                </Pressable>
              );
            })}
            <Pressable
              onPress={async () => {
                const urls = tracks.flatMap((t) =>
                  t.regions
                    .filter((r) => r.url)
                    .map((r) => ({ name: t.name, url: r.url! })),
                );
                if (urls.length > 0) {
                  setMasteringInput({
                    url: urls[0].url,
                    filename: `${projectTitle}-stems`,
                    stems: urls,
                  });
                } else {
                  try {
                    const url = await renderTracksToUrl(tracks, initialBpm, projectMood, buses);
                    if (url) {
                      setMasteringInput({
                        url,
                        filename: projectTitle,
                        stems: tracks.map((t) => ({ name: t.name, url })),
                      });
                    }
                  } catch (e) {
                    console.warn("Mastering render failed:", e);
                    Alert.alert("Erro", "Falha ao preparar áudio para masterização.");
                  }
                }
                router.push("/mastering");
              }}
              className="mt-3 flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600/20 to-brand-accent/20 border border-rose-500/30 active:opacity-80"
            >
              <Text className="text-rose-400 text-sm font-bold">
                Enviar para Mastering Suite
              </Text>
              <Text className="text-rose-400/70 text-lg">→</Text>
            </Pressable>
          </ScrollView>
        )}

        {bottomTab === "groups" && (
          <ScrollView className="flex-1" style={{ maxHeight: 260 }}>
            <TrackGroupManager
              groups={groups}
              tracks={tracks}
              onCreateGroup={(name, trackIds) => {
                const g: GroupDef = {
                  id: `group-${Date.now()}`,
                  name,
                  color: GROUP_COLORS[groups.length % GROUP_COLORS.length],
                  volume: 80,
                  muted: false,
                  trackIds,
                };
                setGroups((prev) => [...prev, g]);
                setTrackAssignments((prev) => {
                  const next = { ...prev };
                  trackIds.forEach((tId) => {
                    next[tId] = g.id;
                  });
                  return next;
                });
              }}
              onRemoveGroup={(groupId) => {
                setGroups((prev) => prev.filter((g) => g.id !== groupId));
                setTrackAssignments((prev) => {
                  const next = { ...prev };
                  Object.keys(next).forEach((k) => {
                    if (next[k] === groupId) next[k] = null;
                  });
                  return next;
                });
              }}
              onGroupVolume={(groupId, vol) =>
                setGroups((prev) =>
                  prev.map((g) =>
                    g.id === groupId ? { ...g, volume: vol } : g,
                  ),
                )
              }
              onGroupMute={(groupId) =>
                setGroups((prev) =>
                  prev.map((g) =>
                    g.id === groupId ? { ...g, muted: !g.muted } : g,
                  ),
                )
              }
              onAssignTrack={(trackId, groupId) =>
                setTrackAssignments((prev) => ({ ...prev, [trackId]: groupId }))
              }
              trackAssignments={trackAssignments}
            />
          </ScrollView>
        )}

        {bottomTab === "mixes" && (
          <View className="px-4 py-3" style={{ maxHeight: 280 }}>
            <View className="flex-row items-center gap-2 mb-2">
              <Text className="text-gray-300 text-xs font-semibold">
                AutoMix
              </Text>
              {AUTOMIX_GENRES.map((genre) => (
                <Pressable
                  key={genre}
                  onPress={() => setTracks(autoMix(tracks, genre))}
                  className="px-2.5 py-1 rounded-lg bg-dark-muted border border-dark-border active:opacity-70"
                >
                  <Text className="text-gray-300 text-[10px] font-medium capitalize">
                    {genre}
                  </Text>
                </Pressable>
              ))}
            </View>
            <MixManager
              snapshots={mixSnapshots}
              activeMixId={activeMixId}
              onSave={handleSaveMix}
              onLoad={handleLoadMix}
              onDelete={handleDeleteMix}
              onCompare={handleCompareMix}
            />
          </View>
        )}
        {bottomTab === "chords" && (
          <View className="px-3 py-2" style={{ maxHeight: 200 }}>
            <ChordTrack
              chords={chords}
              onChange={setChords}
              keySignature={projectKey || "C"}
              bpm={metronome.bpm}
              numBars={8}
              visible
              onClose={() => setBottomTab("mixer")}
            />
            <Pressable
              onPress={() => {
                if (chords.length === 0) return;
                const midiNotes = chordsToMIDINotes(chords, projectKey || "C", metronome.bpm, 4, 80);
                if (midiNotes.length === 0) return;
                const trackId = `chord-midi-${Date.now()}`;
                setTracks((prev) => [...prev, {
                  id: trackId,
                  name: "Chord Progression",
                  color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
                  muted: false,
                  solo: false,
                  volume: 70,
                  pan: 0,
                  sends: {},
                  sidechainSource: null,
                  regions: [{ id: `cr-${Date.now()}`, start: 0, duration: chords.reduce((s, c) => s + c.beats, 0) * (60 / metronome.bpm) }],
                  plugins: [],
                  automation: {},
                  midiNotes,
                }]);
                setSelectedTrackId(trackId);
              }}
              className="mt-2 h-8 rounded-lg bg-brand-accent/20 items-center justify-center active:opacity-70 border border-brand-accent/30"
            >
              <Text className="text-brand-accent text-[10px] font-bold">
                Gerar MIDI da Progressão →
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <RecordOptions
        settings={recordSettings}
        onChange={setRecordSettings}
        visible={showRecordOptions}
        onClose={() => setShowRecordOptions(false)}
      />
      <PluginEditor
        plugin={editingPlugin}
        onParamChange={handlePluginParamChange}
        onToggle={handleTogglePlugin}
        onClose={() => {
          setEditingPlugin(null);
          setEditingPluginSource(null);
        }}
      />
      <BounceDialog
        visible={showBounce}
        onClose={() => setShowBounce(false)}
        projectTitle={projectTitle}
        duration={duration}
        tracks={tracks.map((t) => ({
          id: t.id,
          name: t.name,
          muted: t.muted,
          solo: t.solo,
          volume: t.volume,
          pan: t.pan,
          regions: t.regions,
        }))}
      />
      <CodeSampler
        visible={showCodeSampler}
        onClose={() => setShowCodeSampler(false)}
        onRender={handleCodeRender}
        bpm={metronome.bpm}
      />
      <PromptSampler
        visible={showPromptSampler}
        onClose={() => setShowPromptSampler(false)}
        onRender={handlePromptMidiRender}
        bpm={metronome.bpm}
      />
      <Tuner visible={showTuner} onClose={() => setShowTuner(false)} />
      <Sampler
        visible={showSampler}
        onClose={() => setShowSampler(false)}
        onAddToTrack={(name, sampleData) => {
          const trackId = `sampler-${Date.now()}`;
          const newTrack: TrackDef = {
            id: trackId,
            name,
            color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
            muted: false,
            solo: false,
            volume: 75,
            pan: 0,
            sends: {},
            sidechainSource: null,
            regions: [{ id: `s-region-${Date.now()}`, start: 0, duration: 30 }],
            plugins: [],
            automation: {},
            samplerData: sampleData,
          };
          setTracks([...tracks, newTrack]);
          setSelectedTrackId(trackId);
          setShowSampler(false);
        }}
      />
      <Synth
        visible={showSynth}
        onClose={() => setShowSynth(false)}
        bpm={metronome.bpm}
      />
      <Looper
        visible={showLooper}
        onClose={() => setShowLooper(false)}
        bpm={metronome.bpm}
        onCommitLoop={(slot, bars) => {
          const safeBpm = Math.max(1, metronome.bpm);
          const region: TrackRegion = {
            id: `loop-${Date.now()}-${slot}`,
            start: 0,
            duration: bars * 4 * (60 / safeBpm),
          };
          const trackId = `loop-${Date.now()}`;
          const newTrack: TrackDef = {
            id: trackId,
            name: `Loop ${slot + 1}`,
            color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
            muted: false,
            solo: false,
            volume: 75,
            pan: 0,
            sends: {},
            sidechainSource: null,
            regions: [region],
            plugins: [],
            automation: {},
          };
          setTracks([...tracks, newTrack]);
          setSelectedTrackId(trackId);
        }}
      />
      <PianoRoll
        notes={currentMidiNotes}
        onChange={handlePianoRollChange}
        snap="beat"
        numBars={8}
        bpm={metronome.bpm}
        keySignature={projectKey?.replace(/m$/, "") || "C"}
        scale={projectKey?.endsWith("m") ? "minor" : "major"}
        visible={showPianoRoll}
        onClose={() => {
          setShowPianoRoll(false);
          setEditingMidiTrackId(null);
        }}
        trackName={selectedMidiTrack?.name}
      />
      <CommandPalette
        visible={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
      <BranchManager
        visible={showBranchManager}
        onClose={() => setShowBranchManager(false)}
      />
      <CommitModal
        visible={showCommitModal}
        onClose={() => setShowCommitModal(false)}
      />
      <OutputSelector
        visible={showOutputSelector}
        onClose={() => setShowOutputSelector(false)}
      />
    </View>
  );
}
