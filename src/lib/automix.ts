import type { TrackDef } from "./types";

interface MixPreset {
  vol: number;
  pan: number;
}

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

export function autoMix(tracks: TrackDef[], genre: string): TrackDef[] {
  const preset = PRESETS[genre] || PRESETS.rock;
  return tracks.map((t, i) => {
    const p = preset[i] || preset[preset.length - 1];
    return { ...t, volume: p.vol, pan: p.pan };
  });
}
