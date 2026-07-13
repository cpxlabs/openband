import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  setAudioModeAsync,
  RecordingPresets,
} from "expo-audio";
import { renderTracksToUrl, disposeAudioContext, getProjectDurationSeconds } from "../../src/lib/midiSynth";
import { PlaybackEngine } from "../../src/lib/playbackEngine";
import { audioSystem, createTrackedBlob, markBlobActive, revokeTrackedBlob } from "../../src/lib/universalAudio";
import { API_BASE_URL } from "../../src/lib/apiUrl";
import { startClock, stopClock, onClockTick, disposeClockManager } from "../../src/lib/clockManager";
import { startTelemetry, stopTelemetry, sendTelemetryReport, recordFrame, recordCpuLoad } from "../../src/lib/audioTelemetry";
import { assignTrackToBus } from "../../src/lib/busRouter";
import { buildAutomationSchedule, interpolateAutomationValue, type ScheduledAutomationPoint } from "../../src/lib/automationEngine";
import {
  Metronome,
  PluginRack,
  MasterRack,
  MixManager,
  WaveformCanvas,
  AutomationLane,
  TrackGroupManager,
  LufsMeter,
  SampleBrowser,
  PedalRack,
  OneKnobProcessor,
  ONE_KNOB_TYPES,
  VisualEQ,
  ChordTrack,
  VuMeter,
  TrackColorPicker,
  Sidebar,
  LiveWaveformCanvas,
} from "../../src/components";
import {
  applyMidiMessage,
  setMidiTargetHandler,
  subscribeToInputs,
} from "../../src/lib/midiLearn";
import type { MidiTarget } from "../../src/lib/midiLearn";
import { registerCommand, initKeyBindings, disposeKeyBindings } from "../../src/lib/commandRegistry";
import { chordsToMIDINotes } from "../../src/lib/harmonicAssistant";
import { useHistory } from "../../src/lib/history";
import { useKeyboardShortcuts } from "../../src/lib/keyboard";
import type { ProjectData } from "../../src/lib/projectStore";
import { useCloudSync } from "../../src/lib/cloudSync";
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
import { EQ_DEFAULT_BANDS, PLUGIN_SPECS, clampParam } from "../../src/lib/types";
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
import { usePresence } from "../../src/lib/presence";
import { useAuth } from "../../src/context/AuthContext";
import {
  TimeDisplay,
  CollaboratorCursors,
  GROUP_COLORS,
  TRACK_COLORS,
  TIMELINE_WIDTH,
  buildProjectData,
  StudioOnboardingCoachmark,
  StudioDrawer,
  type PluginSource,
} from "./parts";
import { StudioModals } from "./StudioModals";
import { useProjectParams, useStudioPersistence, useMixSnapshots, type BottomTab } from "./hooks";

async function applyPitchShift(
  sourceUrl: string,
  totalSemitones: number,
): Promise<string> {
  const sharedCtx = await audioSystem.ensureContext();
  if (!sharedCtx) return sourceUrl;
  try {
    const resp = await fetch(sourceUrl);
    const arrayBuf = await resp.arrayBuffer();
    const audioBuf = await sharedCtx.decodeAudioData(arrayBuf);
    const shifted = await pitchShift(audioBuf, totalSemitones);
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
    const pitchUrl = createTrackedBlob(blob);
    markBlobActive(pitchUrl);
    revokeTrackedBlob(sourceUrl);
    return pitchUrl;
  } catch (e) {
    console.warn("Pitch shift failed, using original:", e);
    return sourceUrl;
  }
}


export default function Studio() {
  const {
    id,
    genreParam,
    projectKey,
    initialBpm,
    initialTitle,
    projectMood,
    initialNumBars,
    projectTimeSig,
    isScratch,
    rawTool,
    isFromOnboarding,
    initialBottomTab,
  } = useProjectParams();
  const router = useRouter();
  const [projectTitle, setProjectTitle] = useState(initialTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const titleInputRef = useRef<TextInput>(null);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  const { completeOnboarding } = useAuth();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const webAudio = useWebAudioPlayer();
  const isWeb = Platform.OS === "web";
  const currentUrlRef = useRef<string | null>(null);
  const engineRef = useRef<PlaybackEngine | null>(null);
  const [engineActive, setEngineActive] = useState(false);
  const currentSeekRef = useRef(0);

  function getEngine(): PlaybackEngine {
    if (!engineRef.current) engineRef.current = new PlaybackEngine();
    return engineRef.current;
  }

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
      if (currentUrlRef.current) revokeTrackedBlob(currentUrlRef.current);
    };
  }, []);

  const resp = useResponsive();
  const [zoom, setZoom] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const handleNavigate = useCallback((route: string) => {
    const target = route === "index" ? "/tabs/feed" : `/tabs/${route}`;
    router.push(target as Parameters<typeof router.push>[0]);
    setDrawerOpen(false);
  }, [router]);

  const [isRecording, setIsRecording] = useState(false);
  const [webRecordingStart, setWebRecordingStart] = useState<number | null>(null);
  const [recordingTick, setRecordingTick] = useState(0);
  const faderHeightRef = useRef<Record<string, number>>({});
  const panWidthRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!isRecording || webRecordingStart == null) return;
    const id = setInterval(() => setRecordingTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [isRecording, webRecordingStart]);
  const liveRecordingDataRef = useRef<Float32Array[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>(initialBottomTab);
  const [showRecordOptions, setShowRecordOptions] = useState(false);
  const [showBounce, setShowBounce] = useState(false);
  const [showSampleBrowser, setShowSampleBrowser] = useState(false);
  const [showCodeSampler, setShowCodeSampler] = useState(false);
  const [showTuner, setShowTuner] = useState(false);
  const [showLooper, setShowLooper] = useState(false);
  const [showSampler, setShowSampler] = useState(false);
  const [showSynth, setShowSynth] = useState(rawTool === "synth");
  const [showPromptSampler, setShowPromptSampler] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showBranchManager, setShowBranchManager] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [showOutputSelector, setShowOutputSelector] = useState(false);
  const [showPatchbay, setShowPatchbay] = useState(false);
  const [showMidi, setShowMidi] = useState(false);
  const [showToolbarOverflow, setShowToolbarOverflow] = useState(false);
  const [colorPickerTrackId, setColorPickerTrackId] = useState<string | null>(null);
  const [oneKnobValues, setOneKnobValues] = useState<
    Record<string, Record<string, number>>
  >({});
  const [chords, setChords] = useState<
    { id: string; degree: number; quality: import("../../src/lib/harmony").ChordQuality; beats: number }[]
  >([]);
  const [showPianoRoll, setShowPianoRoll] = useState(rawTool === "piano");
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
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
  const syncState = useCloudSync(id);

  const { user, visitorId } = useAuth();
  const presenceUserId = user?.id ?? visitorId ?? "anon-studio";
  const presenceUserName =
    (user?.user_metadata?.name as string | undefined) ?? "Visitante";
  const { cursors, sendCursor, isConnected } = usePresence({
    projectId: typeof id === "string" ? id : null,
    userId: presenceUserId,
    userName: presenceUserName,
    throttleMs: 50,
  });

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

  const trackIds = useMemo(() => tracks.map((t) => t.id), [tracks]);

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

  const projectSnapshot = useMemo(
    () =>
      buildProjectData({
        title: projectTitle,
        genre: genreParam,
        key: projectKey,
        mood: projectMood,
        metronome,
        tracks,
        groups,
        buses,
        trackAssignments,
        masterPlugins,
        masteringChain,
        mixSnapshots,
        activeMixId,
        recordSettings,
        sendBuses,
        trackAmpChains,
      }),
    [
      projectTitle,
      genreParam,
      projectKey,
      projectMood,
      metronome,
      tracks,
      groups,
      buses,
      trackAssignments,
      masterPlugins,
      masteringChain,
      mixSnapshots,
      activeMixId,
      recordSettings,
      sendBuses,
      trackAmpChains,
    ],
  );

  const hydrateProject = useCallback((saved: ProjectData) => {
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
  }, [setTracks]);

  const {
    lastSavedLabel,
    save: saveProjectNow,
    handleManualSave,
  } = useStudioPersistence({
    id,
    snapshot: projectSnapshot,
    hydrate: hydrateProject,
  });

  const commitTitle = useCallback(() => {
    setEditingTitle(false);
    const trimmed = projectTitle.trim() || "Projeto";
    setProjectTitle(trimmed);
    saveProjectNow(trimmed);
  }, [projectTitle, saveProjectNow]);

  useEffect(() => {
    if (rawTool !== "piano" || editingMidiTrackId || !showPianoRoll) return;
    setEditingMidiTrackId(tracks[0]?.id ?? null);
  }, [rawTool, editingMidiTrackId, showPianoRoll, tracks]);

  const prevRegionUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const current = new Set<string>();
    for (const t of tracks) {
      for (const r of t.regions) {
        if (r.url) current.add(r.url);
      }
    }
    for (const url of prevRegionUrlsRef.current) {
      if (!current.has(url)) revokeTrackedBlob(url);
    }
    prevRegionUrlsRef.current = current;
  }, [tracks]);

  const isPlaying = isWeb
    ? engineActive
      ? (engineRef.current?.isPlaying ?? false)
      : webAudio.isPlaying
    : player.playing;
  const currentTime = isWeb
    ? engineActive
      ? (engineRef.current?.getCurrentTime() ?? 0)
      : webAudio.currentTime
    : status.currentTime || 0;
  const duration = isWeb
    ? engineActive
      ? (engineRef.current?.duration ?? 0)
      : webAudio.duration
    : status.duration || 240;
  const anySolo = useMemo(() => tracks.some((t) => t.solo), [tracks]);

  const sendCursorRef = useRef(sendCursor);
  sendCursorRef.current = sendCursor;
  const selectedTrackIdRef = useRef(selectedTrackId);
  selectedTrackIdRef.current = selectedTrackId;
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const pxPerSec = 2.4 * zoom;
  const secondsPerMarker = 20;
  const timelineWidth = Math.max(TIMELINE_WIDTH, duration * pxPerSec);
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const engineActiveRef = useRef(engineActive);
  engineActiveRef.current = engineActive;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  const handleTimelinePointerMove = useCallback(
    (e: { nativeEvent?: { locationX?: number; offsetX?: number } }) => {
      if (!isConnected) return;
      const x = e?.nativeEvent?.locationX ?? e?.nativeEvent?.offsetX ?? 0;
      const cursorX = Math.max(0, Math.min(1, x / timelineWidth));
      sendCursor(cursorX, selectedTrackIdRef.current, currentTime);
    },
    [isConnected, sendCursor, currentTime, timelineWidth],
  );

  useEffect(() => {
    if (!isConnected) return;
    sendCursor(
      currentTime / Math.max(1, duration),
      selectedTrackId,
      currentTime,
    );
  }, [selectedTrackId, isConnected]);

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
      startTelemetry({}, (metrics) => {
        sendTelemetryReport(metrics);
      });
    } else {
      stopClock();
      stopTelemetry();
      setCurrentBeat(0);
    }
    return () => {
      if (!isPlaying) stopClock();
      stopTelemetry();
    };
  }, [isPlaying]);

  useEffect(() => {
    const unsub = onClockTick((_time, audioTime) => {
      const timeSource = isWeb
        ? engineActive
          ? (engineRef.current?.getCurrentTime() ?? audioTime)
          : (webAudio?.currentTime ?? audioTime)
        : audioTime;
      const beatsPerMeasure = projectTimeSig.split("/").map(Number)[0];
      const beat = ((timeSource * metronome.bpm) / 60) % (beatsPerMeasure * 4);
      recordFrame();
      recordCpuLoad(Math.min(100, Math.max(0, (timeSource % 1) * 100)));
      setCurrentBeat(beat);
      if (isConnected) {
        sendCursorRef.current(
          timeSource / Math.max(1, durationRef.current),
          selectedTrackIdRef.current,
          timeSource,
        );
      }
    });
    return unsub;
  }, [metronome.bpm, projectTimeSig, isConnected, isWeb, webAudio, engineActive]);

  const togglePlay = useCallback(async () => {
    if (isWeb) webAudio.unlock();
    const playing = isWeb
      ? engineActive
        ? (engineRef.current?.isPlaying ?? false)
        : webAudio.isPlaying
      : player.playing;
    if (playing) {
      if (isWeb && engineActive && engineRef.current) {
        engineRef.current.pause();
        currentSeekRef.current = engineRef.current.getCurrentTime();
        setEngineActive(false);
      } else if (isWeb) {
        webAudio.pause();
      } else {
        player.pause();
      }
      return;
    }

    try {
      const ctx = await audioSystem.ensureContext();
      if (ctx) {
        const engine = getEngine();
        const durSec = getProjectDurationSeconds(tracks, initialBpm);
        const beatsPerMeasure = projectTimeSig.split("/").map(Number)[0];
        await engine.prepare(tracks, initialBpm, durSec, beatsPerMeasure);
        engine.onEnded = () => setEngineActive(false);
        await engine.play(currentSeekRef.current);
        setEngineActive(true);
        return;
      }
    } catch (e) {
      console.warn("PlaybackEngine unavailable, falling back to blob playback:", e);
    }

    if (currentUrlRef.current) revokeTrackedBlob(currentUrlRef.current);
    let url = await renderTracksToUrl(tracks, initialBpm, projectMood, buses);
    const totalSemitones =
      pitchShiftSemitones + (pitchCorrected ? -Math.log2(playbackRate) * 12 : 0);
    if (url && totalSemitones !== 0) {
      url = await applyPitchShift(url, totalSemitones);
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
        markBlobActive(url);
      } catch (e) {
        console.warn("Playback failed:", e);
        setAutoplayBlocked(true);
      }
    }
  }, [player, webAudio, isWeb, tracks, initialBpm, projectMood, buses, pitchCorrected, playbackRate, pitchShiftSemitones, engineActive, projectTimeSig]);

  const seekRelative = useCallback((seconds: number) => {
    if (isWeb && engineActive && engineRef.current) {
      engineRef.current.seek(engineRef.current.getCurrentTime() + seconds);
      currentSeekRef.current = engineRef.current.getCurrentTime();
      return;
    }
    if (isWeb) {
      webAudio.seekTo(Math.max(0, webAudio.currentTime + seconds));
    } else if (player) {
      player.seekTo(Math.max(0, (status.currentTime || 0) + seconds));
    }
  }, [isWeb, webAudio, player, status.currentTime, engineActive]);

  const stopPlayback = useCallback(() => {
    if (isWeb && engineActive && engineRef.current) {
      engineRef.current.stop();
      currentSeekRef.current = 0;
      setEngineActive(false);
      setCurrentBeat(0);
      return;
    }
    if (isWeb) {
      webAudio.pause();
      webAudio.seekTo(0);
    } else if (player) {
      player.pause();
      player.seekTo(0);
    }
    stopClock();
    setCurrentBeat(0);
  }, [isWeb, webAudio, player, engineActive]);

  // Stop playback when studio unmounts
  useEffect(() => () => {
    if (isWeb && engineRef.current) engineRef.current.dispose();
    else if (isWeb) webAudio.pause();
    else player.pause();
  }, [player, isWeb, webAudio]);

  const toggleRecording = useCallback(async () => {
    try {
      if (!recordSettings.armed) {
        setShowRecordOptions(true);
        return;
      }

      if (isRecording) {
        let uri = "";
        let finalDuration = 1;

        if (isWeb) {
          const blob = await audioSystem.stopRecording();
          if (!blob) {
            setIsRecording(false);
            setWebRecordingStart(null);
            liveRecordingDataRef.current = [];
            return;
          }
          uri = createTrackedBlob(blob);
          finalDuration = (Date.now() - (webRecordingStart || Date.now())) / 1000;
        } else {
          await audioRecorder.stop();
          uri = recorderState?.url || audioRecorder.uri || "";
          finalDuration = (recorderState?.durationMillis ?? 0) / 1000;
        }

        if (uri) {
          const armedTrack = tracks.find((t) => t.isArmed);
          let updatedTracks: TrackDef[];
          if (armedTrack) {
            const newRegion: TrackRegion = {
              id: `region-${Date.now()}`,
              start: currentBeat / (initialBpm / 60) || 0,
              duration: Math.max(finalDuration, 1),
              url: uri,
            };
            updatedTracks = tracks.map((t) =>
              t.id === armedTrack.id
                ? { ...t, regions: [...t.regions, newRegion] }
                : t
            );
          } else {
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
                  start: currentBeat / (initialBpm / 60) || 0,
                  duration: Math.max(finalDuration, 1),
                  url: uri,
                },
              ],
              plugins: [],
              automation: {},
            };
            updatedTracks = [...tracks, newTrack];
            setSelectedTrackId(trackId);
          }
          setTracks(updatedTracks);
          markBlobActive(uri);
          if (isWeb) {
            rerenderAfterMuteSolo(updatedTracks).catch((e) =>
              console.warn("rerender after record failed:", e)
            );
          }
        }
        setIsRecording(false);
        setWebRecordingStart(null);
        liveRecordingDataRef.current = [];
      } else {
        if (isWeb) {
          liveRecordingDataRef.current = [];
          await audioSystem.startRecording((chunk) => {
            liveRecordingDataRef.current.push(chunk);
          });
          setWebRecordingStart(Date.now());
          setIsRecording(true);
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
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message === "MIC_PERMISSION_DENIED") {
        Alert.alert(
          "Permissão",
          "Permissão para usar o microfone foi negada.",
        );
      } else {
        console.warn("Recording failed:", e);
        Alert.alert("Erro", "Falha ao gravar áudio.");
      }
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
      if (isWeb && engineActive && engineRef.current) {
        try {
          const durSec = getProjectDurationSeconds(updatedTracks, initialBpm);
          await engineRef.current.syncTracks(updatedTracks, initialBpm, durSec);
          return;
        } catch (e) {
          console.warn("Engine sync failed, falling back to blob re-render:", e);
        }
      }
      try {
        await audioSystem.ensureContext();
        if (currentUrlRef.current) revokeTrackedBlob(currentUrlRef.current);
        let url = await renderTracksToUrl(updatedTracks, initialBpm, projectMood, buses);
        const totalSemitones =
          pitchShiftSemitones + (pitchCorrected ? -Math.log2(playbackRate) * 12 : 0);
        if (url && totalSemitones !== 0) {
          url = await applyPitchShift(url, totalSemitones);
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
          markBlobActive(url);
        } catch (e) {
          console.warn("Auto-play after mute/solo failed:", e);
        }
      }
    } catch (e) {
      console.warn("rerenderAfterMuteSolo render failed:", e);
    }
  },
  [player, webAudio, isWeb, initialBpm, projectMood, buses, pitchCorrected, playbackRate, pitchShiftSemitones, engineActive],
  );

  const toggleMute = useCallback(
    (trackId: string) => {
      const updated = tracks.map((t) =>
        t.id === trackId ? { ...t, muted: !t.muted } : t,
      );
      setTracks(updated);
      const newMuted = !tracks.find((t) => t.id === trackId)?.muted;
      if (isWeb && engineActive && engineRef.current) {
        engineRef.current.setMuted(trackId, newMuted);
        return;
      }
      rerenderAfterMuteSolo(updated).catch((e) =>
        console.warn("toggleMute rerender failed:", e),
      );
    },
    [tracks, setTracks, rerenderAfterMuteSolo, isWeb, engineActive],
  );

  const toggleSolo = useCallback(
    (trackId: string) => {
      const updated = tracks.map((t) =>
        t.id === trackId ? { ...t, solo: !t.solo } : t,
      );
      setTracks(updated);
      const newSolo = !tracks.find((t) => t.id === trackId)?.solo;
      if (isWeb && engineActive && engineRef.current) {
        engineRef.current.setSolo(trackId, newSolo);
        return;
      }
      rerenderAfterMuteSolo(updated).catch((e) =>
        console.warn("toggleSolo rerender failed:", e),
      );
    },
    [tracks, setTracks, rerenderAfterMuteSolo, isWeb, engineActive],
  );

  const deleteTrack = useCallback(
    (trackId: string) => {
      const removed = tracks.find((t) => t.id === trackId);
      const confirmDelete = () => {
        if (removed) {
          for (const region of removed.regions) {
            if (region.url) revokeTrackedBlob(region.url);
          }
        }
        setTracks(tracks.filter((t) => t.id !== trackId));
        if (selectedTrackId === trackId) setSelectedTrackId(null);
      };
      const label = removed?.name ?? "esta track";
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && !window.confirm(`Excluir "${label}"? Esta ação não pode ser desfeita.`)) {
          return;
        }
        confirmDelete();
      } else {
        Alert.alert(
          "Excluir track",
          `Excluir "${label}"? Esta ação não pode ser desfeita.`,
          [
            { text: "Cancelar", style: "cancel" },
            { text: "Excluir", style: "destructive", onPress: confirmDelete },
          ],
        );
      }
    },
    [tracks, setTracks, selectedTrackId],
  );

  const setTrackVolume = useCallback(
    (trackId: string, vol: number) => {
      setTracks(
        tracks.map((t) => (t.id === trackId ? { ...t, volume: vol } : t)),
      );
      if (isWeb && engineActive && engineRef.current) {
        engineRef.current.setTrackVolume(trackId, vol);
      }
    },
    [tracks, setTracks, isWeb, engineActive],
  );

  const setTrackPan = useCallback(
    (trackId: string, pan: number) => {
      setTracks(tracks.map((t) => (t.id === trackId ? { ...t, pan } : t)));
      if (isWeb && engineActive && engineRef.current) {
        engineRef.current.setTrackPan(trackId, pan);
      }
    },
    [tracks, setTracks, isWeb, engineActive],
  );

  // Live MIDI dispatch: route incoming CC/note messages to mixer + transport.
  useEffect(() => {
    const resolveTrackId = (target: MidiTarget): string | undefined => {
      if (target.trackIndex != null) return tracksRef.current[target.trackIndex]?.id;
      return target.trackId;
    };
    const handleMidiTarget = (target: MidiTarget, value01: number) => {
      switch (target.type) {
        case "trackVolume": {
          const tid = resolveTrackId(target);
          if (tid) setTrackVolume(tid, value01 * 100);
          break;
        }
        case "trackPan": {
          const tid = resolveTrackId(target);
          if (tid) setTrackPan(tid, (value01 * 2 - 1) * 100);
          break;
        }
        case "masterVolume": {
          getEngine().setMasterVolume(value01);
          break;
        }
        case "transport": {
          switch (target.action) {
            case "play":
              if (!isPlayingRef.current) togglePlay();
              break;
            case "togglePlay":
              togglePlay();
              break;
            case "stop":
              stopPlayback();
              break;
            case "record":
              toggleRecording();
              break;
            case "loop": {
              const engine = getEngine();
              const looping = engine.isLooping();
              engine.setLoop(looping ? null : 0, looping ? null : durationRef.current);
              break;
            }
            case "scrub": {
              const pos = value01 * durationRef.current;
              if (engineActiveRef.current && engineRef.current) {
                engineRef.current.seek(pos);
              } else {
                seekRelative(pos - currentTimeRef.current);
              }
              break;
            }
          }
          break;
        }
        case "pluginParam": {
          if (!target.paramId) break;
          const tid = resolveTrackId(target) ?? selectedTrackIdRef.current;
          if (!tid) break;
          const track = tracksRef.current.find((t) => t.id === tid);
          if (!track) break;
          // Find the plugin in the track chain whose spec exposes this paramId.
          const plugin = track.plugins.find((p) => {
            const spec = PLUGIN_SPECS[p.type];
            return spec?.params.some((ps) => ps.id === target.paramId);
          });
          if (!plugin) break;
          const spec = PLUGIN_SPECS[plugin.type];
          const paramSpec = spec.params.find((ps) => ps.id === target.paramId);
          if (!paramSpec) break;
          const scaled = clampParam(
            paramSpec,
            paramSpec.min + value01 * (paramSpec.max - paramSpec.min),
          );
          setTracks(
            tracksRef.current.map((t) =>
              t.id === tid
                ? {
                    ...t,
                    plugins: t.plugins.map((p) =>
                      p.id === plugin.id
                        ? {
                            ...p,
                            params: { ...p.params, [target.paramId!]: scaled },
                          }
                        : p,
                    ),
                  }
                : t,
            ),
          );
          break;
        }
      }
    };
    setMidiTargetHandler(handleMidiTarget);
    let unsub: (() => void) | null = null;
    subscribeToInputs(applyMidiMessage).then((u) => {
      unsub = u;
    });
    return () => {
      unsub?.();
      setMidiTargetHandler(null);
    };
  }, [togglePlay, stopPlayback, toggleRecording, seekRelative, setTrackVolume, setTrackPan]);

  const setTrackColor = useCallback(
    (trackId: string, color: string) => {
      setTracks(tracks.map((t) => (t.id === trackId ? { ...t, color } : t)));
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

  const { handleSaveMix, handleLoadMix, handleDeleteMix, handleCompareMix } =
    useMixSnapshots({
      tracks,
      setTracks,
      mixSnapshots,
      setMixSnapshots,
      activeMixId,
      setActiveMixId,
    });

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
    <View className="flex-1 bg-dark-bg select-none flex-row">
      {resp.isDesktop && (
        <Sidebar
          currentRoute="studio"
          onNavigate={handleNavigate}
          isOpen
          onClose={() => {}}
          isPersistent
        />
      )}
      {isFromOnboarding && !tooltipDismissed && (
        <StudioOnboardingCoachmark
          onDismiss={() => {
            setTooltipDismissed(true);
            completeOnboarding();
          }}
        />
      )}
      {drawerOpen && (
        <StudioDrawer
          onClose={() => setDrawerOpen(false)}
          onNavigate={handleNavigate}
        />
      )}
      <View className="flex-1">
      <View
        className={`${resp.isMobile ? "h-12 px-2" : "h-14 px-4"} bg-dark-surface/95 border-b border-dark-border/50 flex-row items-center justify-between`}
      >
        <View className="flex-row items-center gap-2">
          {editingTitle ? (
            <TextInput
              ref={titleInputRef}
              value={projectTitle}
              onChangeText={setProjectTitle}
              onBlur={commitTitle}
              onSubmitEditing={commitTitle}
              accessibilityLabel="Título do projeto"
              returnKeyType="done"
              autoFocus
              className="h-9 px-2 rounded-lg bg-dark-elevated text-white text-sm border border-brand-primary/60 min-w-[140px] max-w-[200px]"
            />
          ) : (
            <Pressable
              onPress={() => setEditingTitle(true)}
              accessibilityRole="button"
              accessibilityLabel="Editar título do projeto"
              className="h-9 px-2 rounded-lg items-center justify-center bg-dark-muted/30 active:opacity-70 focus-ring max-w-[200px]"
            >
              <Text className="text-white font-bold text-sm" numberOfLines={1} ellipsizeMode="tail">
                {projectTitle}
              </Text>
            </Pressable>
          )}
          {!resp.isDesktop && (
            <Pressable
              onPress={() => setDrawerOpen(true)}
              className="w-8 h-8 rounded-lg bg-dark-muted/30 items-center justify-center active:opacity-70 mr-1"
            >
              <Text className="text-gray-300 text-base">☰</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => seekRelative(-5)}
            accessibilityRole="button"
            accessibilityLabel="Voltar 5 segundos"
            className="w-8 h-8 rounded-lg bg-dark-muted items-center justify-center active:opacity-70 focus-ring"
          >
            <Text className="text-gray-300 text-xs">⏮</Text>
          </Pressable>
          <Pressable
            onPress={togglePlay}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Pausar" : "Reproduzir"}
            className={`w-11 h-11 rounded-full items-center justify-center focus-ring ${isPlaying ? "bg-green-600" : "bg-dark-border"}`}
          >
            <Text className="text-white text-lg">{isPlaying ? "⏸" : "▶"}</Text>
          </Pressable>
          <Pressable
            onPress={toggleRecording}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? "Parar gravação" : "Gravar"}
            className={`w-11 h-11 rounded-full items-center justify-center focus-ring ${isRecording ? "bg-red-600" : recordSettings.armed ? "bg-red-500/30" : "bg-dark-border"}`}
          >
            <View
              className={`w-4 h-4 rounded-sm ${isRecording ? "bg-white" : "bg-red-500"}`}
            />
          </Pressable>
          <Pressable
            onPress={() => seekRelative(5)}
            accessibilityRole="button"
            accessibilityLabel="Avançar 5 segundos"
            className="w-8 h-8 rounded-lg bg-dark-muted items-center justify-center active:opacity-70 focus-ring"
          >
            <Text className="text-gray-300 text-xs">⏭</Text>
          </Pressable>
          <Pressable
            onPress={stopPlayback}
            accessibilityRole="button"
            accessibilityLabel="Parar"
            className="w-8 h-8 rounded-lg bg-dark-muted items-center justify-center active:opacity-70 focus-ring"
          >
            <Text className="text-gray-300 text-xs">⏹</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-1.5">
          <Pressable
            onPress={undoHistory}
            accessibilityRole="button"
            accessibilityLabel="Desfazer"
            accessibilityState={{ disabled: !canUndo }}
            className={`w-8 h-8 rounded-lg items-center justify-center focus-ring ${canUndo ? "bg-dark-muted active:opacity-70" : "opacity-30"}`}
          >
            <Text className="text-gray-300 text-xs">↩</Text>
          </Pressable>
          <Pressable
            onPress={redoHistory}
            accessibilityRole="button"
            accessibilityLabel="Refazer"
            accessibilityState={{ disabled: !canRedo }}
            className={`w-8 h-8 rounded-lg items-center justify-center focus-ring ${canRedo ? "bg-dark-muted active:opacity-70" : "opacity-30"}`}
          >
            <Text className="text-gray-300 text-xs">↪</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={!resp.isDesktop}
          className="mx-2 flex-1 min-w-[200px]"
          contentContainerStyle={{ alignItems: "center", gap: 12, paddingHorizontal: 4, paddingRight: 40 }}
        >
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
            accessibilityRole="button"
            accessibilityLabel="Abrir paleta de comandos"
            className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted active:opacity-70 focus-ring"
          >
            <Text className="text-gray-300 text-xs font-bold">⌘K</Text>
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
              onPress={() => setShowPatchbay(true)}
              className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted active:opacity-70"
            >
              <Text className="text-gray-300 text-xs">🔌</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowMidi(true)}
              className="h-8 rounded-lg items-center justify-center px-2 bg-dark-muted active:opacity-70"
            >
              <Text className="text-gray-300 text-xs">🎹</Text>
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
        </ScrollView>

        {!resp.isDesktop && (
          <Pressable
            onPress={() => setShowToolbarOverflow(true)}
            accessibilityRole="button"
            accessibilityLabel="Mais ferramentas"
            className="h-8 rounded-lg flex-row items-center justify-center px-2 bg-dark-muted active:opacity-70 focus-ring"
          >
            <Text className="text-gray-300 text-xs">⋯ mais</Text>
          </Pressable>
        )}

        <Modal
          visible={showToolbarOverflow}
          transparent
          animationType="fade"
          onRequestClose={() => setShowToolbarOverflow(false)}
        >
          <Pressable
            className="flex-1 bg-black/50"
            onPress={() => setShowToolbarOverflow(false)}
          >
            <View className="mt-14 mr-2 ml-auto w-56 bg-dark-muted rounded-lg p-2 gap-1">
              {[
                { label: "🎵  Afinador", action: () => setShowTuner(true) },
                { label: "⌘K  Comandos", action: () => setShowCommandPalette(true) },
                { label: "⎇  Branches", action: () => setShowBranchManager(true) },
                { label: "✓  Commit", action: () => setShowCommitModal(true) },
                { label: "🎛️  Sampler", action: () => setShowSampler(true) },
                { label: "🎹  Synth", action: () => setShowSynth(true) },
                { label: "🔊  Saída de áudio", action: () => setShowOutputSelector(true) },
                { label: "🔌  Patchbay", action: () => setShowPatchbay(true) },
                { label: "🎹  MIDI", action: () => setShowMidi(true) },
                { label: "🔁  Looper", action: () => setShowLooper(true) },
                { label: "⌨  Code Sampler", action: () => setShowCodeSampler(true) },
                { label: "✨  Prompt Sampler", action: () => setShowPromptSampler(true) },
                { label: "📂  Samples", action: () => setShowSampleBrowser((prev) => !prev) },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    setShowToolbarOverflow(false);
                    item.action();
                  }}
                  className="h-9 rounded-md px-3 justify-center active:opacity-70"
                >
                  <Text className="text-gray-200 text-sm">{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

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
              {syncState.pending ? " · syncing..." : ""}
              {syncState.error ? ` · ${syncState.error}` : ""}
            </Text>
          )}
          <Pressable
            onPress={handleManualSave}
            className="bg-brand-primary px-5 py-2 rounded-xl active:opacity-80 shadow-sm shadow-brand-primary/20"
          >
            <Text className="text-white font-bold text-sm">Salvar</Text>
          </Pressable>
        </View>
      </View>

      <View className="h-10 bg-dark-surface/40 border-b border-dark-border/50 flex-row items-center px-4">
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
          <View
            className="flex-row items-center"
            style={{ width: 25 * secondsPerMarker * pxPerSec }}
          >
            {Array.from({ length: 25 }, (_, i) => (
              <View
                key={i}
                className="flex-row"
                style={{ width: secondsPerMarker * pxPerSec }}
              >
                <Text className="text-gray-600 font-mono text-[10px]">
                  {String(Math.floor((i * secondsPerMarker) / 60)).padStart(2, "0")}:
                  {String((i * secondsPerMarker) % 60).padStart(2, "0")}
                </Text>
                {i % 4 === 0 && (
                  <View className="w-px h-3 bg-gray-700 absolute right-0" />
                )}
              </View>
            ))}
          </View>
        </ScrollView>
        <View className="flex-row items-center gap-1 pl-2">
          <Pressable
            accessibilityLabel="Diminuir zoom"
            onPress={() => setZoom((z) => Math.max(0.5, +(z / 1.5).toFixed(2)))}
            className="w-7 h-7 rounded items-center justify-center bg-dark-muted/40 border border-dark-border text-gray-300 active:opacity-70"
          >
            <Text className="text-gray-300 text-sm font-bold">−</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Aumentar zoom"
            onPress={() => setZoom((z) => Math.min(3, +(z * 1.5).toFixed(2)))}
            className="w-7 h-7 rounded items-center justify-center bg-dark-muted/40 border border-dark-border text-gray-300 active:opacity-70"
          >
            <Text className="text-gray-300 text-sm font-bold">+</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Resetar zoom"
            onPress={() => setZoom(1)}
            className="w-7 h-7 rounded items-center justify-center bg-dark-muted/40 border border-dark-border text-gray-400 active:opacity-70"
          >
            <Text className="text-[10px] text-gray-400 font-bold">
              {Math.round(zoom * 100)}%
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="flex-1 flex-row">
        <View
          style={{ width: resp.tracksSidebarWidth }}
          className="bg-dark-bg/60 border-r border-dark-border/50"
        >
          {tracks.map((track) => {
            const gv = getGroupVolume(groups, track.id);
            const trackH = resp.isMobile ? 84 : resp.isDesktop ? 108 : 84;
            return (
              <View key={track.id} className="relative">
                <Pressable
                  onPress={() =>
                    setSelectedTrackId(
                      track.id === selectedTrackId ? null : track.id,
                    )
                  }
                  className={`p-2 border-b border-dark-border/40 justify-between bg-dark-surface/20 ${
                    selectedTrackId === track.id
                      ? "border-l-[3px] border-brand-primary bg-dark-elevated/40"
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
                        peakLevel={isAudible(track) ? Math.min(1, track.volume / 100) : 0}
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
                      className={`btn-mute ${track.muted ? "btn-mute-active" : ""}`}
                    >
                      <Text
                        className={`text-xs font-bold ${track.muted ? "text-amber-400" : "text-gray-400"}`}
                      >
                        M
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => toggleSolo(track.id)}
                      className={`btn-solo ${track.solo ? "btn-solo-active" : ""}`}
                    >
                      <Text
                        className={`text-xs font-bold ${track.solo ? "text-green-400" : "text-gray-400"}`}
                      >
                        S
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setTracks((prev) =>
                          prev.map((t) =>
                            t.id === track.id
                              ? { ...t, isArmed: !t.isArmed }
                              : { ...t, isArmed: false }, // Only one track armed at a time
                          ),
                        )
                      }
                      className={`w-7 h-7 rounded items-center justify-center border ${track.isArmed ? "bg-red-500/20 border-red-500/50" : "bg-dark-muted/30 border-dark-border/40"}`}
                    >
                      <Text
                        className={`text-xs font-bold ${track.isArmed ? "text-red-500" : "text-gray-400"}`}
                      >
                        R
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setShowAutomation((prev) => ({
                          ...prev,
                          [track.id]: !prev[track.id],
                        }))
                      }
                      className={`w-7 h-7 rounded-lg items-center justify-center border ${showAutomation[track.id] ? "bg-brand-accent/20 border-brand-accent/50" : "bg-dark-muted/30 border-dark-border/40"}`}
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
                    className={`w-7 h-7 rounded-lg items-center justify-center border ${showPanAutomation[track.id] ? "bg-brand-accent/20 border-brand-accent/50" : "bg-dark-muted/30 border-dark-border/40"}`}
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
          <View className="p-1.5 gap-1.5 border-t border-dark-border/40 bg-dark-surface/20">
            <Pressable
              onPress={handleAddTrack}
              className="h-8 rounded-lg bg-dark-muted/30 items-center justify-center flex-row gap-1.5 active:opacity-70 border border-dark-border/30"
            >
              <Text className="text-gray-300 text-xs font-bold">+</Text>
              <Text className="text-gray-300 text-[10px] font-semibold">Track</Text>
            </Pressable>
            <Pressable
              onPress={handleImportAudio}
              className="h-8 rounded-lg bg-dark-muted/30 items-center justify-center flex-row gap-1.5 active:opacity-70 border border-dark-border/30"
            >
              <Text className="text-gray-300 text-xs">📁</Text>
              <Text className="text-gray-300 text-[10px] font-semibold">Audio</Text>
            </Pressable>
            <Pressable
              onPress={handleAddMidiTrack}
              className="h-8 rounded-lg bg-dark-muted/30 items-center justify-center flex-row gap-1.5 active:opacity-70 border border-dark-border/30"
            >
              <Text className="text-gray-300 text-xs">🎹</Text>
              <Text className="text-gray-300 text-[10px] font-semibold">MIDI</Text>
            </Pressable>
            <Pressable
              onPress={handleMidiImport}
              className="h-8 rounded-lg bg-dark-muted/30 items-center justify-center flex-row gap-1.5 active:opacity-70 border border-dark-border/30"
            >
              <Text className="text-gray-300 text-xs">📂</Text>
              <Text className="text-gray-300 text-[10px] font-semibold">Import</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal className="flex-1 bg-dark-bg">
          {tracks.length === 0 ? (
              <View className="flex-1 items-center justify-center px-6" style={{ width: timelineWidth }}>
              <Text className="text-gray-400 text-base font-semibold">Nenhuma track ainda</Text>
              <Text className="text-gray-500 text-xs mt-1 text-center">
                Adicione uma track para começar
              </Text>
            </View>
          ) : (
          <View style={{ width: timelineWidth }}>
            <View
              className="relative"
              onPointerMove={handleTimelinePointerMove}
              style={{ height: tracks.length * (resp.isMobile ? 84 : resp.isDesktop ? 108 : 84) }}
            >
              {tracks.map((track, trackIndex) => {
                const showAuto = showAutomation[track.id];
                const showPanAuto = showPanAutomation[track.id];
                const trackH = resp.isMobile ? 84 : resp.isDesktop ? 108 : 84;
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
                            left: region.start * pxPerSec,
                            width: region.duration * pxPerSec,
                            position: "absolute",
                          }}
                          className={`h-14 rounded-xl border border-white/10 overflow-hidden shadow-md ${
                            track.color
                          } ${isAudible(track) ? "opacity-95" : "opacity-25"}`}
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
                      {isRecording && track.isArmed && (
                        <View
                          style={{
                            left: currentBeat * pxPerSec, // rough sync with beat width, but usually recording starts at current position
                            width: ((Date.now() - (webRecordingStart || Date.now())) / 1000 + recordingTick * 0) * (initialBpm / 60) * pxPerSec,
                            minWidth: 100, // so we can see it growing
                            position: "absolute",
                          }}
                          className={`h-14 rounded-xl border border-red-500/50 overflow-hidden shadow-md bg-red-500/20`}
                        >
                          <LiveWaveformCanvas dataRef={liveRecordingDataRef} height={56} />
                        </View>
                      )}
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
                  style={{ left: currentTime * pxPerSec }}
                />
              )}
              <CollaboratorCursors cursors={cursors} timelineWidth={timelineWidth} />
            </View>
          </View>
          )}
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
      <View className="bg-dark-surface border-t border-dark-border/60">
        <View className="flex-row border-b border-dark-border/40">
          {bottomTabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setBottomTab(tab.key)}
              className={`flex-1 py-2.5 flex-row items-center justify-center gap-1.5 ${
                bottomTab === tab.key
                  ? "bg-dark-surface border-b-2 border-brand-primary"
                  : "opacity-50"
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
                <Text className="text-[10px] text-gray-400">+Send</Text>
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
                      className="mixer-channel p-2.5 items-center gap-1.5"
                    >
                      <Text className="text-[10px] text-gray-400 font-medium truncate w-full text-center">
                        {track.name}
                      </Text>
                      <View className="flex-row gap-1">
                        <Pressable
                          onPress={() => toggleMute(track.id)}
                          className={`btn-mute ${track.muted ? "btn-mute-active" : ""}`}
                        >
                          <Text
                            className={`text-[9px] font-bold ${track.muted ? "text-amber-400" : "text-gray-500"}`}
                          >
                            M
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => toggleSolo(track.id)}
                          className={`btn-solo ${track.solo ? "btn-solo-active" : ""}`}
                        >
                          <Text
                            className={`text-[9px] font-bold ${track.solo ? "text-green-400" : "text-gray-500"}`}
                          >
                            S
                          </Text>
                        </Pressable>
                      </View>
                      <View className="flex-row items-stretch flex-1 w-full gap-1">
                        <VuMeter
                          level={effVol / 100}
                          peakLevel={isAudible(track) ? Math.min(1, effVol / 100) : 0}
                        />
                        <Pressable
                          onLayout={(e) =>
                            (faderHeightRef.current[track.id] =
                              e.nativeEvent.layout.height)
                          }
                          onPress={(e) => {
                            const h = faderHeightRef.current[track.id];
                            const y = e.nativeEvent.locationY;
                            if (!h) return;
                            const vol = Math.round((1 - y / h) * 100);
                            setTrackVolume(
                              track.id,
                              Math.min(100, Math.max(0, vol)),
                            );
                          }}
                          className="w-3 flex-1 bg-dark-bg rounded-full relative justify-end overflow-hidden active:opacity-80"
                        >
                          <View
                            style={{ height: `${effVol}%` }}
                            className={`w-full rounded-full ${isAudible(track) ? "bg-brand-primary" : "bg-gray-600"}`}
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
                          className="w-5 h-5 rounded bg-dark-muted/30 items-center justify-center active:opacity-70"
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
                          className="w-5 h-5 rounded bg-dark-muted/30 items-center justify-center active:opacity-70"
                        >
                          <Text className="text-gray-400 text-[11px]">+</Text>
                        </Pressable>
                      </View>
                      <View className="w-full h-6 flex-row items-center gap-1">
                        <Text className="text-[9px] text-gray-600 w-4 text-center">
                          L
                        </Text>
                        <Pressable
                          onLayout={(e) =>
                            (panWidthRef.current[track.id] =
                              e.nativeEvent.layout.width)
                          }
                          onPress={(e) => {
                            const w = panWidthRef.current[track.id];
                            const x = e.nativeEvent.locationX;
                            if (!w) return;
                            const pan = Math.round((x / w) * 200 - 100);
                            setTrackPan(
                              track.id,
                              Math.min(100, Math.max(-100, pan)),
                            );
                          }}
                          className="flex-1 h-1 bg-dark-bg rounded-full overflow-hidden"
                        >
                          <View
                            className="h-full bg-cyan-500 rounded-full"
                            style={{ width: `${(track.pan + 100) / 2}%` }}
                          />
                        </Pressable>
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
                    </View>
                  );
                })}
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
                    bpm: initialBpm,
                    key: projectKey,
                    timeSignature: projectTimeSig,
                  });
                } else {
                  try {
                    const url = await renderTracksToUrl(tracks, initialBpm, projectMood, buses);
                    if (url) {
                      setMasteringInput({
                        url,
                        filename: projectTitle,
                        stems: tracks.map((t) => ({ name: t.name, url })),
                        bpm: initialBpm,
                        key: projectKey,
                        timeSignature: projectTimeSig,
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

      <StudioModals
        recordSettings={recordSettings}
        setRecordSettings={setRecordSettings}
        showRecordOptions={showRecordOptions}
        setShowRecordOptions={setShowRecordOptions}
        editingPlugin={editingPlugin}
        handlePluginParamChange={handlePluginParamChange}
        handleTogglePlugin={handleTogglePlugin}
        setEditingPlugin={setEditingPlugin}
        setEditingPluginSource={setEditingPluginSource}
        isPlaying={isPlaying}
        currentTime={currentTime}
        showBounce={showBounce}
        setShowBounce={setShowBounce}
        projectTitle={projectTitle}
        duration={duration}
        tracks={tracks}
        showCodeSampler={showCodeSampler}
        setShowCodeSampler={setShowCodeSampler}
        handleCodeRender={handleCodeRender}
        showPromptSampler={showPromptSampler}
        setShowPromptSampler={setShowPromptSampler}
        handlePromptMidiRender={handlePromptMidiRender}
        bpm={metronome.bpm}
        showTuner={showTuner}
        setShowTuner={setShowTuner}
        showSampler={showSampler}
        setShowSampler={setShowSampler}
        setTracks={setTracks}
        setSelectedTrackId={setSelectedTrackId}
        showSynth={showSynth}
        setShowSynth={setShowSynth}
        showLooper={showLooper}
        setShowLooper={setShowLooper}
        currentMidiNotes={currentMidiNotes}
        handlePianoRollChange={handlePianoRollChange}
        projectKey={projectKey}
        showPianoRoll={showPianoRoll}
        setShowPianoRoll={setShowPianoRoll}
        setEditingMidiTrackId={setEditingMidiTrackId}
        selectedMidiTrack={selectedMidiTrack}
        showCommandPalette={showCommandPalette}
        setShowCommandPalette={setShowCommandPalette}
        showBranchManager={showBranchManager}
        setShowBranchManager={setShowBranchManager}
        showCommitModal={showCommitModal}
        setShowCommitModal={setShowCommitModal}
        showOutputSelector={showOutputSelector}
        setShowOutputSelector={setShowOutputSelector}
        showPatchbay={showPatchbay}
        setShowPatchbay={setShowPatchbay}
        trackIds={trackIds}
        showMidi={showMidi}
        setShowMidi={setShowMidi}
        autoplayBlocked={autoplayBlocked}
        setAutoplayBlocked={setAutoplayBlocked}
      />
      </View>
    </View>
  );
}
