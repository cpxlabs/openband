import { findSubgenre, type SubgenreDefinition } from './genreTree'
import { matchTimbre, getDspSettings, TIMBRE_REGISTRY, type TimbreCategory, type TimbreDspSettings } from './timbreRegistry'

export interface TrackAsset {
  name: string
  category: TimbreCategory
  patchId: string
  engine: "juno" | "triton" | "sample"
  dspSettings: TimbreDspSettings
}

export function allocateTrackAssets(genreId: string, subgenreId: string, mood: string): TrackAsset[] {
  const subgenre = findSubgenre(genreId, subgenreId)
  if (!subgenre) return getDefaultAssets(mood)

  const timbreMap: Record<string, TimbreCategory> = {
    bass: "bass", sub_bass: "bass", guitar: "guitar", keys: "keys", piano: "keys",
    pad: "pad", lead: "lead", synth: "lead", drums: "drums", brass: "lead",
    strings: "pad", pluck: "keys", organ: "keys",
  }

  return subgenre.recommendedTimbres.map((timbreId, i) => {
    const category = guessCategory(timbreId, timbreMap)
    const patch = matchTimbre(category, mood) || matchTimbre("keys", mood)
    return {
      name: getDefaultTrackName(subgenre, i),
      category,
      patchId: patch?.id ?? "juno_warm_pad",
      engine: patch?.engine ?? "juno",
      dspSettings: patch ? getDspSettings(patch, mood) : { vcfCutoff: 2000, reverbMix: 0.2 },
    }
  })
}

function guessCategory(timbreId: string, map: Record<string, TimbreCategory>): TimbreCategory {
  for (const [key, cat] of Object.entries(map)) {
    if (timbreId.includes(key)) return cat
  }
  return "keys"
}

function getDefaultTrackName(subgenre: SubgenreDefinition, index: number): string {
  const names: Record<string, string[]> = {
    trap: ["808 Bass", "Trap Drums", "Bell Arp"],
    boombap: ["Vintage Bass", "Boom Bap Drums", "Rhodes Keys"],
    synthwave: ["Retro Drums", "Juno Bass", "Synth Pad"],
    techno: ["Techno Kit", "Sub Bass", "Modular Pluck"],
    house: ["House Kit", "Deep Bass", "Organ Chords"],
    classic_rock: ["Rock Kit", "Bass", "Guitar Lead"],
    metal_core: ["Metal Kit", "Bass", "Rhythm Guitar"],
    indie: ["Indie Kit", "Bass", "Synth Lead"],
    lofi_urban: ["Lo-Fi Drums", "Sub Bass", "Tape Piano"],
  }
  const list = names[subgenre.id] ?? names.trap
  return list[index % list.length] ?? `Track ${index + 1}`
}

function getDefaultAssets(mood: string): TrackAsset[] {
  const patch = matchTimbre("keys", mood) || TIMBRE_REGISTRY[0]
  return [
    { name: "Drums", category: "drums", patchId: "juno_warm_pad", engine: "juno", dspSettings: { vcfCutoff: 2000, reverbMix: 0.2 } },
    { name: "Bass", category: "bass", patchId: "juno_sub_bass", engine: "juno", dspSettings: getDspSettings(patch, mood) },
    { name: "Keys", category: "keys", patchId: patch.id, engine: patch.engine, dspSettings: getDspSettings(patch, mood) },
  ]
}
