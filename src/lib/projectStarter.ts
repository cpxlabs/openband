import {
  TrackDef,
} from "./types";
import {
  ApprovedStarterSnapshot,
  Recipe,
  contentHash,
  createPromotionGate,
  createPromotionSession,
} from "./snapshotPromotion";
import {
  GENRES,
  Mood,
  TIME_SIGNATURES,
  MUSICAL_KEYS,
  generateTracksForGenre,
} from "./projectTemplates";

export interface ProjectStarterConfig {
  name: string;
  genreId: string;
  mood?: Mood;
  bpm?: number;
  numBars?: number;
  timeSignature?: string;
  key?: string;
  startFromScratch?: boolean;
}

export interface ProjectStarterResult {
  id: string;
  name: string;
  bpm: number;
  numBars: number;
  timeSignature: string;
  key: string;
  mood?: Mood;
  genreId: string;
  tracks: TrackDef[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function regionDurationFor(
  numBars: number,
  beatsPerBar: number,
  bpm: number,
): number {
  return (numBars * beatsPerBar * 60) / bpm;
}

export function setupProjectStarter(
  config: ProjectStarterConfig,
): ProjectStarterResult {
  const genre = GENRES.find((g) => g.id === config.genreId) ?? GENRES[0];
  const mood = config.mood;

  const bpmRaw = config.bpm ?? genre.defaultBpm;
  const bpm = clamp(bpmRaw, genre.bpmRange[0], genre.bpmRange[1]);

  const numBars = clamp(config.numBars ?? 8, 1, 64);

  const timeSignature =
    config.timeSignature && TIME_SIGNATURES.includes(config.timeSignature)
      ? config.timeSignature
      : "4/4";

  const key =
    config.key && MUSICAL_KEYS.includes(config.key)
      ? config.key
      : genre.defaultKey;

  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `proj-${Date.now()}`;

  const tracks: TrackDef[] = config.startFromScratch
    ? []
    : generateTracksForGenre(genre.id, bpm, key, mood, numBars, timeSignature);

  return {
    id,
    name: config.name,
    bpm,
    numBars,
    timeSignature,
    key,
    mood,
    genreId: genre.id,
    tracks,
  };
}

export function buildApprovedSnapshot(
  result: ProjectStarterResult,
  options?: { seed?: string; version?: string; uri?: string | null },
): ApprovedStarterSnapshot {
  const seed = options?.seed ?? result.id ?? "seed";
  const version = options?.version ?? "1";
  const uri = options?.uri ?? null;

  const recipe: Recipe = {
    genreId: result.genreId,
    mood: result.mood ?? "",
    bpm: result.bpm,
    key: result.key,
    timeSignature: result.timeSignature,
    numBars: result.numBars,
    seed,
    id: result.id,
    name: result.name,
  };

  const approvalToken = contentHash({
    revision: 1,
    recipe: { ...recipe, seed: "" },
    seed: "",
    version,
    uri: null,
    approved: true,
  });

  return {
    revision: 1,
    recipe,
    seed: recipe.seed,
    version,
    uri,
    approved: true,
    approvalToken,
    approvedAt: Date.now(),
  };
}

export type PromotionGate = ReturnType<typeof createPromotionGate>;
export type PromotionSession = ReturnType<typeof createPromotionSession>;

export {
  contentHash,
  computeStale,
  createPromotionGate,
  createPromotionSession,
  normalizedRecipe,
  type ApprovedStarterSnapshot,
  type GeneratedStarterSnapshot,
  type PromoteOptions,
  type PromoteResult,
  type PromotionOutcome,
  type Recipe,
} from "./snapshotPromotion";
