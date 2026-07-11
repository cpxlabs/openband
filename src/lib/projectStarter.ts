import {
  TrackDef,
} from "./types";
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
