import { Router, Request, Response } from "express";
import { resolveProgression } from "../lib/musicTheory";

const router = Router();

const KEY_TO_ROOT: Record<string, number> = {
  "C": 60, "C#": 61, "Db": 61, "D": 62, "D#": 63, "Eb": 63,
  "E": 64, "F": 65, "F#": 66, "Gb": 66, "G": 67, "G#": 68,
  "Ab": 68, "A": 69, "A#": 70, "Bb": 70, "B": 71,
};

const CHORD_PATTERNS: Record<string, string[]> = {
  "I-V-vi-IV": ["I", "V", "vi", "IV"],
  "ii-V-I": ["ii", "V", "I"],
  "i-VI-III-VII": ["i", "VI", "III", "VII"],
  "I-vi-IV-V": ["I", "vi", "IV", "V"],
  "vi-IV-I-V": ["vi", "IV", "I", "V"],
  "I-IV-V": ["I", "IV", "V"],
  "I7-IV7-V7": ["I7", "IV7", "V7"],
  "i-VI-VII": ["i", "VI", "VII"],
  "I-vi-ii-V": ["I", "vi", "ii", "V"],
  "I-V-IV-V": ["I", "V", "IV", "V"],
};

const GENRE_PATTERNS: Record<string, string> = {
  pop: "I-V-vi-IV",
  rock: "I-IV-V",
  edm: "vi-IV-I-V",
  "hip-hop": "i-VI-III-VII",
  jazz: "ii-V-I",
  loFi: "I-vi-IV-V",
  rnb: "I-vi-ii-V",
  metal: "i-VI-VII",
  acoustic: "I-V-IV-V",
  blues: "I7-IV7-V7",
};

const DRUM_PATTERNS: Record<string, number[][]> = {
  pop: [[36, 0], [42, 0.5], [38, 1], [42, 1.5], [36, 2], [42, 2.5], [38, 3], [42, 3.5]],
  rock: [[36, 0], [38, 1], [36, 2], [38, 3]],
  edm: [[36, 0], [36, 1], [36, 2], [36, 3]],
  "hip-hop": [[36, 0], [42, 1.5], [38, 2], [42, 3], [36, 3.5]],
  jazz: [[36, 0], [42, 1.5], [38, 2], [42, 2.5], [36, 3], [42, 3.5]],
  loFi: [[36, 0], [42, 0.75], [38, 1.5], [42, 2.25], [36, 2.5], [42, 3.25], [38, 3.5]],
  rnb: [[36, 0], [42, 0.5], [38, 1.5], [42, 2], [36, 3], [42, 3.5]],
  metal: [[36, 0], [38, 0.25], [36, 0.5], [38, 0.75], [36, 1], [38, 1.25], [36, 1.5], [38, 1.75]],
  acoustic: [[36, 0], [42, 1], [38, 2], [42, 3]],
  blues: [[36, 0], [42, 1], [36, 2], [42, 2.5], [38, 3], [42, 3.5]],
};

function parseKey(raw: string): { root: string; isMinor: boolean } {
  const trimmed = raw.trim();
  const isMinor = trimmed.toLowerCase().endsWith("m") || trimmed.toLowerCase().includes("minor");
  const root = trimmed
    .replace(/maj.*/i, "")
    .replace(/min.*/i, "")
    .replace(/major.*/i, "")
    .replace(/minor.*/i, "")
    .replace(/m\s*$/, "")
    .trim();
  return { root, isMinor };
}

router.post("/generate-midi", (req: Request, res: Response) => {
  const { bpm, key, timeSignature, userPrompt } = req.body ?? {};
  const safeBpm = typeof bpm === "number" && bpm > 0 ? bpm : 120;
  const safeTimeSig = timeSignature || "4/4";
  const safeKey = key || "C Major";

  const { root, isMinor } = parseKey(safeKey);
  const rootNote = KEY_TO_ROOT[root] || 60;
  const scaleType = isMinor ? "natural_minor" : "major";

  const genreHint = (userPrompt || "").toLowerCase();
  let patternId = GENRE_PATTERNS.pop;
  let drumPattern = DRUM_PATTERNS.pop;
  let bars = 4;

  for (const [genre, p] of Object.entries(GENRE_PATTERNS)) {
    if (genreHint.includes(genre.toLowerCase())) {
      patternId = p;
      drumPattern = DRUM_PATTERNS[genre] || DRUM_PATTERNS.pop;
      bars = 8;
      break;
    }
  }

  const degrees = CHORD_PATTERNS[patternId] || ["I", "IV", "V"];
  const progression = resolveProgression(degrees, rootNote, scaleType);

  const midiData: { note: number; start: number; duration: number; velocity: number }[] = [];
  const beatsPerBar = parseInt(safeTimeSig.split("/")[0]) || 4;
  const beatsPerChord = bars > 4 ? 2 : 1;

  for (let bar = 0; bar < bars; bar++) {
    const chordIndex = bar % progression.length;
    const chord = progression[chordIndex];
    const barStart = bar * beatsPerBar;

    if (chord.length >= 3) {
      midiData.push({
        note: chord[0],
        start: barStart,
        duration: beatsPerChord * 1.5,
        velocity: 85,
      });
      midiData.push({
        note: chord[1],
        start: barStart + 0.25,
        duration: beatsPerChord * 1.5,
        velocity: 75,
      });
      midiData.push({
        note: chord[2],
        start: barStart + 0.5,
        duration: beatsPerChord * 1.5,
        velocity: 70,
      });
    }

    for (const [note, beat] of drumPattern) {
      midiData.push({
        note,
        start: barStart + beat,
        duration: 0.25,
        velocity: 100 + Math.round(Math.random() * 20),
      });
    }
  }

  midiData.sort((a, b) => a.start - b.start);

  res.json({
    bpm: safeBpm,
    key: safeKey,
    timeSignature: safeTimeSig,
    genreHint: genreHint || "pop",
    bars,
    totalNotes: midiData.length,
    midiData,
  });
});

export default router;
