export type TimbreCategory = "keys" | "guitar" | "bass" | "drums" | "pad" | "lead" | "fx"

export interface TimbreDspSettings {
  vcfCutoff: number
  vcfResonance?: number
  reverbMix: number
  chorusMix?: number
  drive?: number
}

export interface TimbrePatch {
  id: string
  name: string
  engine: "juno" | "triton" | "sample"
  category: TimbreCategory
  moodPresets: Partial<Record<"sun" | "rain" | "snow" | "day" | "night", TimbreDspSettings>>
}

export const TIMBRE_REGISTRY: TimbrePatch[] = [
  {
    id: "juno_warm_pad", name: "Juno Warm Pad", engine: "juno", category: "pad",
    moodPresets: {
      sun: { vcfCutoff: 3000, reverbMix: 0.1, chorusMix: 0.3 },
      rain: { vcfCutoff: 600, reverbMix: 0.6, chorusMix: 0.5 },
      snow: { vcfCutoff: 1200, reverbMix: 0.5, chorusMix: 0.7 },
      day: { vcfCutoff: 2000, reverbMix: 0.2, chorusMix: 0.3 },
      night: { vcfCutoff: 1000, reverbMix: 0.4, chorusMix: 0.5 },
    },
  },
  {
    id: "juno_saw_lead", name: "Juno Saw Lead", engine: "juno", category: "lead",
    moodPresets: {
      sun: { vcfCutoff: 4000, reverbMix: 0.1, drive: 0.4 },
      rain: { vcfCutoff: 900, reverbMix: 0.5, drive: 0 },
      snow: { vcfCutoff: 1800, reverbMix: 0.4, drive: 0.1 },
      day: { vcfCutoff: 2500, reverbMix: 0.15, drive: 0.2 },
      night: { vcfCutoff: 1500, reverbMix: 0.3, drive: 0.3 },
    },
  },
  {
    id: "juno_sub_bass", name: "Juno Sub Bass", engine: "juno", category: "bass",
    moodPresets: {
      sun: { vcfCutoff: 800, reverbMix: 0, drive: 0.3 },
      rain: { vcfCutoff: 300, reverbMix: 0.3, drive: 0 },
      snow: { vcfCutoff: 400, reverbMix: 0.2, drive: 0 },
      day: { vcfCutoff: 600, reverbMix: 0, drive: 0.15 },
      night: { vcfCutoff: 500, reverbMix: 0.1, drive: 0.4 },
    },
  },
  {
    id: "juno_bassline", name: "Juno Bassline", engine: "juno", category: "bass",
    moodPresets: {
      sun: { vcfCutoff: 1200, reverbMix: 0, drive: 0.2 },
      rain: { vcfCutoff: 400, reverbMix: 0.4, drive: 0 },
      snow: { vcfCutoff: 500, reverbMix: 0.3, drive: 0 },
      day: { vcfCutoff: 800, reverbMix: 0.05, drive: 0.1 },
      night: { vcfCutoff: 700, reverbMix: 0.15, drive: 0.3 },
    },
  },
  {
    id: "juno_chorus_pad", name: "Juno Chorus Pad", engine: "juno", category: "pad",
    moodPresets: {
      sun: { vcfCutoff: 3000, reverbMix: 0.15, chorusMix: 0.6 },
      rain: { vcfCutoff: 700, reverbMix: 0.7, chorusMix: 0.8 },
      snow: { vcfCutoff: 1500, reverbMix: 0.5, chorusMix: 0.7 },
      day: { vcfCutoff: 2000, reverbMix: 0.25, chorusMix: 0.5 },
      night: { vcfCutoff: 1000, reverbMix: 0.4, chorusMix: 0.6 },
    },
  },
  {
    id: "triton_epiano", name: "Triton Electric Piano", engine: "triton", category: "keys",
    moodPresets: {
      sun: { vcfCutoff: 5000, reverbMix: 0.1 },
      rain: { vcfCutoff: 1500, reverbMix: 0.5 },
      snow: { vcfCutoff: 2500, reverbMix: 0.4 },
      day: { vcfCutoff: 4000, reverbMix: 0.15 },
      night: { vcfCutoff: 2000, reverbMix: 0.3 },
    },
  },
  {
    id: "triton_strings", name: "Triton Strings", engine: "triton", category: "pad",
    moodPresets: {
      sun: { vcfCutoff: 4000, reverbMix: 0.15 },
      rain: { vcfCutoff: 1000, reverbMix: 0.6 },
      snow: { vcfCutoff: 2000, reverbMix: 0.5 },
      day: { vcfCutoff: 3000, reverbMix: 0.2 },
      night: { vcfCutoff: 1500, reverbMix: 0.35 },
    },
  },
  {
    id: "triton_brass_stabs", name: "Triton Brass Stabs", engine: "triton", category: "lead",
    moodPresets: {
      sun: { vcfCutoff: 5000, reverbMix: 0.05, drive: 0.2 },
      rain: { vcfCutoff: 1200, reverbMix: 0.4, drive: 0 },
      snow: { vcfCutoff: 2000, reverbMix: 0.3, drive: 0 },
      day: { vcfCutoff: 3500, reverbMix: 0.1, drive: 0.1 },
      night: { vcfCutoff: 1800, reverbMix: 0.25, drive: 0.15 },
    },
  },
  {
    id: "triton_modular_pluck", name: "Triton Modular Pluck", engine: "triton", category: "keys",
    moodPresets: {
      sun: { vcfCutoff: 4000, reverbMix: 0.1 },
      rain: { vcfCutoff: 1000, reverbMix: 0.5 },
      snow: { vcfCutoff: 2000, reverbMix: 0.4 },
      day: { vcfCutoff: 3000, reverbMix: 0.15 },
      night: { vcfCutoff: 1500, reverbMix: 0.3 },
    },
  },
  {
    id: "808_sub_bass", name: "808 Sub Bass", engine: "triton", category: "bass",
    moodPresets: {
      sun: { vcfCutoff: 500, reverbMix: 0, drive: 0.5 },
      rain: { vcfCutoff: 200, reverbMix: 0.2, drive: 0 },
      snow: { vcfCutoff: 300, reverbMix: 0.15, drive: 0 },
      day: { vcfCutoff: 400, reverbMix: 0, drive: 0.3 },
      night: { vcfCutoff: 350, reverbMix: 0.1, drive: 0.6 },
    },
  },
]

export function matchTimbre(category: TimbreCategory, mood: string): TimbrePatch | undefined {
  return TIMBRE_REGISTRY.find(t => t.category === category && t.moodPresets[mood as keyof typeof t.moodPresets])
}

export function getDspSettings(patch: TimbrePatch, mood: string): TimbreDspSettings {
  return patch.moodPresets[mood as keyof typeof patch.moodPresets] ?? {
    vcfCutoff: 2000,
    reverbMix: 0.2,
  }
}
