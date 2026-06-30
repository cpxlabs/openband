import type { TrackDef, Plugin } from "./types";

type TrackRole =
  | "kick"
  | "snare"
  | "hihat"
  | "bass"
  | "vocal"
  | "lead"
  | "pad"
  | "keys"
  | "guitar"
  | "fx"
  | "other";

interface MixPreset {
  vol: number;
  pan: number;
}

interface RoleMixProfile {
  volumeRange: [number, number];
  panPreference: number;
  eqBoost: { freq: number; gain: number; type: number }[];
  compress: boolean;
  compressionRatio: number;
}

const ROLE_PROFILES: Record<TrackRole, RoleMixProfile> = {
  kick: {
    volumeRange: [85, 95],
    panPreference: 0,
    eqBoost: [
      { freq: 60, gain: 3, type: 1 },
      { freq: 4000, gain: 2, type: 2 },
    ],
    compress: true,
    compressionRatio: 4,
  },
  snare: {
    volumeRange: [75, 85],
    panPreference: 0,
    eqBoost: [
      { freq: 200, gain: 2, type: 2 },
      { freq: 5000, gain: 3, type: 2 },
    ],
    compress: true,
    compressionRatio: 3,
  },
  hihat: {
    volumeRange: [55, 65],
    panPreference: 15,
    eqBoost: [{ freq: 8000, gain: 2, type: 4 }],
    compress: false,
    compressionRatio: 1,
  },
  bass: {
    volumeRange: [80, 90],
    panPreference: 0,
    eqBoost: [
      { freq: 80, gain: 3, type: 1 },
      { freq: 800, gain: -2, type: 2 },
    ],
    compress: true,
    compressionRatio: 4,
  },
  vocal: {
    volumeRange: [78, 88],
    panPreference: 0,
    eqBoost: [
      { freq: 3000, gain: 2, type: 2 },
      { freq: 120, gain: -1, type: 1 },
    ],
    compress: true,
    compressionRatio: 3,
  },
  lead: {
    volumeRange: [70, 80],
    panPreference: 10,
    eqBoost: [{ freq: 3500, gain: 2, type: 2 }],
    compress: false,
    compressionRatio: 1,
  },
  pad: {
    volumeRange: [50, 65],
    panPreference: -20,
    eqBoost: [
      { freq: 200, gain: -2, type: 2 },
      { freq: 6000, gain: 1, type: 4 },
    ],
    compress: false,
    compressionRatio: 1,
  },
  keys: {
    volumeRange: [60, 72],
    panPreference: -15,
    eqBoost: [{ freq: 2500, gain: 1, type: 2 }],
    compress: false,
    compressionRatio: 1,
  },
  guitar: {
    volumeRange: [65, 78],
    panPreference: 20,
    eqBoost: [
      { freq: 100, gain: -2, type: 1 },
      { freq: 4000, gain: 2, type: 2 },
    ],
    compress: false,
    compressionRatio: 1,
  },
  fx: {
    volumeRange: [40, 55],
    panPreference: 30,
    eqBoost: [],
    compress: false,
    compressionRatio: 1,
  },
  other: {
    volumeRange: [60, 75],
    panPreference: 0,
    eqBoost: [],
    compress: false,
    compressionRatio: 1,
  },
};

const PRESETS: Record<string, MixPreset[]> = {
  rock: [
    { vol: 85, pan: 0 },
    { vol: 70, pan: -30 },
    { vol: 80, pan: 0 },
    { vol: 75, pan: 30 },
    { vol: 65, pan: -15 },
  ],
  hiphop: [
    { vol: 90, pan: 0 },
    { vol: 65, pan: 0 },
    { vol: 75, pan: 0 },
    { vol: 60, pan: 10 },
    { vol: 55, pan: -10 },
  ],
  edm: [
    { vol: 95, pan: 0 },
    { vol: 60, pan: 0 },
    { vol: 70, pan: 0 },
    { vol: 55, pan: -20 },
    { vol: 50, pan: 20 },
  ],
  pop: [
    { vol: 80, pan: 0 },
    { vol: 75, pan: -10 },
    { vol: 70, pan: 10 },
    { vol: 65, pan: -20 },
    { vol: 60, pan: 20 },
  ],
  lofi: [
    { vol: 75, pan: 0 },
    { vol: 80, pan: -15 },
    { vol: 65, pan: 15 },
    { vol: 55, pan: -25 },
    { vol: 50, pan: 25 },
  ],
  jazz: [
    { vol: 70, pan: 0 },
    { vol: 75, pan: -25 },
    { vol: 65, pan: 25 },
    { vol: 60, pan: -35 },
    { vol: 55, pan: 35 },
  ],
};

export const AUTOMIX_GENRES = Object.keys(PRESETS);

function classifyTrack(track: TrackDef): TrackRole {
  const name = track.name.toLowerCase();

  if (/kick|bass\s*drum|bd/.test(name)) return "kick";
  if (/snare|sd|rim/.test(name)) return "snare";
  if (/hi[\s-]?hat|hh|open\s*hh|closed\s*hh|ride|crash/.test(name))
    return "hihat";
  if (/bass|808|sub|low/.test(name)) return "bass";
  if (/vocal|vox|voice|singer|rap/.test(name)) return "vocal";
  if (/lead|melody|synth\s*lead|arp/.test(name)) return "lead";
  if (/pad|atmos|ambient|string|choir/.test(name)) return "pad";
  if (/keys|piano|rhodes|organ|keys|epiano/.test(name)) return "keys";
  if (/guitar|gtr|acoustic|electric|riff/.test(name)) return "guitar";
  if (/fx|effect|riser|downlifter|sweep|noise/.test(name)) return "fx";

  const hasMidiNotes =
    track.midiNotes && track.midiNotes.length > 0;
  const hasAudioRegions =
    track.regions.length > 0 &&
    track.regions.some((r) => r.url);

  if (hasMidiNotes && !hasAudioRegions) {
    const avgPitch =
      track.midiNotes!.reduce((sum, n) => sum + n.pitch, 0) /
      track.midiNotes!.length;
    if (avgPitch < 50) return "bass";
    if (avgPitch > 75) return "lead";
    return "keys";
  }

  return "other";
}

function applyRoleProfile(
  track: TrackDef,
  role: TrackRole,
  _genre: string,
): TrackDef {
  const profile = ROLE_PROFILES[role];

  const vol =
    profile.volumeRange[0] +
    Math.random() * (profile.volumeRange[1] - profile.volumeRange[0]);

  let pan = profile.panPreference;
  if (role === "guitar") {
    pan = Math.random() > 0.5 ? 20 : -20;
  } else if (role === "pad") {
    pan = Math.random() > 0.5 ? -25 : 25;
  }

  const plugins: Plugin[] = [...track.plugins];

  if (profile.eqBoost.length > 0) {
    const eqPlugin = plugins.find((p) => p.type === "eq");
    if (eqPlugin) {
      const newParams = { ...eqPlugin.params };
      profile.eqBoost.forEach((eq, i) => {
        newParams[`b${i}_freq`] = eq.freq;
        newParams[`b${i}_gain`] = eq.gain;
        newParams[`b${i}_type`] = eq.type;
        newParams[`b${i}_enabled`] = 1;
      });
      const idx = plugins.indexOf(eqPlugin);
      plugins[idx] = { ...eqPlugin, params: newParams };
    }
  }

  if (profile.compress) {
    const hasComp = plugins.some((p) => p.type === "compressor");
    if (!hasComp) {
      plugins.push({
        id: `automix-comp-${track.id}`,
        name: "AutoMix Comp",
        type: "compressor",
        enabled: true,
        color: "#5ac8fa",
        params: {
          threshold: -18,
          ratio: profile.compressionRatio,
          attack: 10,
          release: 100,
          knee: 6,
          makeup: 0,
        },
      });
    }
  }

  return {
    ...track,
    volume: Math.round(vol),
    pan: Math.round(pan),
    plugins,
  };
}

export function autoMix(tracks: TrackDef[], genre: string): TrackDef[] {
  const preset = PRESETS[genre] || PRESETS.rock;
  const classified = tracks.map((t) => ({
    track: t,
    role: classifyTrack(t),
  }));

  const roleCounts = new Map<TrackRole, number>();
  for (const { role } of classified) {
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }

  const usedPresetIndices = new Set<number>();

  return classified.map(({ track, role }, i) => {
    if (role === "other") {
      const presetIdx = i % preset.length;
      const p = preset[presetIdx];
      usedPresetIndices.add(presetIdx);
      return { ...track, volume: p.vol, pan: p.pan };
    }

    const sameRoleCount = roleCounts.get(role) ?? 1;
    const roleIndex = classified
      .slice(0, i + 1)
      .filter((c) => c.role === role).length;
    const spread = role === "hihat" ? 10 : 15;
    const panOffset =
      sameRoleCount > 1
        ? (roleIndex - 1) * spread - (sameRoleCount - 1) * spread / 2
        : 0;

    const result = applyRoleProfile(track, role, genre);
    return { ...result, pan: result.pan + panOffset };
  });
}
