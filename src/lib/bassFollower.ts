import type { MIDINote } from "./types"

export interface BassFollowerConfig {
  subgenreId: string
  chordsPerBar: number
  rootOctave: number
  swing: number
}

const SUBGENRE_BASS_RHYTHMS: Record<string, { pattern: number[]; velocity: number[] }> = {
  trap: {
    pattern: [0, 0.5, 1, 2, 2.5, 3],
    velocity: [100, 60, 90, 100, 50, 85],
  },
  boombap: {
    pattern: [0, 2, 2.5, 3.5],
    velocity: [95, 80, 60, 75],
  },
  synthwave: {
    pattern: [0, 1, 2, 3],
    velocity: [100, 70, 100, 80],
  },
  techno: {
    pattern: [0, 1.5, 2, 3],
    velocity: [110, 60, 100, 70],
  },
  house: {
    pattern: [0, 2, 2.5],
    velocity: [100, 90, 70],
  },
  classic_rock: {
    pattern: [0, 1, 2, 2.5, 3],
    velocity: [100, 60, 90, 50, 80],
  },
  metal_core: {
    pattern: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
    velocity: [100, 70, 90, 60, 100, 70, 90, 60],
  },
  indie: {
    pattern: [0, 2, 2.5],
    velocity: [90, 80, 60],
  },
  lofi_urban: {
    pattern: [0, 2],
    velocity: [80, 65],
  },
}

export function generateBassLine(rootNotes: number[], totalBars: number, bpm: number, subgenreId: string): MIDINote[] {
  const rhythm = SUBGENRE_BASS_RHYTHMS[subgenreId] ?? SUBGENRE_BASS_RHYTHMS.trap
  const secPerBeat = 60 / Math.max(1, bpm)
  const beatsPerBar = 4
  const notes: MIDINote[] = []
  const octave = -1

  for (let bar = 0; bar < totalBars; bar++) {
    const rootIdx = bar % rootNotes.length
    const root = rootNotes[rootIdx] + octave * 12
    const barStart = bar * beatsPerBar * secPerBeat

    for (let i = 0; i < rhythm.pattern.length; i++) {
      const beatOffset = rhythm.pattern[i]
      const velocity = rhythm.velocity[i]
      const isAccent = beatOffset % 1 === 0
      const pitch = isAccent ? root : root + 7

      notes.push({
        pitch: Math.max(0, pitch),
        start: barStart + beatOffset * secPerBeat,
        duration: secPerBeat * 1.2,
        velocity: Math.round(velocity * 1.1),
      })
    }
  }

  return notes
}
