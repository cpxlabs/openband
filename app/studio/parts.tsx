import { View, Text } from "react-native";
import type { PresenceCursor } from "../../src/lib/presence";
import type { ProjectData } from "../../src/lib/projectStore";
import type { Mood } from "../../src/lib/projectTemplates";
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
} from "../../src/lib/types";

export type PluginSource = "mastering" | "masterRack" | "track" | null;

/**
 * Builds the serializable project snapshot persisted via `saveProject`.
 * Centralizes the shape so the title-commit and autosave paths stay in sync.
 */
export function buildProjectData(fields: {
  title: string;
  genre?: string;
  key?: string;
  mood?: Mood;
  metronome: MetronomeSettings;
  tracks: TrackDef[];
  groups: GroupDef[];
  buses: BusDef[];
  trackAssignments: Record<string, string | null>;
  masterPlugins: Plugin[];
  masteringChain: Plugin[];
  mixSnapshots: MixSnapshot[];
  activeMixId: string | undefined;
  recordSettings: RecordSettings;
  sendBuses: SendBus[];
  trackAmpChains: Record<string, TrackAmpChain>;
}): Omit<ProjectData, "id" | "lastSaved"> {
  return {
    title: fields.title,
    genre: fields.genre || "",
    key: fields.key || "",
    mood: fields.mood,
    bpm: fields.metronome.bpm,
    tracks: fields.tracks,
    groups: fields.groups,
    buses: fields.buses,
    trackAssignments: fields.trackAssignments,
    masterPlugins: fields.masterPlugins,
    masteringChain: fields.masteringChain,
    mixSnapshots: fields.mixSnapshots,
    activeMixId: fields.activeMixId,
    metronome: fields.metronome,
    recordSettings: fields.recordSettings,
    sendBuses: fields.sendBuses,
    trackAmpChains: fields.trackAmpChains,
  };
}

export const TIMELINE_WIDTH = 1200;

export const GROUP_COLORS = [
  "#ff6482",
  "#5ac8fa",
  "#ffcc00",
  "#34c759",
  "#bf5af2",
  "#ff9f0a",
  "#00d4aa",
];

export const TRACK_COLORS = [
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

export function TimeDisplay({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return (
    <Text className="text-white font-mono text-base tracking-wider">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </Text>
  );
}

export function CollaboratorCursors({
  cursors,
  timelineWidth,
}: {
  cursors: Map<string, PresenceCursor>;
  timelineWidth: number;
}) {
  const list = Array.from(cursors.values());
  if (list.length === 0) return null;
  return (
    <>
      {list.map((c) => (
        <View
          key={c.userId}
          pointerEvents="none"
          className="absolute top-0 bottom-0 z-20 items-start"
          style={{ left: Math.max(0, Math.min(1, c.cursorX)) * timelineWidth }}
        >
          <View className="w-0.5 flex-1 bg-brand-accent/70" />
          <View className="absolute top-0 left-0 px-1.5 py-0.5 rounded bg-brand-accent">
            <Text className="text-white text-[9px] font-bold">
              {c.userName ?? c.userId}
            </Text>
          </View>
        </View>
      ))}
    </>
  );
}
