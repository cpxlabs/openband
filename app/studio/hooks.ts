import { useLocalSearchParams } from "expo-router";
import type { Mood } from "../../src/lib/projectTemplates";

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
