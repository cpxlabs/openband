import type { ChordQuality } from "./harmony"

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