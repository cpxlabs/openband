import {
  generateTracksForGenre,
  GENRES,
  type Mood,
} from "./projectTemplates";
import { normalizedRecipe, contentHash, type Recipe } from "./snapshotPromotion";
import type { TrackDef } from "./types";

export function makeRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeSeed(seed: string | null | undefined): string {
  if (seed == null) return "";
  return String(seed).trim();
}

export function seedFromRecipe(recipe: Recipe, version: string): string {
  const direct = normalizeSeed(recipe.seed);
  if (direct) return direct;
  return contentHash({
    revision: 1,
    recipe,
    seed: "",
    version,
    uri: null,
    approved: true,
  });
}

export function generateDeterministicStarter(
  recipe: Recipe,
  seed: string | null | undefined,
  version: string,
): TrackDef[] {
  const s = normalizeSeed(seed) || seedFromRecipe(recipe, version);
  const rng = makeRng(`${version}::${s}`);
  const genre = GENRES.find((g) => g.id === recipe.genreId) ?? GENRES[0];
  return generateTracksForGenre(
    genre.id,
    recipe.bpm,
    recipe.key,
    (recipe.mood || undefined) as Mood | undefined,
    recipe.numBars,
    recipe.timeSignature,
    rng,
  );
}

function hashString(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ (h << 5) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function normalizeTrackContent(track: TrackDef) {
  return {
    name: track.name,
    volume: track.volume,
    pan: track.pan,
    regions: (track.regions ?? []).map((r) => ({ start: r.start, duration: r.duration })),
    plugins: (track.plugins ?? []).map((p) => ({ type: p.type, params: p.params })),
    midiNotes: (track.midiNotes ?? [])
      .map((n) => ({
        pitch: n.pitch,
        start: Math.round(n.start * 1000) / 1000,
        duration: Math.round(n.duration * 1000) / 1000,
        velocity: n.velocity,
      }))
      .sort((a, b) => a.start - b.start || a.pitch - b.pitch),
  };
}

export function normalizedContentHash(
  recipe: Recipe,
  seed: string | null | undefined,
  version: string,
): string {
  const tracks = generateDeterministicStarter(recipe, seed, version);
  const content = {
    version,
    seed: normalizeSeed(seed) || seedFromRecipe(recipe, version),
    recipe: normalizedRecipe(recipe),
    tracks: tracks.map(normalizeTrackContent),
  };
  return hashString(JSON.stringify(content));
}
