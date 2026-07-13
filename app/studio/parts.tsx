import { View, Text, Pressable, ScrollView } from "react-native";
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

/** Onboarding coachmark overlay shown when arriving from onboarding. */
export function StudioOnboardingCoachmark({
  onDismiss,
}: {
  onDismiss: () => void;
}) {
  return (
    <View
      testID="onboarding-coachmarks"
      className="absolute inset-0 z-[60] bg-black/70 justify-end"
    >
      <View className="mx-4 mb-28 p-4 rounded-2xl bg-dark-elevated border border-brand-primary/40">
        <Text className="text-white font-bold text-base mb-1">Transporte</Text>
        <Text className="text-gray-300 text-xs leading-5 mb-3">
          Use o botão ▶ para tocar sua música e o botão ● vermelho para gravar um
          áudio com o microfone.
        </Text>
        <Pressable
          testID="onboarding-coachmark-dismiss"
          onPress={onDismiss}
          className="bg-brand-primary rounded-xl py-3 items-center active:opacity-80"
        >
          <Text className="text-white font-bold text-sm">Começar a produzir</Text>
        </Pressable>
      </View>
    </View>
  );
}

const STUDIO_DRAWER_ITEMS = [
  { key: "index", label: "Feed", icon: "♫" },
  { key: "moments", label: "Momentos", icon: "♡" },
  { key: "library", label: "Biblioteca", icon: "☰" },
  { key: "account", label: "Conta", icon: "●" },
  { key: "settings", label: "Ajustes", icon: "⚙" },
];

/** Slide-in navigation drawer for the studio on mobile. */
export function StudioDrawer({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (key: string) => void;
}) {
  return (
    <View className="absolute inset-0 z-50 flex-row">
      <Pressable className="flex-1 bg-black/60" onPress={onClose} />
      <View className="w-64 bg-[#0d0d11] border-l border-dark-border/40 h-full">
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-border/40">
          <Text className="text-white font-bold text-base">
            Open<Text className="text-brand-primary">Band</Text>
          </Text>
          <Pressable
            onPress={onClose}
            className="w-7 h-7 rounded-full bg-dark-muted/30 items-center justify-center active:opacity-70"
          >
            <Text className="text-gray-400 text-sm">✕</Text>
          </Pressable>
        </View>
        <ScrollView className="flex-1 px-2 pt-2">
          {STUDIO_DRAWER_ITEMS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => onNavigate(item.key)}
              className="flex-row items-center gap-3 px-3 py-3 rounded-xl mb-0.5 border border-transparent"
            >
              <View className="w-8 h-8 rounded-lg bg-dark-muted/20 items-center justify-center">
                <Text className="text-base text-gray-400">{item.icon}</Text>
              </View>
              <Text className="flex-1 text-sm font-semibold text-gray-300">
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
