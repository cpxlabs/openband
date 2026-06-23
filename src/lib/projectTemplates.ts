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


