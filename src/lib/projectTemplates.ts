import type { MIDINote, TrackDef } from "./types";
import { keyToRootNote, PROGRESSION_PRESETS, resolveProgression, isMinorKey, getDefaultScaleType, SCALE_INTERVALS } from "./harmony";
import type { HarmonicDegrees } from "./harmony";

export type Mood = 'day' | 'night' | 'sun' | 'rain' | 'snow';

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
    id: 'day', name: 'Dia', icon: '🌆', description: 'Neutro, focado, padrão comercial',
    bpmOffset: 0, waveType: 'sawtooth',
    filter: null, reverb: null, density: 1.0, velocity: 0, octaveShift: 0,
  },
  {
    id: 'night', name: 'Noite', icon: '🌃', description: 'Escuro, club, sub-bass potente',
    bpmOffset: -5, waveType: 'sawtooth',
    filter: { type: 'lowpass', freq: 6000, q: 0.5 }, reverb: { decay: 1.5, mix: 0.25 }, density: 0.8, velocity: 10, octaveShift: 0,
  },
  {
    id: 'sun', name: 'Sol', icon: '☀️', description: 'Brilhante, enérgico, sincopado',
    bpmOffset: 10, waveType: 'triangle',
    filter: { type: 'highpass', freq: 200, q: 0.3 }, reverb: { decay: 0.5, mix: 0.1 }, density: 1.3, velocity: 10, octaveShift: 0,
  },
  {
    id: 'rain', name: 'Chuva', icon: '🌧️', description: 'Melancólico, lo-fi, washed-out',
    bpmOffset: -15, waveType: 'triangle',
    filter: { type: 'lowpass', freq: 3000, q: 1.0 }, reverb: { decay: 3.0, mix: 0.4 }, density: 0.6, velocity: -15, octaveShift: 1,
  },
  {
    id: 'snow', name: 'Neve', icon: '❄️', description: 'Minimalista, espacial, frio',
    bpmOffset: -20, waveType: 'sine',
    filter: { type: 'lowpass', freq: 4000, q: 0.3 }, reverb: { decay: 4.0, mix: 0.5 }, density: 0.4, velocity: -20, octaveShift: 2,
  },
];

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
    id: "pop",
    name: "Pop",
    icon: "🎤",
    defaultBpm: 120,
    bpmRange: [90, 140],
    defaultKey: "C",
    description: "Pop melódico, bateria groove",
    suggestedTracks: [
      { name: "Bateria", color: "bg-green-500" },
      { name: "Baixo", color: "bg-purple-500" },
      { name: "Violão", color: "bg-orange-500" },
      { name: "Melodia", color: "bg-blue-500" },
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
    suggestedTracks: [
      { name: "Bateria", color: "bg-green-500" },
      { name: "Baixo", color: "bg-purple-500" },
      { name: "Guitarra Solo", color: "bg-blue-500" },
      { name: "Guitarra Base", color: "bg-cyan-500" },
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
    suggestedTracks: [
      { name: "Kick Bass", color: "bg-yellow-500" },
      { name: "Drums", color: "bg-green-500" },
      { name: "Synth Lead", color: "bg-blue-500" },
      { name: "Pad", color: "bg-indigo-400" },
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
    suggestedTracks: [
      { name: "Drums", color: "bg-green-500" },
      { name: "808 Bass", color: "bg-orange-500" },
      { name: "Melodia", color: "bg-blue-500" },
      { name: "Sample", color: "bg-purple-500" },
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
    suggestedTracks: [
      { name: "Bateria", color: "bg-green-500" },
      { name: "Baixo Acústico", color: "bg-purple-500" },
      { name: "Piano", color: "bg-blue-500" },
      { name: "Sax", color: "bg-yellow-500" },
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
    suggestedTracks: [
      { name: "Drums Lo-Fi", color: "bg-green-500" },
      { name: "Baixo", color: "bg-purple-500" },
      { name: "Melodia", color: "bg-yellow-500" },
      { name: "Sample", color: "bg-blue-500" },
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
    suggestedTracks: [
      { name: "Bateria", color: "bg-green-500" },
      { name: "Baixo", color: "bg-purple-500" },
      { name: "Piano/Keys", color: "bg-blue-500" },
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
    suggestedTracks: [
      { name: "Bateria", color: "bg-green-500" },
      { name: "Baixo", color: "bg-purple-500" },
      { name: "Guitarra Rítmica", color: "bg-orange-500" },
      { name: "Guitarra Solo", color: "bg-blue-500" },
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
    suggestedTracks: [
      { name: "Percussão", color: "bg-green-500" },
      { name: "Baixo Acústico", color: "bg-purple-500" },
      { name: "Violão", color: "bg-orange-500" },
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
    suggestedTracks: [
      { name: "Bateria", color: "bg-green-500" },
      { name: "Baixo", color: "bg-purple-500" },
      { name: "Guitarra Lead", color: "bg-blue-500" },
      { name: "Guitarra Base", color: "bg-cyan-500" },
    ],
  },
];

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
): TrackDef[] {
  const genre = GENRES.find((g) => g.id === genreId);
  const suggested = genre?.suggestedTracks;
  if (!suggested || suggested.length === 0) {
    return getFallbackTracks();
  }

  const bars = 8;
  const baseBpm = bpm ?? genre?.defaultBpm ?? 120;
  const bpmVal = mood
    ? baseBpm + (MOODS.find((m) => m.id === mood)?.bpmOffset ?? 0)
    : baseBpm;
  const beatsPerBar = 4;
  const regionDuration = (bars * beatsPerBar * 60 * 4) / bpmVal;
  const rootNote = keyToRootNote(key ?? genre?.defaultKey ?? "C");

  return suggested.map((track, i) => {
    const midiNotes = generateMidiForTrack(track.name, genreId, rootNote, bpmVal, mood);
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
      regions: [
        { id: nextRegionId(), start: 0, duration: Math.round(regionDuration) },
      ],
      plugins: [],
      automation: {},
      ...(midiNotes.length > 0 ? { midiNotes } : {}),
    };
  });
}

type TrackType = 'drums' | 'percussion' | 'bass' | 'guitar' | 'keys' | 'synth_lead' | 'pad' | 'sample' | 'vocal' | 'fx' | 'other'

function getTrackType(trackName: string): TrackType {
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

function getPercussionPattern(secPerBeat: number): MIDINote[] {
  const notes: MIDINote[] = []
  for (let bar = 0; bar < 8; bar++) {
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

function getDrumPattern(genreId: string, secPerBeat: number): MIDINote[] {
  const notes: MIDINote[] = []

  switch (genreId) {
    case 'edm': {
      for (let bar = 0; bar < 8; bar++) {
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
      for (let bar = 0; bar < 8; bar++) {
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
      for (let bar = 0; bar < 8; bar++) {
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
      for (let bar = 0; bar < 8; bar++) {
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
      for (let bar = 0; bar < 8; bar++) {
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
      for (let bar = 0; bar < 8; bar++) {
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
      for (let bar = 0; bar < 8; bar++) {
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
      for (let bar = 0; bar < 8; bar++) {
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
): MIDINote[] {
  const trackType = getTrackType(trackName)
  const genre = GENRES.find(g => g.id === genreId)
  const scaleType = getDefaultScaleType(genre?.defaultKey ?? 'C')
  const secPerBeat = 60 / bpm
  const bars = 8
  const beatsPerBar = 4

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
      result = getDrumPattern(genreId, secPerBeat)
      break
    }
    case 'percussion': {
      result = getPercussionPattern(secPerBeat)
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

function getFallbackTracks(): TrackDef[] {
  return [
    {
      id: "1",
      name: "Vocal",
      color: "bg-red-500",
      muted: false,
      solo: false,
      volume: 80,
      pan: 0,
      sends: {},
      sidechainSource: null,
      regions: [{ id: nextRegionId(), start: 0, duration: 200 }],
      plugins: [],
      automation: {},
    },
    {
      id: "2",
      name: "Instrumento",
      color: "bg-blue-500",
      muted: false,
      solo: false,
      volume: 75,
      pan: 0,
      sends: {},
      sidechainSource: null,
      regions: [{ id: nextRegionId(), start: 0, duration: 200 }],
      plugins: [],
      automation: {},
    },
    {
      id: "3",
      name: "Bateria",
      color: "bg-green-500",
      muted: false,
      solo: false,
      volume: 85,
      pan: 0,
      sends: {},
      sidechainSource: null,
      regions: [{ id: nextRegionId(), start: 0, duration: 200 }],
      plugins: [],
      automation: {},
    },
    {
      id: "4",
      name: "Baixo",
      color: "bg-purple-500",
      muted: false,
      solo: false,
      volume: 80,
      pan: 0,
      sends: {},
      sidechainSource: null,
      regions: [{ id: nextRegionId(), start: 0, duration: 200 }],
      plugins: [],
      automation: {},
    },
  ];
}
