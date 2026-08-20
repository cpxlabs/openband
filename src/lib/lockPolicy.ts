import { GENRES, getTrackType } from "./projectTemplates";
import { ProjectStarterResult } from "./projectStarter";
import type { TrackDef } from "./types";

export function normalizeTrackContent(track: TrackDef) {
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

export type LockRole = "rhythm" | "bass" | "harmony" | "melody" | "fx";

const TRACK_TYPE_TO_ROLE: Record<string, LockRole> = {
  drums: "rhythm", percussion: "rhythm",
  bass: "bass",
  guitar: "harmony", keys: "harmony", synth_lead: "harmony", pad: "harmony",
  vocal: "melody",
  fx: "fx", sample: "fx",
};

export function roleForTrackType(trackType: string | undefined): LockRole {
  if (trackType && TRACK_TYPE_TO_ROLE[trackType]) return TRACK_TYPE_TO_ROLE[trackType];
  return "harmony";
}

function hashString(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ (h << 5) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function trackRole(track: TrackDef, genreId: string, index: number): LockRole {
  const genre = GENRES.find((g) => g.id === genreId);
  const tt = genre?.suggestedTracks?.[index]?.trackType;
  return roleForTrackType(tt ?? getTrackType(track.name));
}

export function computeRoleHashes(result: ProjectStarterResult, genreId: string): Record<LockRole, string> {
  const acc: Record<LockRole, string[]> = { rhythm: [], bass: [], harmony: [], melody: [], fx: [] };
  result.tracks.forEach((track, i) => {
    const role = trackRole(track, genreId, i);
    acc[role].push(hashString(JSON.stringify(normalizeTrackContent(track))));
  });
  const out = {} as Record<LockRole, string>;
  (Object.keys(acc) as LockRole[]).forEach((r) => {
    out[r] = acc[r].length ? hashString(acc[r].join("|")) : "";
  });
  return out;
}

export function applyLocks(
  prev: ProjectStarterResult,
  next: ProjectStarterResult,
  locks: Partial<Record<LockRole, boolean>>,
  genreId: string,
): ProjectStarterResult {
  const prevByRole: Record<LockRole, TrackDef[]> = { rhythm: [], bass: [], harmony: [], melody: [], fx: [] };
  prev.tracks.forEach((t, i) => prevByRole[trackRole(t, genreId, i)].push(t));

  const nextTracks = next.tracks.map((track, i) => {
    const role = trackRole(track, genreId, i);
    if (locks[role]) {
      const replacement = prevByRole[role].shift();
      return replacement ? { ...replacement } : track;
    }
    return track;
  });

  return { ...next, tracks: nextTracks };
}

export function evaluateKeyChange(
  locks: Partial<Record<LockRole, boolean>>,
  _fromKey: string,
  _toKey: string,
): { invalidated: LockRole[] } {
  if (_fromKey === _toKey) return { invalidated: [] };
  const affected: LockRole[] = ["harmony", "melody", "bass"];
  return { invalidated: affected.filter((r) => locks[r]) };
}

export function evaluateBpmChange(
  locks: Partial<Record<LockRole, boolean>>,
  _fromBpm: number,
  _toBpm: number,
): { invalidated: LockRole[] } {
  if (_fromBpm === _toBpm) return { invalidated: [] };
  const affected: LockRole[] = ["rhythm", "bass", "harmony", "melody"];
  return { invalidated: affected.filter((r) => locks[r]) };
}

export function detectIncompatibleLocks(
  genreId: string,
  locks: Partial<Record<LockRole, boolean>>,
): LockRole[] {
  const genre = GENRES.find((g) => g.id === genreId);
  const presentRoles = new Set<LockRole>();
  genre?.suggestedTracks?.forEach((t) => presentRoles.add(roleForTrackType(t.trackType)));
  return (Object.keys(locks) as LockRole[]).filter(
    (r) => locks[r] && !presentRoles.has(r),
  );
}
