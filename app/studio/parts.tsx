import { View, Text } from "react-native";
import type { PresenceCursor } from "../../src/lib/presence";

export type PluginSource = "mastering" | "masterRack" | "track" | null;

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
