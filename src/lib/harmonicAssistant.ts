import type { ChordQuality } from "./harmony"
import type { MIDINote } from "./types"
import { keyToRootNote, getDefaultScaleType, getScale } from "./harmony"

export interface ChordSuggestion {
  degree: number
  quality: ChordQuality
  probability: number
  label: string
}

const MAJOR_MARKOV: Record<string, { degree: number; quality: ChordQuality; weight: number }[]> = {
  "0:maj": [
    { degree: 3, quality: "maj", weight: 30 },
    { degree: 4, quality: "maj", weight: 25 },
    { degree: 5, quality: "min", weight: 20 },
    { degree: 1, quality: "min", weight: 15 },
  ],
  "1:min": [
    { degree: 4, quality: "7", weight: 35 },
    { degree: 2, quality: "min", weight: 25 },
    { degree: 6, quality: "maj", weight: 20 },
  ],
  "2:min": [
    { degree: 5, quality: "7", weight: 40 },
    { degree: 4, quality: "maj", weight: 25 },
  ],
  "4:maj": [
    { degree: 0, quality: "maj", weight: 30 },
    { degree: 5, quality: "min", weight: 25 },
    { degree: 1, quality: "min", weight: 20 },
  ],
  "5:min": [
    { degree: 1, quality: "min", weight: 30 },
    { degree: 4, quality: "maj", weight: 35 },
    { degree: 0, quality: "maj", weight: 20 },
  ],
  "5:maj": [
    { degree: 4, quality: "7", weight: 30 },
    { degree: 0, quality: "maj", weight: 25 },
  ],
}

const MINOR_MARKOV: Record<string, { degree: number; quality: ChordQuality; weight: number }[]> = {
  "0:min": [
    { degree: 5, quality: "maj", weight: 30 },
    { degree: 6, quality: "maj", weight: 25 },
    { degree: 3, quality: "maj", weight: 20 },
  ],
  "1:min": [
    { degree: 4, quality: "7", weight: 35 },
    { degree: 0, quality: "min", weight: 25 },
  ],
  "4:maj": [
    { degree: 0, quality: "min", weight: 40 },
    { degree: 5, quality: "maj", weight: 20 },
  ],
  "5:maj": [
    { degree: 6, quality: "maj", weight: 30 },
    { degree: 2, quality: "maj", weight: 25 },
    { degree: 0, quality: "min", weight: 20 },
  ],
  "6:maj": [
    { degree: 2, quality: "maj", weight: 35 },
    { degree: 3, quality: "maj", weight: 25 },
    { degree: 0, quality: "min", weight: 20 },
  ],
}

export function suggestNextChords(
  currentProgression: { degree: number; quality: ChordQuality }[],
  isMinor: boolean = false,
  maxSuggestions: number = 3,
): ChordSuggestion[] {
  if (currentProgression.length === 0) {
    const starter = isMinor ? MINOR_MARKOV["0:min"] : MAJOR_MARKOV["0:maj"]
    return (starter || []).slice(0, maxSuggestions).map(s => ({
      degree: s.degree,
      quality: s.quality,
      probability: s.weight,
      label: romanNumeralLabel(s.degree, s.quality),
    }))
  }

  const last = currentProgression[currentProgression.length - 1]
  const key = `${last.degree}:${last.quality}`
  const markov = isMinor ? MINOR_MARKOV : MAJOR_MARKOV
  const nexts = markov[key] || markov[Object.keys(markov)[0]] || []

  return nexts.slice(0, maxSuggestions).map(s => ({
    degree: s.degree,
    quality: s.quality,
    probability: s.weight,
    label: romanNumeralLabel(s.degree, s.quality),
  }))
}

function romanNumeralLabel(degree: number, quality: ChordQuality): string {
  const numerals = ["I", "II", "III", "IV", "V", "VI", "VII"]
  const label = numerals[degree % 7]
  if (quality === "min" || quality === "min7") return label.toLowerCase()
  if (quality === "dim") return `${label}°`
  if (quality === "7") return `${label}7`
  if (quality === "maj7") return `${label}maj7`
  return label
}

/**
 * Convert chord blocks to MIDI notes for rendering in the studio.
 */
export interface ChordBlock {
  id: string;
  degree: number;
  quality: ChordQuality;
  beats: number;
}

export function chordsToMIDINotes(
  chords: ChordBlock[],
  keySignature: string,
  bpm: number,
  octave: number = 4,
  velocity: number = 80,
): MIDINote[] {
  const rootNote = keyToRootNote(keySignature);
  const scaleType = getDefaultScaleType(keySignature);
  const scale = getScale(rootNote, scaleType);

  const notes: MIDINote[] = [];
  const beatDurationSec = 60 / bpm;
  let currentBeat = 0;

  for (const chord of chords) {
    const chordRoot = scale[chord.degree % scale.length] + octave * 12;
    const pitches: number[] = [];

    // Build chord voicing based on quality
    switch (chord.quality) {
      case "maj": pitches.push(chordRoot, chordRoot + 4, chordRoot + 7); break;
      case "min": pitches.push(chordRoot, chordRoot + 3, chordRoot + 7); break;
      case "dim": pitches.push(chordRoot, chordRoot + 3, chordRoot + 6); break;
      case "aug": pitches.push(chordRoot, chordRoot + 4, chordRoot + 8); break;
      case "7": pitches.push(chordRoot, chordRoot + 4, chordRoot + 7, chordRoot + 10); break;
      case "maj7": pitches.push(chordRoot, chordRoot + 4, chordRoot + 7, chordRoot + 11); break;
      case "min7": pitches.push(chordRoot, chordRoot + 3, chordRoot + 7, chordRoot + 10); break;
      case "sus4": pitches.push(chordRoot, chordRoot + 5, chordRoot + 7); break;
    }

    for (const pitch of pitches) {
      notes.push({
        pitch,
        start: currentBeat * beatDurationSec,
        duration: chord.beats * beatDurationSec,
        velocity,
      });
    }

    currentBeat += chord.beats;
  }

  return notes;
}

/**
 * Analyze a set of MIDI notes to detect chord content.
 * Uses pitch class histogram and template matching.
 */
export interface ChordAnalysis {
  pitchClasses: number[];
  detectedChord: string;
  confidence: number;
  key: string;
}

const CHORD_TEMPLATES: Record<string, number[]> = {
  "C":  [1,0,0,0,1,0,0,1,0,0,0,0],
  "Cm": [1,0,0,1,0,0,0,1,0,0,0,0],
  "D":  [0,0,1,0,0,0,1,0,0,1,0,0],
  "Dm": [0,0,1,0,0,1,0,0,0,1,0,0],
  "E":  [0,0,0,0,1,0,0,1,0,0,0,1],
  "Em": [0,0,0,1,0,0,0,1,0,0,0,1],
  "F":  [0,0,0,0,0,1,0,0,1,0,0,1],
  "Fm": [0,0,0,1,0,1,0,0,1,0,0,0],
  "G":  [0,0,1,0,0,0,0,1,0,0,0,1],
  "Gm": [0,0,1,0,0,1,0,0,0,0,0,1],
  "A":  [1,0,0,0,1,0,0,0,0,1,0,0],
  "Am": [1,0,0,1,0,0,0,0,0,1,0,0],
  "B":  [0,0,1,0,0,0,1,0,0,0,1,0],
  "Bm": [0,0,1,0,0,1,0,0,0,0,1,0],
};

export function analyzeChordContent(notes: MIDINote[]): ChordAnalysis {
  const pitchClasses = new Array(12).fill(0);

  for (const note of notes) {
    pitchClasses[note.pitch % 12]++;
  }

  // Normalize
  const max = Math.max(...pitchClasses, 1);
  const normalized = pitchClasses.map((c) => c / max);

  // Match against templates
  let bestChord = "C";
  let bestScore = 0;
  for (const [name, template] of Object.entries(CHORD_TEMPLATES)) {
    let score = 0;
    for (let i = 0; i < 12; i++) {
      score += normalized[i] * template[i];
    }
    if (score > bestScore) {
      bestScore = score;
      bestChord = name;
    }
  }

  return {
    pitchClasses: normalized,
    detectedChord: bestChord,
    confidence: Math.round(bestScore * 100),
    key: bestChord.includes("m") ? `${bestChord} minor` : `${bestChord} major`,
  };
}