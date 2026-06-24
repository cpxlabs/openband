import type { MIDINote, TrackDef } from './types';

export interface GenreTemplate {
  id: string;
  name: string;
  icon: string;
  defaultBpm: number;
  bpmRange: [number, number];
  defaultKey: string;
  description: string;
  suggestedTracks: { name: string; color: string }[];
}

export const GENRES: GenreTemplate[] = [
  {
    id: 'pop',
    name: 'Pop',
    icon: '🎤',
    defaultBpm: 120,
    bpmRange: [90, 140],
    defaultKey: 'C',
    description: 'Pop radio, vocal-driven',
    suggestedTracks: [
      { name: 'Voz Principal', color: 'bg-red-500' },
      { name: 'Violão', color: 'bg-orange-500' },
      { name: 'Baixo', color: 'bg-purple-500' },
      { name: 'Bateria', color: 'bg-green-500' },
    ],
  },
  {
    id: 'rock',
    name: 'Rock',
    icon: '🎸',
    defaultBpm: 130,
    bpmRange: [80, 200],
    defaultKey: 'E',
    description: 'Guitarras, energia ao vivo',
    suggestedTracks: [
      { name: 'Vocal', color: 'bg-red-500' },
      { name: 'Guitarra Solo', color: 'bg-blue-500' },
      { name: 'Guitarra Base', color: 'bg-cyan-500' },
      { name: 'Baixo', color: 'bg-purple-500' },
      { name: 'Bateria', color: 'bg-green-500' },
    ],
  },
  {
    id: 'edm',
    name: 'EDM',
    icon: '🎛',
    defaultBpm: 128,
    bpmRange: [110, 160],
    defaultKey: 'F#m',
    description: 'Eletrônico, drops e synths',
    suggestedTracks: [
      { name: 'Kick Bass', color: 'bg-yellow-500' },
      { name: 'Synth Lead', color: 'bg-blue-500' },
      { name: 'Pad', color: 'bg-indigo-400' },
      { name: 'Percussão', color: 'bg-green-500' },
      { name: 'FX', color: 'bg-gray-500' },
    ],
  },
  {
    id: 'hiphop',
    name: 'Hip-Hop',
    icon: '🎤',
    defaultBpm: 95,
    bpmRange: [70, 130],
    defaultKey: 'D#m',
    description: 'Beats, 808s, rimas',
    suggestedTracks: [
      { name: 'Vocal', color: 'bg-red-500' },
      { name: '808 Bass', color: 'bg-orange-500' },
      { name: 'Drums', color: 'bg-green-500' },
      { name: 'Melodia', color: 'bg-blue-500' },
      { name: 'Sample', color: 'bg-purple-500' },
    ],
  },
  {
    id: 'jazz',
    name: 'Jazz',
    icon: '🎷',
    defaultBpm: 110,
    bpmRange: [60, 180],
    defaultKey: 'Bb',
    description: 'Acústico, improviso, swing',
    suggestedTracks: [
      { name: 'Piano', color: 'bg-blue-500' },
      { name: 'Baixo Acústico', color: 'bg-purple-500' },
      { name: 'Bateria', color: 'bg-green-500' },
      { name: 'Sax', color: 'bg-yellow-500' },
    ],
  },
  {
    id: 'lofi',
    name: 'Lo-Fi',
    icon: '☕',
    defaultBpm: 80,
    bpmRange: [60, 100],
    defaultKey: 'Am',
    description: 'Chill, samples, vinil',
    suggestedTracks: [
      { name: 'Sample', color: 'bg-blue-500' },
      { name: 'Drums Lo-Fi', color: 'bg-green-500' },
      { name: 'Baixo', color: 'bg-purple-500' },
      { name: 'Melodia', color: 'bg-yellow-500' },
    ],
  },
  {
    id: 'rnb',
    name: 'R&B',
    icon: '🎹',
    defaultBpm: 85,
    bpmRange: [60, 110],
    defaultKey: 'C#m',
    description: 'Vocal soul, groove suave',
    suggestedTracks: [
      { name: 'Vocal', color: 'bg-red-500' },
      { name: 'Piano/Keys', color: 'bg-blue-500' },
      { name: 'Baixo', color: 'bg-purple-500' },
      { name: 'Bateria', color: 'bg-green-500' },
    ],
  },
  {
    id: 'metal',
    name: 'Metal',
    icon: '🤘',
    defaultBpm: 180,
    bpmRange: [120, 240],
    defaultKey: 'E',
    description: 'Pesado, rápido, distorcido',
    suggestedTracks: [
      { name: 'Vocal Gutural', color: 'bg-red-500' },
      { name: 'Guitarra Rítmica', color: 'bg-orange-500' },
      { name: 'Guitarra Solo', color: 'bg-blue-500' },
      { name: 'Baixo', color: 'bg-purple-500' },
      { name: 'Bateria', color: 'bg-green-500' },
    ],
  },
  {
    id: 'acoustic',
    name: 'Acústico',
    icon: '🎻',
    defaultBpm: 100,
    bpmRange: [60, 140],
    defaultKey: 'G',
    description: 'Orgânico, violão, voz',
    suggestedTracks: [
      { name: 'Vocal', color: 'bg-red-500' },
      { name: 'Violão', color: 'bg-orange-500' },
      { name: 'Baixo Acústico', color: 'bg-purple-500' },
    ],
  },
  {
    id: 'blues',
    name: 'Blues',
    icon: '🎸',
    defaultBpm: 100,
    bpmRange: [60, 160],
    defaultKey: 'A',
    description: 'Progressão I-IV-V, alma',
    suggestedTracks: [
      { name: 'Vocal', color: 'bg-red-500' },
      { name: 'Guitarra Lead', color: 'bg-blue-500' },
      { name: 'Guitarra Base', color: 'bg-cyan-500' },
      { name: 'Baixo', color: 'bg-purple-500' },
      { name: 'Bateria', color: 'bg-green-500' },
    ],
  },
];

const ALL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const MUSICAL_KEYS = ALL_KEYS.flatMap(k => [k, `${k}m`]);

export const keyLabel = (k: string) => k;

let _regionCounter = 0;
function nextRegionId(): string {
  _regionCounter++;
  return `r${_regionCounter}`;
}

export function generateTracksForGenre(genreId: string, bpm?: number, key?: string): TrackDef[] {
  const genre = GENRES.find(g => g.id === genreId);
  const suggested = genre?.suggestedTracks;
  if (!suggested || suggested.length === 0) {
    return getFallbackTracks();
  }

  const bars = 8;
  const bpmVal = bpm ?? genre?.defaultBpm ?? 120;
  const beatsPerBar = 4;
  const regionDuration = (bars * beatsPerBar * 60 * 4) / bpmVal;
  const rootNote = keyToRootNote(key ?? genre?.defaultKey ?? 'C');

  return suggested.map((track, i) => {
    const midiNotes = generateMidiForTrack(track.name, rootNote, bpmVal);
    return {
      id: String(i + 1),
      name: track.name,
      color: track.color,
      muted: false,
      solo: false,
      volume: 80,
      pan: 0,
      sends: {},
      sidechainSource: null,
      regions: [{ id: nextRegionId(), start: 0, duration: Math.round(regionDuration) }],
      plugins: [],
      automation: {},
      ...(midiNotes.length > 0 ? { midiNotes } : {}),
    };
  });
}

const NOTE_TO_MIDI: Record<string, number> = {
  'C': 60, 'C#': 61, 'D': 62, 'D#': 63, 'E': 64, 'F': 65,
  'F#': 66, 'G': 67, 'G#': 68, 'A': 69, 'A#': 70, 'B': 71,
};

function keyToRootNote(key: string): number {
  const clean = key.replace(/m$/, '');
  return NOTE_TO_MIDI[clean] ?? 60;
}

const MELODIC_TRACK_KEYWORDS = [
  'baixo', 'bass', 'baixo acústico', '808', 'melodia', 'synth',
  'lead', 'pad', 'piano', 'keys', 'sax', 'guitarra', 'violão',
  'guitar', 'solo', 'sample', 'violino', 'cello', 'organ',
];

function generateMidiForTrack(trackName: string, rootNote: number, bpm: number): MIDINote[] {
  const lower = trackName.toLowerCase();
  const isMelodic = MELODIC_TRACK_KEYWORDS.some(k => lower.includes(k));
  if (!isMelodic) return [];

  const beatsPerBar = 4;
  const secPerBeat = 60 / bpm;
  const notes: MIDINote[] = [];
  const durationBeats = 8 * beatsPerBar;
  const octaves = lower.includes('baixo') || lower.includes('bass') || lower.includes('808') ? -1 : 0;

  for (let beat = 0; beat < durationBeats; beat += 2) {
    const note = rootNote + octaves * 12;
    notes.push({
      pitch: beat % 4 === 0 ? note : note - 3,
      start: beat * secPerBeat,
      duration: secPerBeat * 1.5,
      velocity: 100,
    });
  }

  return notes;
}

function getFallbackTracks(): TrackDef[] {
  return [
    {
      id: '1', name: 'Vocal', color: 'bg-red-500',
      muted: false, solo: false, volume: 80, pan: 0, sends: {}, sidechainSource: null,
      regions: [{ id: nextRegionId(), start: 0, duration: 200 }],
      plugins: [], automation: {},
    },
    {
      id: '2', name: 'Instrumento', color: 'bg-blue-500',
      muted: false, solo: false, volume: 75, pan: 0, sends: {}, sidechainSource: null,
      regions: [{ id: nextRegionId(), start: 0, duration: 200 }],
      plugins: [], automation: {},
    },
    {
      id: '3', name: 'Bateria', color: 'bg-green-500',
      muted: false, solo: false, volume: 85, pan: 0, sends: {}, sidechainSource: null,
      regions: [{ id: nextRegionId(), start: 0, duration: 200 }],
      plugins: [], automation: {},
    },
    {
      id: '4', name: 'Baixo', color: 'bg-purple-500',
      muted: false, solo: false, volume: 80, pan: 0, sends: {}, sidechainSource: null,
      regions: [{ id: nextRegionId(), start: 0, duration: 200 }],
      plugins: [], automation: {},
    },
  ];
}


