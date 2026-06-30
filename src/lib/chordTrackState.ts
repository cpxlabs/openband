import type { MIDINote } from "./types";

export interface ChordRegion {
  id: string;
  start: number;
  duration: number;
  symbol: string;
  root: number;
  quality: ChordQuality;
  key: string;
  inversion: number;
  velocity: number;
  color: string;
}

export type ChordQuality =
  | "major" | "minor" | "dim" | "aug" | "sus2" | "sus4"
  | "maj7" | "min7" | "dom7" | "dim7" | "min7b5"
  | "add9" | "min9" | "maj9" | "dom9"
  | "power" | "single";

const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  dim7: [0, 3, 6, 9],
  min7b5: [0, 3, 6, 10],
  add9: [0, 4, 7, 14],
  min9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  dom9: [0, 4, 7, 10, 14],
  power: [0, 7],
  single: [0],
};

const ROOT_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const QUALITY_SYMBOLS: Record<ChordQuality, string> = {
  major: "", minor: "m", dim: "dim", aug: "aug", sus2: "sus2", sus4: "sus4",
  maj7: "maj7", min7: "m7", dom7: "7", dim7: "dim7", min7b5: "m7b5",
  add9: "add9", min9: "m9", maj9: "maj9", dom9: "9", power: "5", single: "",
};

export const PROGRESSION_PRESETS: { name: string; key: string; chords: { root: number; quality: ChordQuality; beats: number }[] }[] = [
  { name: "Pop I-V-vi-IV", key: "C", chords: [{ root: 0, quality: "major", beats: 4 }, { root: 7, quality: "major", beats: 4 }, { root: 9, quality: "minor", beats: 4 }, { root: 5, quality: "major", beats: 4 }] },
  { name: "Jazz ii-V-I", key: "C", chords: [{ root: 2, quality: "min7", beats: 4 }, { root: 7, quality: "dom7", beats: 4 }, { root: 0, quality: "maj7", beats: 8 }] },
  { name: "Blues I-IV-V", key: "C", chords: [{ root: 0, quality: "dom7", beats: 4 }, { root: 5, quality: "dom7", beats: 4 }, { root: 7, quality: "dom7", beats: 8 }] },
  { name: "Canon Progression", key: "C", chords: [{ root: 0, quality: "major", beats: 4 }, { root: 7, quality: "major", beats: 4 }, { root: 9, quality: "minor", beats: 4 }, { root: 4, quality: "major", beats: 4 }, { root: 5, quality: "major", beats: 4 }, { root: 0, quality: "major", beats: 4 }, { root: 5, quality: "major", beats: 4 }, { root: 7, quality: "major", beats: 4 }] },
  { name: "Minor i-iv-v", key: "Am", chords: [{ root: 9, quality: "minor", beats: 4 }, { root: 2, quality: "minor", beats: 4 }, { root: 4, quality: "minor", beats: 8 }] },
  { name: "Pop vi-IV-I-V", key: "C", chords: [{ root: 9, quality: "minor", beats: 4 }, { root: 5, quality: "major", beats: 4 }, { root: 0, quality: "major", beats: 4 }, { root: 7, quality: "major", beats: 4 }] },
  { name: "Rock I-bVII-IV", key: "E", chords: [{ root: 4, quality: "major", beats: 4 }, { root: 3, quality: "major", beats: 4 }, { root: 0, quality: "major", beats: 8 }] },
];

export function buildVoicing(root: number, quality: ChordQuality, inversion: number = 0): number[] {
  const intervals = CHORD_INTERVALS[quality] ?? [0, 4, 7];
  let notes = intervals.map((i) => root + i + 60);
  for (let inv = 0; inv < inversion; inv++) {
    if (notes.length > 1) notes = [notes[0] + 12, ...notes.slice(1)];
  }
  return notes.sort((a, b) => a - b);
}

export function symbolFromChord(root: number, quality: ChordQuality): string {
  return ROOT_NAMES[root % 12] + (QUALITY_SYMBOLS[quality] ?? "");
}

export function chordsToMIDI(chords: ChordRegion[], bpm: number, velocity: number = 80): MIDINote[] {
  const notes: MIDINote[] = [];
  const beatsPerSec = bpm / 60;
  for (const chord of chords) {
    const voicing = buildVoicing(chord.root, chord.quality, chord.inversion);
    const startBeat = chord.start * beatsPerSec;
    for (const pitch of voicing) {
      notes.push({
        pitch,
        start: startBeat,
        duration: chord.duration * beatsPerSec,
        velocity: chord.velocity || velocity,
      });
    }
  }
  return notes;
}

export function suggestNextChord(current: ChordRegion): { root: number; quality: ChordQuality } {
  if (current.quality.includes("min")) return { root: (current.root + 7) % 12, quality: "major" };
  if (current.quality === "dom7") return { root: (current.root + 5) % 12, quality: "maj7" };
  return { root: (current.root + 7) % 12, quality: "major" };
}
