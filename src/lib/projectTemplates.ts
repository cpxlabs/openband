import type { MIDINote, PluginType, TrackDef } from "./types";
import { keyToRootNote, PROGRESSION_PRESETS, resolveProgression, isMinorKey, getDefaultScaleType, SCALE_INTERVALS } from "./harmony";
import type { HarmonicDegrees } from "./harmony";

export type Mood = 'dark' | 'bright' | 'warm' | 'cold' | 'aggressive' | 'chill' | 'epic' | 'minimal' | 'nostalgic' | 'euphoric';

type WaveformType = "sine" | "square" | "sawtooth" | "triangle";

export interface MoodPreset {
  id: Mood;
  name: string;
  icon: string;
  description: string;
  bpmOffset: number;
  waveType: WaveformType;
  filter: { type: BiquadFilterType; freq: number; q: number } | null;
  reverb: { decay: number; mix: number } | null;
  density: number;
  velocity: number;
  octaveShift: number;
}

export const MOODS: MoodPreset[] = [
  {
    id: 'dark', name: 'Dark', icon: '🌑', description: 'Escuro, club, sub-bass potente',
    bpmOffset: -5, waveType: 'sawtooth',
    filter: { type: 'lowpass', freq: 6000, q: 0.5 }, reverb: { decay: 1.5, mix: 0.25 }, density: 0.8, velocity: 10, octaveShift: 0,
  },
  {
    id: 'bright', name: 'Bright', icon: '☀️', description: 'Brilhante, enérgico, sincopado',
    bpmOffset: 10, waveType: 'triangle',
    filter: { type: 'highpass', freq: 200, q: 0.3 }, reverb: { decay: 0.5, mix: 0.1 }, density: 1.3, velocity: 10, octaveShift: 0,
  },
  {
    id: 'warm', name: 'Warm', icon: '🔥', description: 'Aconchegante, vintage, saturado',
    bpmOffset: 0, waveType: 'sawtooth',
    filter: { type: 'lowpass', freq: 8000, q: 0.3 }, reverb: { decay: 1.2, mix: 0.2 }, density: 1.0, velocity: 0, octaveShift: 0,
  },
  {
    id: 'cold', name: 'Cold', icon: '🧊', description: 'Frio, espacial, distante',
    bpmOffset: -10, waveType: 'sine',
    filter: { type: 'highpass', freq: 400, q: 0.3 }, reverb: { decay: 3.0, mix: 0.4 }, density: 0.6, velocity: -10, octaveShift: 1,
  },
  {
    id: 'aggressive', name: 'Aggressive', icon: '💥', description: 'Pesado, rápido, intenso',
    bpmOffset: 15, waveType: 'square',
    filter: null, reverb: null, density: 1.4, velocity: 15, octaveShift: 0,
  },
  {
    id: 'chill', name: 'Chill', icon: '😎', description: 'Relaxado, lo-fi, suave',
    bpmOffset: -15, waveType: 'triangle',
    filter: { type: 'lowpass', freq: 3000, q: 1.0 }, reverb: { decay: 3.0, mix: 0.4 }, density: 0.6, velocity: -15, octaveShift: 1,
  },
  {
    id: 'epic', name: 'Epic', icon: '🏔️', description: 'Grandioso, cinematográfico',
    bpmOffset: -5, waveType: 'sawtooth',
    filter: null, reverb: { decay: 4.0, mix: 0.5 }, density: 1.2, velocity: 5, octaveShift: 0,
  },
  {
    id: 'minimal', name: 'Minimal', icon: '◻️', description: 'Esparso, atmosférico, silêncio',
    bpmOffset: -20, waveType: 'sine',
    filter: { type: 'lowpass', freq: 4000, q: 0.3 }, reverb: { decay: 4.0, mix: 0.5 }, density: 0.4, velocity: -20, octaveShift: 2,
  },
  {
    id: 'nostalgic', name: 'Nostalgic', icon: '📼', description: 'Retrô, vinil, memória',
    bpmOffset: -5, waveType: 'triangle',
    filter: { type: 'lowpass', freq: 5000, q: 0.5 }, reverb: { decay: 2.0, mix: 0.3 }, density: 0.8, velocity: -5, octaveShift: 0,
  },
  {
    id: 'euphoric', name: 'Euphoric', icon: '✨', description: 'Eufórico, brilhante, energético',
    bpmOffset: 10, waveType: 'triangle',
    filter: null, reverb: { decay: 0.8, mix: 0.15 }, density: 1.3, velocity: 10, octaveShift: 0,
  },
];

export const TIME_SIGNATURES = ["2/2", "3/4", "4/4", "5/4", "6/8", "7/8", "12/8"];

interface PluginPreset {
  type: string;
  params: Record<string, number>;
}

const GENRE_PLUGINS: Record<string, PluginPreset[]> = {
  pop: [
    { type: 'compressor', params: { threshold: -18, ratio: 3, attack: 5, release: 50 } },
    { type: 'reverb', params: { decay: 1.2, mix: 0.2 } },
  ],
  rock: [
    { type: 'distortion', params: { drive: 0.6, tone: 0.5, mix: 0.8 } },
    { type: 'compressor', params: { threshold: -20, ratio: 4, attack: 3, release: 30 } },
  ],
  edm: [
    { type: 'compressor', params: { threshold: -16, ratio: 5, attack: 2, release: 20 } },
    { type: 'reverb', params: { decay: 2.0, mix: 0.3 } },
    { type: 'distortion', params: { drive: 0.3, tone: 0.7, mix: 0.5 } },
  ],
  hiphop: [
    { type: 'compressor', params: { threshold: -14, ratio: 6, attack: 1, release: 15 } },
    { type: 'distortion', params: { drive: 0.4, tone: 0.6, mix: 0.4 } },
  ],
  jazz: [
    { type: 'reverb', params: { decay: 1.5, mix: 0.25 } },
    { type: 'compressor', params: { threshold: -22, ratio: 2, attack: 10, release: 80 } },
  ],
  lofi: [
    { type: 'distortion', params: { drive: 0.2, tone: 0.4, mix: 0.3 } },
    { type: 'reverb', params: { decay: 3.0, mix: 0.35 } },
  ],
  rnb: [
    { type: 'compressor', params: { threshold: -16, ratio: 3, attack: 8, release: 60 } },
    { type: 'reverb', params: { decay: 1.8, mix: 0.2 } },
  ],
  metal: [
    { type: 'distortion', params: { drive: 0.9, tone: 0.3, mix: 1.0 } },
    { type: 'compressor', params: { threshold: -24, ratio: 6, attack: 1, release: 15 } },
  ],
  acoustic: [
    { type: 'reverb', params: { decay: 1.0, mix: 0.15 } },
    { type: 'compressor', params: { threshold: -20, ratio: 2, attack: 12, release: 100 } },
  ],
  blues: [
    { type: 'distortion', params: { drive: 0.5, tone: 0.6, mix: 0.7 } },
    { type: 'reverb', params: { decay: 1.2, mix: 0.2 } },
  ],
};

export interface GenreTemplate {
  id: string;
  name: string;
  icon: string;
  defaultBpm: number;
  bpmRange: [number, number];
  defaultKey: string;
  description: string;
  suggestedTracks: { name: string; color: string; trackType?: string }[];
  subgenres?: string[];
}

export const GENRES: GenreTemplate[] = [
  {
    id: "pop",
    name: "Pop",
    icon: "🎤",
    defaultBpm: 120,
    bpmRange: [90, 140],
    defaultKey: "C",
    description: "Pop melódico, bateria groove",
    subgenres: [],
    suggestedTracks: [
      { name: "Bateria", color: "bg-green-500", trackType: "drums" },
      { name: "Baixo", color: "bg-purple-500", trackType: "bass" },
      { name: "Violão", color: "bg-orange-500", trackType: "guitar" },
      { name: "Melodia", color: "bg-blue-500", trackType: "vocal" },
    ],
  },
  {
    id: "rock",
    name: "Rock",
    icon: "🎸",
    defaultBpm: 130,
    bpmRange: [80, 200],
    defaultKey: "E",
    description: "Guitarras, bateria forte, energia ao vivo",
    subgenres: ["classic_rock", "indie"],
    suggestedTracks: [
      { name: "Bateria", color: "bg-green-500", trackType: "drums" },
      { name: "Baixo", color: "bg-purple-500", trackType: "bass" },
      { name: "Guitarra Solo", color: "bg-blue-500", trackType: "guitar" },
      { name: "Guitarra Base", color: "bg-cyan-500", trackType: "guitar" },
    ],
  },
  {
    id: "edm",
    name: "EDM",
    icon: "🎛",
    defaultBpm: 128,
    bpmRange: [110, 160],
    defaultKey: "F#m",
    description: "Eletrônico, drops e synths",
    subgenres: ["synthwave", "techno", "house"],
    suggestedTracks: [
      { name: "Kick Bass", color: "bg-yellow-500", trackType: "drums" },
      { name: "Drums", color: "bg-green-500", trackType: "drums" },
      { name: "Synth Lead", color: "bg-blue-500", trackType: "synth_lead" },
      { name: "Pad", color: "bg-indigo-400", trackType: "pad" },
    ],
  },
  {
    id: "hiphop",
    name: "Hip-Hop",
    icon: "🎤",
    defaultBpm: 95,
    bpmRange: [70, 130],
    defaultKey: "D#m",
    description: "Beats pesados, 808s, melodias",
    subgenres: ["trap", "boombap", "lofi_urban"],
    suggestedTracks: [
      { name: "Drums", color: "bg-green-500", trackType: "drums" },
      { name: "808 Bass", color: "bg-orange-500", trackType: "bass" },
      { name: "Melodia", color: "bg-blue-500", trackType: "vocal" },
      { name: "Sample", color: "bg-purple-500", trackType: "sample" },
    ],
  },
  {
    id: "jazz",
    name: "Jazz",
    icon: "🎷",
    defaultBpm: 110,
    bpmRange: [60, 180],
    defaultKey: "Bb",
    description: "Acústico, improviso, swing",
    subgenres: [],
    suggestedTracks: [
      { name: "Bateria", color: "bg-green-500", trackType: "drums" },
      { name: "Baixo Acústico", color: "bg-purple-500", trackType: "bass" },
      { name: "Piano", color: "bg-blue-500", trackType: "keys" },
      { name: "Sax", color: "bg-yellow-500", trackType: "keys" },
    ],
  },
  {
    id: "lofi",
    name: "Lo-Fi",
    icon: "☕",
    defaultBpm: 80,
    bpmRange: [60, 100],
    defaultKey: "Am",
    description: "Chill, samples, vinil",
    subgenres: ["lofi_urban"],
    suggestedTracks: [
      { name: "Drums Lo-Fi", color: "bg-green-500", trackType: "drums" },
      { name: "Baixo", color: "bg-purple-500", trackType: "bass" },
      { name: "Melodia", color: "bg-yellow-500", trackType: "vocal" },
      { name: "Sample", color: "bg-blue-500", trackType: "sample" },
    ],
  },
  {
    id: "rnb",
    name: "R&B",
    icon: "🎹",
    defaultBpm: 85,
    bpmRange: [60, 110],
    defaultKey: "C#m",
    description: "Groove suave, teclas, soul",
    subgenres: [],
    suggestedTracks: [
      { name: "Bateria", color: "bg-green-500", trackType: "drums" },
      { name: "Baixo", color: "bg-purple-500", trackType: "bass" },
      { name: "Piano/Keys", color: "bg-blue-500", trackType: "keys" },
    ],
  },
  {
    id: "metal",
    name: "Metal",
    icon: "🤘",
    defaultBpm: 180,
    bpmRange: [120, 240],
    defaultKey: "E",
    description: "Pesado, rápido, distorcido",
    subgenres: ["metal_core"],
    suggestedTracks: [
      { name: "Bateria", color: "bg-green-500", trackType: "drums" },
      { name: "Baixo", color: "bg-purple-500", trackType: "bass" },
      { name: "Guitarra Rítmica", color: "bg-orange-500", trackType: "guitar" },
      { name: "Guitarra Solo", color: "bg-blue-500", trackType: "guitar" },
    ],
  },
  {
    id: "acoustic",
    name: "Acústico",
    icon: "🎻",
    defaultBpm: 100,
    bpmRange: [60, 140],
    defaultKey: "G",
    description: "Orgânico, violão, dedilhado",
    subgenres: [],
    suggestedTracks: [
      { name: "Percussão", color: "bg-green-500", trackType: "percussion" },
      { name: "Baixo Acústico", color: "bg-purple-500", trackType: "bass" },
      { name: "Violão", color: "bg-orange-500", trackType: "guitar" },
    ],
  },
  {
    id: "blues",
    name: "Blues",
    icon: "🎸",
    defaultBpm: 100,
    bpmRange: [60, 160],
    defaultKey: "A",
    description: "Progressão I-IV-V, alma",
    subgenres: [],
    suggestedTracks: [
      { name: "Bateria", color: "bg-green-500", trackType: "drums" },
      { name: "Baixo", color: "bg-purple-500", trackType: "bass" },
      { name: "Guitarra Lead", color: "bg-blue-500", trackType: "guitar" },
      { name: "Guitarra Base", color: "bg-cyan-500", trackType: "guitar" },
    ],
  },
];

export function genreSubgenreMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const g of GENRES) {
    map[g.id] = g.subgenres ?? [];
  }
  return map;
}

export function subgenreToGenreId(subgenreId: string): string | undefined {
  for (const g of GENRES) {
    if (g.subgenres?.includes(subgenreId)) return g.id;
  }
  return undefined;
}

const ALL_KEYS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export const MUSICAL_KEYS = ALL_KEYS.flatMap((k) => [k, `${k}m`]);

export const keyLabel = (k: string) => k;

let _regionCounter = 0;
function nextRegionId(): string {
  _regionCounter++;
  return `r${_regionCounter}`;
}

export function generateTracksForGenre(
  genreId: string,
  bpm?: number,
  key?: string,
  mood?: Mood,
  numBars: number = 8,
  timeSignature: string = "4/4",
): TrackDef[] {
  const genre = GENRES.find((g) => g.id === genreId);
  const suggested = genre?.suggestedTracks;
  if (!suggested || suggested.length === 0) {
    return getFallbackTracks(numBars);
  }

  const baseBpm = bpm ?? genre?.defaultBpm ?? 120;
  const bpmVal = mood
    ? baseBpm + (MOODS.find((m) => m.id === mood)?.bpmOffset ?? 0)
    : baseBpm;
  const [, beatsPerBar] = timeSignature.split("/").map(Number);
  const regionDuration = (numBars * beatsPerBar * 60) / bpmVal;
  const rootNote = keyToRootNote(key ?? genre?.defaultKey ?? "C");
  const now = Date.now();

  return suggested.map((track, i) => {
    const midiNotes = generateMidiForTrack(track.name, genreId, rootNote, bpmVal, mood, numBars, track.trackType);
    return {
      id: `track-${now}-${i}`,
      name: track.name,
      color: track.color,
      muted: false,
      solo: false,
      volume: 80,
      pan: 0,
      sends: {},
      sidechainSource: null,
      regions: [
        { id: nextRegionId(), start: 0, duration: Math.round(regionDuration) },
      ],
      plugins: GENRE_PLUGINS[genreId]?.map((p, i) => ({
        id: `plugin-${now}-${i}`,
        name: p.type.charAt(0).toUpperCase() + p.type.slice(1),
        type: p.type as PluginType,
        enabled: true,
        params: { ...p.params },
      })) ?? [],
      automation: {},
      ...(midiNotes.length > 0 ? { midiNotes } : {}),
    };
  });
}

type TrackType = 'drums' | 'percussion' | 'bass' | 'guitar' | 'keys' | 'synth_lead' | 'pad' | 'sample' | 'vocal' | 'fx' | 'other'

function getTrackType(trackName: string, trackType?: string): TrackType {
  if (trackType === 'drums' || trackType === 'percussion' || trackType === 'bass' || trackType === 'guitar' || trackType === 'keys' || trackType === 'synth_lead' || trackType === 'pad' || trackType === 'sample' || trackType === 'vocal' || trackType === 'fx') return trackType
  const l = trackName.toLowerCase()
  if (l.includes('bateria') || l.includes('drums') || l.includes('bumbo') || l.includes('kick')) return 'drums'
  if (l.includes('percussão') || l.includes('percussion')) return 'percussion'
  if (l.includes('baixo') || l.includes('bass') || l.includes('808')) return 'bass'
  if (l.includes('guitarra') || l.includes('violão') || l.includes('guitar')) return 'guitar'
  if (l.includes('piano') || l.includes('keys') || l.includes('sax') || l.includes('organ')) return 'keys'
  if (l.includes('synth') || l.includes('lead')) return 'synth_lead'
  if (l.includes('pad')) return 'pad'
  if (l.includes('sample')) return 'sample'
  if (l.includes('vocal') || l.includes('voz') || l.includes('gutural')) return 'vocal'
  if (l.includes('fx') || l.includes('efeito')) return 'fx'
  return 'other'
}

function getPercussionPattern(secPerBeat: number, numBars: number = 8): MIDINote[] {
  const notes: MIDINote[] = []
  for (let bar = 0; bar < numBars; bar++) {
    const b = bar * 4 * secPerBeat
    for (let beat = 0; beat < 4; beat++) {
      if (beat === 0) {
        notes.push({ pitch: 63, start: b + beat * secPerBeat, duration: secPerBeat * 0.2, velocity: 80 })
        notes.push({ pitch: 75, start: b + beat * secPerBeat + secPerBeat * 0.1, duration: secPerBeat * 0.1, velocity: 70 })
      }
      if (beat === 1) {
        notes.push({ pitch: 64, start: b + beat * secPerBeat, duration: secPerBeat * 0.2, velocity: 75 })
      }
      if (beat === 2) {
        notes.push({ pitch: 63, start: b + beat * secPerBeat, duration: secPerBeat * 0.2, velocity: 85 })
      }
      if (beat === 3) {
        notes.push({ pitch: 64, start: b + beat * secPerBeat, duration: secPerBeat * 0.15, velocity: 70 })
        notes.push({ pitch: 70, start: b + beat * secPerBeat + secPerBeat * 0.05, duration: secPerBeat * 0.04, velocity: 50 })
      }
    }
    for (let e = 0; e < 8; e++) {
      notes.push({ pitch: 70, start: b + e * 0.5 * secPerBeat, duration: secPerBeat * 0.04, velocity: 45 })
    }
  }
  return notes
}

function getDrumPattern(genreId: string, secPerBeat: number, numBars: number = 8): MIDINote[] {
  const notes: MIDINote[] = []

  switch (genreId) {
    case 'pop': {
      for (let bar = 0; bar < numBars; bar++) {
        const b = bar * 4 * secPerBeat
        notes.push({ pitch: 36, start: b, duration: secPerBeat * 0.35, velocity: 115 })
        notes.push({ pitch: 38, start: b + 2 * secPerBeat, duration: secPerBeat * 0.25, velocity: 105 })
        for (let e = 0; e < 8; e++) {
          notes.push({ pitch: 42, start: b + e * 0.5 * secPerBeat, duration: secPerBeat * 0.06, velocity: e % 2 === 0 ? 80 : 55 })
        }
        if (bar % 2 === 1) {
          notes.push({ pitch: 36, start: b + 1.5 * secPerBeat, duration: secPerBeat * 0.25, velocity: 85 })
        }
      }
      break
    }
    case 'rock': {
      for (let bar = 0; bar < numBars; bar++) {
        const b = bar * 4 * secPerBeat
        notes.push({ pitch: 36, start: b, duration: secPerBeat * 0.3, velocity: 120 })
        notes.push({ pitch: 36, start: b + 2 * secPerBeat, duration: secPerBeat * 0.3, velocity: 85 })
        notes.push({ pitch: 38, start: b + 2 * secPerBeat, duration: secPerBeat * 0.3, velocity: 110 })
        for (let e = 0; e < 8; e++) {
          if (e % 2 === 0) {
            notes.push({ pitch: 51, start: b + e * 0.5 * secPerBeat, duration: secPerBeat * 0.2, velocity: 80 })
          } else {
            notes.push({ pitch: 51, start: b + e * 0.5 * secPerBeat, duration: secPerBeat * 0.1, velocity: 60 })
          }
        }
        if (bar % 4 === 3) {
          notes.push({ pitch: 49, start: b + 3 * secPerBeat, duration: secPerBeat * 0.8, velocity: 100 })
        }
      }
      break
    }
    case 'acoustic': {
      for (let bar = 0; bar < numBars; bar++) {
        const b = bar * 4 * secPerBeat
        notes.push({ pitch: 36, start: b, duration: secPerBeat * 0.25, velocity: 90 })
        notes.push({ pitch: 37, start: b + 2 * secPerBeat, duration: secPerBeat * 0.2, velocity: 80 })
        for (let e = 0; e < 8; e++) {
          if (e % 2 === 0) {
            notes.push({ pitch: 64, start: b + e * 0.5 * secPerBeat, duration: secPerBeat * 0.08, velocity: 55 })
          }
        }
        if (bar % 2 === 1) {
          notes.push({ pitch: 63, start: b + 1.5 * secPerBeat, duration: secPerBeat * 0.2, velocity: 75 })
        }
      }
      break
    }
    case 'edm': {
      for (let bar = 0; bar < numBars; bar++) {
        const b = bar * 4 * secPerBeat
        for (let beat = 0; beat < 4; beat++) {
          notes.push({ pitch: 36, start: b + beat * secPerBeat, duration: secPerBeat * 0.3, velocity: 125 })
        }
        notes.push({ pitch: 38, start: b + 2 * secPerBeat, duration: secPerBeat * 0.3, velocity: 115 })
        for (let e = 0; e < 8; e++) {
          if (e % 2 === 0) {
            notes.push({ pitch: 42, start: b + e * 0.5 * secPerBeat, duration: secPerBeat * 0.08, velocity: 70 })
          } else {
            notes.push({ pitch: 46, start: b + e * 0.5 * secPerBeat, duration: secPerBeat * 0.1, velocity: 60 })
          }
        }
        if (bar % 4 === 3) {
          notes.push({ pitch: 49, start: b + 3.5 * secPerBeat, duration: secPerBeat * 1.2, velocity: 110 })
        }
        if (bar % 8 === 7) {
          for (let beat = 0; beat < 4; beat++) {
            notes.push({ pitch: 36, start: b + (beat + 0.5) * secPerBeat, duration: secPerBeat * 0.15, velocity: 80 })
          }
        }
      }
      break
    }
    case 'hiphop': {
      for (let bar = 0; bar < numBars; bar++) {
        const b = bar * 4 * secPerBeat
        notes.push({ pitch: 36, start: b, duration: secPerBeat * 0.5, velocity: 115 })
        notes.push({ pitch: 36, start: b + 1.5 * secPerBeat, duration: secPerBeat * 0.3, velocity: 90 })
        if (bar % 2 === 0) {
          notes.push({ pitch: 36, start: b + 2.5 * secPerBeat, duration: secPerBeat * 0.2, velocity: 75 })
        }
        notes.push({ pitch: 38, start: b + 2 * secPerBeat, duration: secPerBeat * 0.25, velocity: 105 })
        for (let e = 0; e < 8; e++) {
          const swing = e % 2 === 0 ? 0 : 0.08
          notes.push({ pitch: 42, start: b + (e * 0.5 + swing) * secPerBeat, duration: secPerBeat * 0.06, velocity: e % 2 === 0 ? 75 : 50 })
        }
      }
      break
    }
    case 'metal': {
      for (let bar = 0; bar < numBars; bar++) {
        const b = bar * 4 * secPerBeat
        for (let beat = 0; beat < 4; beat++) {
          notes.push({ pitch: 36, start: b + beat * secPerBeat, duration: secPerBeat * 0.3, velocity: 120 })
          notes.push({ pitch: 36, start: b + (beat + 0.5) * secPerBeat, duration: secPerBeat * 0.25, velocity: 100 })
        }
        notes.push({ pitch: 38, start: b + 2 * secPerBeat, duration: secPerBeat * 0.3, velocity: 115 })
        for (let e = 0; e < 8; e++) {
          if (e % 2 === 0) {
            notes.push({ pitch: 51, start: b + e * 0.5 * secPerBeat, duration: secPerBeat * 0.3, velocity: 85 })
          } else {
            notes.push({ pitch: 51, start: b + e * 0.5 * secPerBeat, duration: secPerBeat * 0.15, velocity: 65 })
          }
        }
        if (bar % 2 === 1) {
          notes.push({ pitch: 49, start: b + 2 * secPerBeat, duration: secPerBeat * 0.6, velocity: 110 })
        }
      }
      break
    }
    case 'jazz': {
      for (let bar = 0; bar < numBars; bar++) {
        const b = bar * 4 * secPerBeat
        notes.push({ pitch: 36, start: b, duration: secPerBeat * 0.5, velocity: 90 })
        notes.push({ pitch: 36, start: b + 2.5 * secPerBeat, duration: secPerBeat * 0.3, velocity: 70 })
        notes.push({ pitch: 38, start: b + 2 * secPerBeat, duration: secPerBeat * 0.2, velocity: 80 })
        for (let e = 0; e < 8; e++) {
          const swing = e % 2 === 0 ? 0 : 0.12
          notes.push({ pitch: 51, start: b + (e * 0.5 + swing) * secPerBeat, duration: secPerBeat * 0.2, velocity: 65 })
        }
        if (bar % 2 === 1) {
          notes.push({ pitch: 38, start: b + 3 * secPerBeat, duration: secPerBeat * 0.2, velocity: 70 })
        }
      }
      break
    }
    case 'lofi': {
      for (let bar = 0; bar < numBars; bar++) {
        const b = bar * 4 * secPerBeat
        notes.push({ pitch: 36, start: b, duration: secPerBeat * 0.4, velocity: 100 })
        if (bar % 2 === 0) {
          notes.push({ pitch: 36, start: b + 1.5 * secPerBeat, duration: secPerBeat * 0.25, velocity: 70 })
        }
        notes.push({ pitch: 37, start: b + 2 * secPerBeat, duration: secPerBeat * 0.15, velocity: 90 })
        for (let e = 0; e < 8; e++) {
          const swing = e % 2 === 0 ? 0 : 0.06
          notes.push({ pitch: 42, start: b + (e * 0.5 + swing) * secPerBeat, duration: secPerBeat * 0.05, velocity: e % 2 === 0 ? 60 : 40 })
        }
        if (bar === 7) {
          notes.push({ pitch: 49, start: b + 2 * secPerBeat, duration: secPerBeat * 1.5, velocity: 80 })
        }
      }
      break
    }
    case 'rnb': {
      for (let bar = 0; bar < numBars; bar++) {
        const b = bar * 4 * secPerBeat
        notes.push({ pitch: 36, start: b, duration: secPerBeat * 0.5, velocity: 110 })
        notes.push({ pitch: 36, start: b + 1.5 * secPerBeat, duration: secPerBeat * 0.3, velocity: 80 })
        notes.push({ pitch: 40, start: b + 2 * secPerBeat, duration: secPerBeat * 0.25, velocity: 100 })
        for (let e = 0; e < 8; e++) {
          const swing = e % 2 === 0 ? 0 : 0.06
          notes.push({ pitch: 42, start: b + (e * 0.5 + swing) * secPerBeat, duration: secPerBeat * 0.06, velocity: e % 2 === 0 ? 70 : 45 })
        }
        if (bar % 4 === 3) {
          notes.push({ pitch: 38, start: b + 3 * secPerBeat, duration: secPerBeat * 0.2, velocity: 85 })
        }
      }
      break
    }
    case 'blues': {
      for (let bar = 0; bar < numBars; bar++) {
        const b = bar * 4 * secPerBeat
        notes.push({ pitch: 36, start: b, duration: secPerBeat * 0.5, velocity: 110 })
        notes.push({ pitch: 38, start: b + 2 * secPerBeat, duration: secPerBeat * 0.3, velocity: 100 })
        for (let e = 0; e < 8; e++) {
          const swing = e % 2 === 0 ? 0 : 0.1
          notes.push({ pitch: 51, start: b + (e * 0.5 + swing) * secPerBeat, duration: secPerBeat * 0.15, velocity: 70 })
        }
      }
      break
    }
    default: {
      for (let bar = 0; bar < numBars; bar++) {
        const b = bar * 4 * secPerBeat
        notes.push({ pitch: 36, start: b, duration: secPerBeat * 0.4, velocity: 120 })
        if (bar % 2 === 1) notes.push({ pitch: 36, start: b + 2 * secPerBeat, duration: secPerBeat * 0.3, velocity: 70 })
        notes.push({ pitch: 38, start: b + 2 * secPerBeat, duration: secPerBeat * 0.3, velocity: 110 })
        for (let e = 0; e < 8; e++) {
          notes.push({ pitch: 42, start: b + e * 0.5 * secPerBeat, duration: secPerBeat * 0.1, velocity: e % 2 === 0 ? 90 : 60 })
        }
      }
      break
    }
  }

  return notes
}

function generateMidiForTrack(
  trackName: string,
  genreId: string,
  rootNote: number,
  bpm: number,
  mood?: Mood,
  numBars: number = 8,
  overrideTrackType?: string,
): MIDINote[] {
  const trackType = getTrackType(trackName, overrideTrackType)
  const genre = GENRES.find(g => g.id === genreId)
  const scaleType = getDefaultScaleType(genre?.defaultKey ?? 'C')
  const secPerBeat = 60 / bpm
  const beatsPerBar = 4
  const bars = numBars

  const moodPreset = mood ? MOODS.find((m) => m.id === mood) : undefined
  const isDrumOrPerc = trackType === 'drums' || trackType === 'percussion'

  const progressionPreset = mood
    ? PROGRESSION_PRESETS.find(p => p.mood.includes(mood))
    : undefined
  const harmonicDegs: HarmonicDegrees[] = progressionPreset?.degrees ?? PROGRESSION_PRESETS[0].degrees
  const resolvedChords = resolveProgression(harmonicDegs, rootNote, scaleType)

  let result: MIDINote[]
  switch (trackType) {
    case 'drums': {
      result = getDrumPattern(genreId, secPerBeat, numBars)
      break
    }
    case 'percussion': {
      result = getPercussionPattern(secPerBeat, numBars)
      break
    }
    case 'bass': {
      result = []
      const octaveShift = -1
      for (let bar = 0; bar < bars; bar++) {
        for (let beat = 0; beat < beatsPerBar; beat++) {
          const absBeat = bar * beatsPerBar + beat
          const chordIdx = bar % resolvedChords.length
          const chordRoot = resolvedChords[chordIdx][0] + octaveShift * 12
          const intervals = [0, 4, 7, 5, 0, -7, -5, 3]
          const interval = intervals[absBeat % intervals.length]
          const pitch = chordRoot + interval
          result.push({ pitch: Math.max(0, pitch), start: absBeat * secPerBeat, duration: secPerBeat * 1.4, velocity: 110 })
        }
      }
      break
    }
    case 'guitar': {
      result = []
      const isLead = trackName.toLowerCase().includes('solo') || trackName.toLowerCase().includes('lead')
      if (isLead) {
        const pentScale = SCALE_INTERVALS[isMinorKey(genre?.defaultKey ?? 'C') ? 'pentatonic_minor' : 'pentatonic_major']
        for (let bar = 0; bar < bars; bar++) {
          for (let beat = 0; beat < beatsPerBar; beat++) {
            const absBeat = bar * beatsPerBar + beat
            if (beat % 2 === 0) continue
            const idx = (absBeat * 3 + 7) % pentScale.length
            const pitch = rootNote + pentScale[idx] + 12
            result.push({ pitch, start: absBeat * secPerBeat + secPerBeat * 0.05, duration: secPerBeat * 1.6, velocity: 90 })
          }
        }
      } else {
        for (let bar = 0; bar < bars; bar++) {
          const chordIdx = bar % resolvedChords.length
          const cNotes = resolvedChords[chordIdx]
          for (let beat = 0; beat < beatsPerBar; beat++) {
            const absBeat = bar * beatsPerBar + beat
            const isDownbeat = beat === 0
            const isBackbeat = beat === 2
            if (!isDownbeat && !isBackbeat) continue
            const vel = isDownbeat ? 95 : 80
            for (const pitch of cNotes.slice(0, isDownbeat ? 3 : 2)) {
              result.push({ pitch, start: absBeat * secPerBeat, duration: secPerBeat * 2.0, velocity: vel })
            }
          }
        }
      }
      break
    }
    case 'keys': {
      result = []
      for (let bar = 0; bar < bars; bar++) {
        const chordIdx = bar % resolvedChords.length
        const cNotes = resolvedChords[chordIdx]
        for (let beat = 0; beat < beatsPerBar; beat += 2) {
          const absBeat = bar * beatsPerBar + beat
          const pitch = cNotes[beat % cNotes.length]
          result.push({ pitch, start: absBeat * secPerBeat, duration: secPerBeat * 2.5, velocity: 85 })
        }
      }
      break
    }
    case 'synth_lead': {
      result = []
      for (let bar = 0; bar < bars; bar++) {
        const chordIdx = bar % resolvedChords.length
        const cNotes = resolvedChords[chordIdx]
        for (let beat = 0; beat < beatsPerBar; beat++) {
          const absBeat = bar * beatsPerBar + beat
          const idx = absBeat % cNotes.length
          const pitch = cNotes[idx] + 12 + (bar >= 4 ? 0 : -12)
          result.push({ pitch, start: absBeat * secPerBeat, duration: secPerBeat * 0.9, velocity: 100 })
        }
      }
      break
    }
    case 'pad': {
      result = []
      for (let bar = 0; bar < bars; bar++) {
        const chordIdx = bar % resolvedChords.length
        const cNotes = resolvedChords[chordIdx]
        const absBeat = bar * beatsPerBar
        for (const pitch of cNotes) {
          result.push({ pitch: pitch - 12, start: absBeat * secPerBeat, duration: secPerBeat * 4.9, velocity: 65 })
        }
      }
      break
    }
    case 'sample': {
      result = []
      const pentScale = SCALE_INTERVALS[isMinorKey(genre?.defaultKey ?? 'C') ? 'pentatonic_minor' : 'pentatonic_major']
      for (let bar = 0; bar < bars; bar++) {
        for (let beat = 0; beat < beatsPerBar; beat += 2) {
          const absBeat = bar * beatsPerBar + beat
          const phrase = [0, 2, 4, 7, 9, 7, 4, 2]
          const idx = (absBeat / 2) % phrase.length
          const pitch = rootNote + pentScale[phrase[idx] % pentScale.length] + (absBeat >= 4 * beatsPerBar ? 12 : 0)
          result.push({ pitch, start: absBeat * secPerBeat, duration: secPerBeat * 1.8, velocity: 90 })
        }
      }
      break
    }
    case 'vocal':
    case 'fx':
      result = []
      break
    case 'other':
    default: {
      result = []
      for (let bar = 0; bar < bars; bar++) {
        const chordIdx = bar % resolvedChords.length
        const cNotes = resolvedChords[chordIdx]
        for (let beat = 0; beat < beatsPerBar; beat += 2) {
          const absBeat = bar * beatsPerBar + beat
          result.push({ pitch: cNotes[beat % cNotes.length], start: absBeat * secPerBeat, duration: secPerBeat * 1.5, velocity: 85 })
        }
      }
      break
    }
  }
  if (moodPreset && result.length > 0) {
    let filtered = result
    if (moodPreset.density < 1.0) {
      filtered = result.filter(() => Math.random() < moodPreset.density)
    } else if (moodPreset.density > 1.0) {
      const extra = result.length * (moodPreset.density - 1.0)
      for (let i = 0; i < Math.round(extra); i++) {
        const ref = result[Math.floor(Math.random() * result.length)]
        filtered.push({
          pitch: ref.pitch,
          start: ref.start + (Math.random() - 0.5) * secPerBeat,
          duration: ref.duration,
          velocity: ref.velocity,
        })
      }
    }
    for (const n of filtered) {
      n.velocity = Math.max(1, Math.min(127, n.velocity + moodPreset.velocity))
      if (!isDrumOrPerc && moodPreset.octaveShift !== 0) {
        n.pitch = Math.max(0, Math.min(127, n.pitch + moodPreset.octaveShift * 12))
      }
    }
    return filtered
  }

  return result
}

function getFallbackTracks(numBars: number = 8): TrackDef[] {
  const now = Date.now();
  const baseDuration = (numBars * 4 * 60) / 120;
  return [
    {
      id: `track-${now}-0`,
      name: "Vocal",
      color: "bg-red-500",
      muted: false,
      solo: false,
      volume: 80,
      pan: 0,
      sends: {},
      sidechainSource: null,
      regions: [{ id: nextRegionId(), start: 0, duration: Math.round(baseDuration) }],
      plugins: [],
      automation: {},
    },
    {
      id: `track-${now}-1`,
      name: "Instrumento",
      color: "bg-blue-500",
      muted: false,
      solo: false,
      volume: 75,
      pan: 0,
      sends: {},
      sidechainSource: null,
      regions: [{ id: nextRegionId(), start: 0, duration: Math.round(baseDuration) }],
      plugins: [],
      automation: {},
    },
    {
      id: `track-${now}-2`,
      name: "Bateria",
      color: "bg-green-500",
      muted: false,
      solo: false,
      volume: 85,
      pan: 0,
      sends: {},
      sidechainSource: null,
      regions: [{ id: nextRegionId(), start: 0, duration: Math.round(baseDuration) }],
      plugins: [],
      automation: {},
    },
    {
      id: `track-${now}-3`,
      name: "Baixo",
      color: "bg-purple-500",
      muted: false,
      solo: false,
      volume: 80,
      pan: 0,
      sends: {},
      sidechainSource: null,
      regions: [{ id: nextRegionId(), start: 0, duration: Math.round(baseDuration) }],
      plugins: [],
      automation: {},
    },
  ];
}
