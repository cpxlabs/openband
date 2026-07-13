import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Alert } from "react-native";
import type { Mood } from "../../src/lib/projectTemplates";
import type { MixSnapshot, TrackDef } from "../../src/lib/types";
import {
  saveProject,
  loadProject,
  type ProjectData,
} from "../../src/lib/projectStore";

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
