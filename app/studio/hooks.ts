import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction, MutableRefObject } from "react";
import { Alert } from "react-native";
import { AudioModule, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer, AudioStatus } from "expo-audio";
import type { Mood } from "../../src/lib/projectTemplates";
import type { MixSnapshot, TrackDef, BusDef, Plugin, GroupDef, SendBus, TrackAmpChain } from "../../src/lib/types";
import {
  MASTERING_CHAIN_PRESETS,
  buildMasteringChain,
} from "../../src/lib/mastering";
import type { PluginSource } from "./parts";
import {
  saveProject,
  loadProject,
  type ProjectData,
} from "../../src/lib/projectStore";
import { PlaybackEngine } from "../../src/lib/playbackEngine";
import {
  renderTracksToUrl,
  disposeAudioContext,
  getProjectDurationSeconds,
} from "../../src/lib/midiSynth";
import {
  audioSystem,
  createTrackedBlob,
  markBlobActive,
  revokeTrackedBlob,
} from "../../src/lib/universalAudio";
import {
  startClock,
  stopClock,
  onClockTick,
  disposeClockManager,
} from "../../src/lib/clockManager";
import {
  startTelemetry,
  stopTelemetry,
  sendTelemetryReport,
  recordFrame,
  recordCpuLoad,
} from "../../src/lib/audioTelemetry";
import type { useWebAudioPlayer } from "../../src/hooks/useWebAudioPlayer";
import { pitchShift } from "../../src/lib/timeStretch";
import { audioBufferToWavBlob } from "../../src/lib/audio";

type Snapshot = Omit<ProjectData, "id" | "lastSaved">;

const ALL_MOODS: Mood[] = [
  "dark",
  "bright",
  "warm",
  "cold",
  "aggressive",
  "chill",
  "epic",
  "minimal",
  "nostalgic",
  "euphoric",
];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export type BottomTab =
  | "mixer"
  | "fx"
  | "mastering"
  | "groups"
  | "buses"
  | "mixes"
  | "chords";

export interface ProjectParams {
  id: string;
  genreParam?: string;
  projectKey?: string;
  initialBpm: number;
  initialTitle: string;
  projectMood?: Mood;
  initialNumBars: number;
  projectTimeSig: string;
  isScratch: boolean;
  rawTab?: string;
  rawTool?: string;
  isFromOnboarding: boolean;
  initialBottomTab: BottomTab;
}

/** Parses the studio route params into a typed, normalized project config. */
export function useProjectParams(): ProjectParams {
  const params = useLocalSearchParams<{
    id: string;
    genre?: string;
    key?: string;
    bpm?: string;
    title?: string;
    mood?: string;
    numBars?: string;
    timeSignature?: string;
    scratch?: string;
    tab?: string;
    tool?: string;
    fromOnboarding?: string;
  }>();

  const id = first(params.id) as string;
  const genreParam = first(params.genre);
  const projectKey = first(params.key);
  const bpmRaw = first(params.bpm);
  const initialBpm = bpmRaw ? parseInt(bpmRaw, 10) || 120 : 120;
  const initialTitle = first(params.title) || "Projeto";
  const rawMood = first(params.mood);
  const projectMood = ALL_MOODS.includes(rawMood as Mood)
    ? (rawMood as Mood)
    : undefined;
  const numBarsRaw = first(params.numBars);
  const initialNumBars = numBarsRaw ? parseInt(numBarsRaw, 10) || 8 : 8;
  const projectTimeSig = first(params.timeSignature) || "4/4";
  const isScratch = first(params.scratch) === "1";
  const rawTab = first(params.tab);
  const rawTool = first(params.tool);
  const isFromOnboarding = first(params.fromOnboarding) === "1";

  const initialBottomTab: BottomTab =
    rawTab === "fx" ||
    rawTab === "mastering" ||
    rawTab === "groups" ||
    rawTab === "buses" ||
    rawTab === "mixes" ||
    rawTab === "chords"
      ? rawTab
      : "mixer";

  return {
    id,
    genreParam,
    projectKey,
    initialBpm,
    initialTitle,
    projectMood,
    initialNumBars,
    projectTimeSig,
    isScratch,
    rawTab,
    rawTool,
    isFromOnboarding,
    initialBottomTab,
  };
}

/**
 * Owns project persistence: hydrates from storage on mount, debounce-autosaves
 * whenever the (memoized) snapshot changes, and exposes save helpers + the
 * transient "saved" label.
 */
export function useStudioPersistence(params: {
  id: string;
  snapshot: Snapshot;
  hydrate: (saved: ProjectData) => void;
}): {
  lastSavedLabel: string | null;
  save: (overrideTitle?: string) => void;
  handleManualSave: () => void;
} {
  const { id, snapshot, hydrate } = params;
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null);
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep latest snapshot/hydrate in refs so the imperative save helpers stay
  // stable and the hydrate effect only runs on `id` change.
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const hydrateRef = useRef(hydrate);
  hydrateRef.current = hydrate;

  const save = useCallback(
    (overrideTitle?: string) => {
      const snap = snapshotRef.current;
      saveProject(
        id,
        overrideTitle != null ? { ...snap, title: overrideTitle } : snap,
      );
    },
    [id],
  );

  const flashLabel = useCallback((text: string) => {
    setLastSavedLabel(text);
    if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    labelTimerRef.current = setTimeout(() => setLastSavedLabel(null), 2000);
  }, []);

  const handleManualSave = useCallback(() => {
    save();
    flashLabel("Salvo ✓");
  }, [save, flashLabel]);

  // Hydrate from storage on mount / id change.
  useEffect(() => {
    const saved = loadProject(id);
    if (saved) hydrateRef.current(saved);
  }, [id]);

  // Debounced autosave whenever the snapshot content changes.
  useEffect(() => {
    const timer = setTimeout(() => {
      save();
      flashLabel("Salvo");
    }, 2000);
    return () => clearTimeout(timer);
  }, [snapshot, id, save, flashLabel]);

  useEffect(
    () => () => {
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    },
    [],
  );

  return { lastSavedLabel, save, handleManualSave };
}

/** Mix snapshot (A/B) save / load / delete / compare handlers. */
export function useMixSnapshots(params: {
  tracks: TrackDef[];
  setTracks: (tracks: TrackDef[]) => void;
  mixSnapshots: MixSnapshot[];
  setMixSnapshots: Dispatch<SetStateAction<MixSnapshot[]>>;
  activeMixId: string | undefined;
  setActiveMixId: Dispatch<SetStateAction<string | undefined>>;
}) {
  const {
    tracks,
    setTracks,
    mixSnapshots,
    setMixSnapshots,
    activeMixId,
    setActiveMixId,
  } = params;

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
    [tracks, setMixSnapshots, setActiveMixId],
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
    [mixSnapshots, setTracks, tracks, setActiveMixId],
  );

  const handleDeleteMix = useCallback(
    (snapId: string) => {
      setMixSnapshots((prev) => prev.filter((s) => s.id !== snapId));
      if (activeMixId === snapId) setActiveMixId(undefined);
    },
    [activeMixId, setMixSnapshots, setActiveMixId],
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

  return { handleSaveMix, handleLoadMix, handleDeleteMix, handleCompareMix };
}

/**
 * Extracted modal/overlay boolean state for the Studio screen. All 17 modal
 * flags live here so call sites in `[id].tsx` stay unchanged. Setters from
 * `useState` are stable, so returning them directly preserves identity.
 */
export function useStudioModals(init: { synth: boolean; pianoRoll: boolean }) {
  const [showRecordOptions, setShowRecordOptions] = useState(false);
  const [showBounce, setShowBounce] = useState(false);
  const [showSampleBrowser, setShowSampleBrowser] = useState(false);
  const [showCodeSampler, setShowCodeSampler] = useState(false);
  const [showTuner, setShowTuner] = useState(false);
  const [showLooper, setShowLooper] = useState(false);
  const [showSampler, setShowSampler] = useState(false);
  const [showSynth, setShowSynth] = useState(init.synth);
  const [showPromptSampler, setShowPromptSampler] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showBranchManager, setShowBranchManager] = useState(false);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [showOutputSelector, setShowOutputSelector] = useState(false);
  const [showPatchbay, setShowPatchbay] = useState(false);
  const [showMidi, setShowMidi] = useState(false);
  const [showToolbarOverflow, setShowToolbarOverflow] = useState(false);
  const [showPianoRoll, setShowPianoRoll] = useState(init.pianoRoll);

  return {
    showRecordOptions,
    setShowRecordOptions,
    showBounce,
    setShowBounce,
    showSampleBrowser,
    setShowSampleBrowser,
    showCodeSampler,
    setShowCodeSampler,
    showTuner,
    setShowTuner,
    showLooper,
    setShowLooper,
    showSampler,
    setShowSampler,
    showSynth,
    setShowSynth,
    showPromptSampler,
    setShowPromptSampler,
    showCommandPalette,
    setShowCommandPalette,
    showBranchManager,
    setShowBranchManager,
    showCommitModal,
    setShowCommitModal,
    showOutputSelector,
    setShowOutputSelector,
    showPatchbay,
    setShowPatchbay,
    showMidi,
    setShowMidi,
    showToolbarOverflow,
    setShowToolbarOverflow,
    showPianoRoll,
    setShowPianoRoll,
  };
}

/**
 * Applies a cumulative pitch shift (in semitones) to a rendered audio URL,
 * producing a new tracked blob and revoking the source. Falls back to the
 * original URL on failure.
 */
export async function applyPitchShift(
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

/**
 * Owns the Studio playback-TRANSPORT concern: the WebAudio/Native playback
 * engine, audio-mode/permission setup, clock + telemetry wiring, and the
 * play/seek/stop imperative controls. This is a faithful relocation of the
 * transport logic that previously lived inline in `app/studio/[id].tsx`.
 */
export function useStudioTransport(params: {
  isWeb: boolean;
  player: AudioPlayer;
  status: AudioStatus;
  webAudio: ReturnType<typeof useWebAudioPlayer>;
  tracks: TrackDef[];
  initialBpm: number;
  projectMood?: Mood;
  buses: BusDef[];
  projectTimeSig: string;
  metronomeBpm: number;
  isConnected: boolean;
  pitchCorrected: boolean;
  playbackRate: number;
  pitchShiftSemitones: number;
  setCurrentBeat: (b: number) => void;
  setAutoplayBlocked: (v: boolean) => void;
  sendCursorRef: MutableRefObject<
    (x: number, trackId: string | null, time: number) => void
  >;
  selectedTrackIdRef: MutableRefObject<string | null>;
  durationRef: MutableRefObject<number>;
}): {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  engineActive: boolean;
  setEngineActive: Dispatch<SetStateAction<boolean>>;
  engineRef: MutableRefObject<PlaybackEngine | null>;
  currentSeekRef: MutableRefObject<number>;
  currentUrlRef: MutableRefObject<string | null>;
  getEngine: () => PlaybackEngine;
  togglePlay: () => Promise<void>;
  seekRelative: (seconds: number) => void;
  stopPlayback: () => void;
} {
  const {
    isWeb,
    player,
    status,
    webAudio,
    tracks,
    initialBpm,
    projectMood,
    buses,
    projectTimeSig,
    metronomeBpm,
    isConnected,
    pitchCorrected,
    playbackRate,
    pitchShiftSemitones,
    setCurrentBeat,
    setAutoplayBlocked,
    sendCursorRef,
    selectedTrackIdRef,
    durationRef,
  } = params;

  const currentUrlRef = useRef<string | null>(null);
  const engineRef = useRef<PlaybackEngine | null>(null);
  const [engineActive, setEngineActive] = useState(false);
  const currentSeekRef = useRef(0);

  function getEngine(): PlaybackEngine {
    if (!engineRef.current) engineRef.current = new PlaybackEngine();
    return engineRef.current;
  }

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

  useEffect(() => {
    if (isWeb) webAudio.setPlaybackRate(playbackRate);
    else player.playbackRate = playbackRate;
  }, [playbackRate, player, isWeb, webAudio]);

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
      const beat = ((timeSource * metronomeBpm) / 60) % (beatsPerMeasure * 4);
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
  }, [metronomeBpm, projectTimeSig, isConnected, isWeb, webAudio, engineActive]);

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

  useEffect(() => () => {
    if (isWeb && engineRef.current) engineRef.current.dispose();
    else if (isWeb) webAudio.pause();
    else player.pause();
  }, [player, isWeb, webAudio]);

  return {
    isPlaying,
    currentTime,
    duration,
    engineActive,
    setEngineActive,
    engineRef,
    currentSeekRef,
    currentUrlRef,
    getEngine,
    togglePlay,
    seekRelative,
    stopPlayback,
  };
}

/** Plugin/mastering-chain edit handlers (param change, toggle, preset load). */
export function usePluginChains(params: {
  editingPluginSource: PluginSource;
  selectedTrack: TrackDef | null;
  tracks: TrackDef[];
  setTracks: (tracks: TrackDef[]) => void;
  setMasteringChain: Dispatch<SetStateAction<Plugin[]>>;
  setMasterPlugins: Dispatch<SetStateAction<Plugin[]>>;
}) {
  const {
    editingPluginSource,
    selectedTrack,
    tracks,
    setTracks,
    setMasteringChain,
    setMasterPlugins,
  } = params;

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
    [editingPluginSource, selectedTrack, setTracks, tracks, setMasteringChain, setMasterPlugins],
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
    [editingPluginSource, selectedTrack, setTracks, tracks, setMasteringChain, setMasterPlugins],
  );

  const handleLoadMasteringPreset = useCallback(
    (index: number) => {
      const preset = MASTERING_CHAIN_PRESETS[index];
      if (!preset) return;
      setMasteringChain(buildMasteringChain(preset));
    },
    [setMasteringChain],
  );

  return { handlePluginParamChange, handleTogglePlugin, handleLoadMasteringPreset };
}

/**
 * Owns mixer + mix-snapshot state (groups, buses, sends, amp chains, track→bus
 * assignments, master/mastering plugin chains, saved mix snapshots). Returned
 * with identical names so call sites are unchanged.
 */
export function useMixerState() {
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

  return {
    groups,
    setGroups,
    buses,
    setBuses,
    sendBuses,
    setSendBuses,
    trackAmpChains,
    setTrackAmpChains,
    trackAssignments,
    setTrackAssignments,
    masterPlugins,
    setMasterPlugins,
    masteringChain,
    setMasteringChain,
    mixSnapshots,
    setMixSnapshots,
    activeMixId,
    setActiveMixId,
  };
}
