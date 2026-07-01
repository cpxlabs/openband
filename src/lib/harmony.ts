export type ChordQuality = 'maj' | 'min' | 'dim' | '7' | 'maj7' | 'min7' | 'sus4' | 'aug'

export interface HarmonicDegrees {
  degree: number
  quality: ChordQuality
  bass?: number
}

export interface ProgressionPreset {
  id: string
  name: string
  description: string
  mood: ('dark' | 'bright' | 'warm' | 'cold' | 'aggressive' | 'chill' | 'epic' | 'minimal' | 'nostalgic' | 'euphoric')[]
  degrees: HarmonicDegrees[]
}

export const NOTE_TO_MIDI: Record<string, number> = {
  C: 60, 'C#': 61, D: 62, 'D#': 63, E: 64, F: 65, 'F#': 66, G: 67, 'G#': 68, A: 69, 'A#': 70, B: 71,
}

export const SCALE_INTERVALS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  natural_minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  melodic_minor: [0, 2, 3, 5, 7, 9, 11],
  pentatonic_major: [0, 2, 4, 7, 9],
  pentatonic_minor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
}

export const PROGRESSION_PRESETS: ProgressionPreset[] = [
  {
    id: 'pop-classic', name: 'Pop Clássico', description: 'I - V - vi - IV — cósmico, seguro, comercial',
    mood: ['warm', 'bright'],
    degrees: [{ degree: 0, quality: 'maj' }, { degree: 4, quality: 'maj' }, { degree: 5, quality: 'min' }, { degree: 3, quality: 'maj' }],
  },
  {
    id: 'jazz-basic', name: 'Jazz/R&B Básico', description: 'ii - V - I — sofisticado, fluido, noturno',
    mood: ['dark', 'chill'],
    degrees: [{ degree: 1, quality: 'min' }, { degree: 4, quality: '7' }, { degree: 0, quality: 'maj7' }],
  },
  {
    id: 'epic-rock', name: 'Épico/Rock', description: 'i - VI - III - VII — tenso, dramático',
    mood: ['dark', 'cold'],
    degrees: [{ degree: 0, quality: 'min' }, { degree: 5, quality: 'maj' }, { degree: 2, quality: 'maj' }, { degree: 6, quality: 'maj' }],
  },
  {
    id: 'blues', name: 'Blues/Pop Raiz', description: 'I - IV - V — direto, enérgico, ensolarado',
    mood: ['bright', 'euphoric'],
    degrees: [{ degree: 0, quality: '7' }, { degree: 3, quality: '7' }, { degree: 4, quality: '7' }, { degree: 0, quality: '7' }],
  },
  {
    id: 'lofi-chill', name: 'Lo-Fi Chill', description: 'I - vi - IV - V — relaxante, introspectivo',
    mood: ['chill', 'nostalgic'],
    degrees: [{ degree: 0, quality: 'maj7' }, { degree: 5, quality: 'min' }, { degree: 3, quality: 'maj7' }, { degree: 4, quality: 'maj' }],
  },
  {
    id: 'edm-anthem', name: 'EDM Anthem', description: 'vi - IV - I - V — festa, energia',
    mood: ['euphoric', 'aggressive'],
    degrees: [{ degree: 5, quality: 'min' }, { degree: 3, quality: 'maj' }, { degree: 0, quality: 'maj' }, { degree: 4, quality: 'maj' }],
  },
  {
    id: 'acoustic-folk', name: 'Folk Acústico', description: 'I - V - IV - V — simples, campestre',
    mood: ['warm', 'bright'],
    degrees: [{ degree: 0, quality: 'maj' }, { degree: 4, quality: 'maj' }, { degree: 3, quality: 'maj' }, { degree: 4, quality: 'maj' }],
  },
  {
    id: 'dark-minimal', name: 'Minimal Escuro', description: 'i - IV - V — espaçoso, atmosférico',
    mood: ['minimal', 'cold'],
    degrees: [{ degree: 0, quality: 'min' }, { degree: 3, quality: 'maj' }, { degree: 4, quality: 'maj' }, { degree: 0, quality: 'min' }],
  },
  {
    id: 'metal-power', name: 'Metal Power', description: 'i - VI - VII — agressivo, pesado',
    mood: ['aggressive'],
    degrees: [{ degree: 0, quality: 'min' }, { degree: 5, quality: 'maj' }, { degree: 6, quality: 'maj' }],
  },
  {
    id: 'rnb-smooth', name: 'R&B Smooth', description: 'I - vi - ii - V — soul, groove',
    mood: ['dark', 'nostalgic'],
    degrees: [{ degree: 0, quality: 'maj7' }, { degree: 5, quality: 'min' }, { degree: 1, quality: 'min' }, { degree: 4, quality: '7' }],
  },
]

export function getScale(rootNote: number, scaleType: string): number[] {
  const intervals = SCALE_INTERVALS[scaleType] || SCALE_INTERVALS.major
  return intervals.map(i => rootNote + i)
}

export function isMinorKey(key: string): boolean {
  return key.includes('m')
}

export function getDefaultScaleType(key: string): string {
  return isMinorKey(key) ? 'natural_minor' : 'major'
}

export function keyToRootNote(key: string): number {
  const clean = key.replace(/m$/, '')
  return NOTE_TO_MIDI[clean] ?? 60
}

export function resolveProgression(progression: HarmonicDegrees[], rootNote: number, scaleType: string): number[][] {
  const scale = getScale(rootNote, scaleType)
  return progression.map(deg => resolvedChord(deg, scale))
}

function resolvedChord(deg: HarmonicDegrees, scale: number[]): number[] {
  const notes: number[] = []
  const root = scale[deg.degree % scale.length]
  notes.push(root)

  const thirdSemitones = deg.quality === 'min' || deg.quality === 'min7' ? 3 : deg.quality === 'dim' ? 3 : deg.quality === 'sus4' ? 5 : 4
  notes.push(root + thirdSemitones)

  const fifthSemitones = deg.quality === 'dim' || deg.quality === 'aug' ? (deg.quality === 'aug' ? 8 : 6) : 7
  notes.push(root + fifthSemitones)

  if (deg.quality === '7' || deg.quality === 'min7') notes.push(root + 10)
  if (deg.quality === 'maj7') notes.push(root + 11)

  return notes
}

export function getMidiNote(keyName: string, octave: number = 4): number {
  const base = NOTE_TO_MIDI[keyName] ?? 60
  return base + (octave - 4) * 12
}
