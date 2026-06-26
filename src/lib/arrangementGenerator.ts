export type EnergyLevel = 1 | 2 | 3 | 4 | 5

export interface EnergySection {
  name: string
  label: string
  startBar: number
  endBar: number
  energy: EnergyLevel
  description: string
}

const SUBGENRE_STRUCTURES: Record<string, EnergySection[]> = {
  trap: [
    { name: "Intro", label: "INTRO", startBar: 1, endBar: 4, energy: 2, description: "808 solo, filtro abrindo" },
    { name: "Verse", label: "V1", startBar: 5, endBar: 12, energy: 3, description: "Hi-hats entram, baixo pesado" },
    { name: "Pre-Hook", label: "PRE", startBar: 13, endBar: 16, energy: 4, description: "Build up, snare rolls" },
    { name: "Hook", label: "HOOK", startBar: 17, endBar: 24, energy: 5, description: "Drop completo, todos elementos" },
    { name: "Verse 2", label: "V2", startBar: 25, endBar: 32, energy: 3, description: "Vocal volta, beat reduz" },
    { name: "Hook", label: "HOOK", startBar: 33, endBar: 40, energy: 5, description: "Drop final com variação" },
    { name: "Outro", label: "OUTRO", startBar: 41, endBar: 48, energy: 1, description: "Fade out, só 808" },
  ],
  boombap: [
    { name: "Intro", label: "INTRO", startBar: 1, endBar: 4, energy: 2, description: "Sample chop, scratch" },
    { name: "Verse 1", label: "V1", startBar: 5, endBar: 16, energy: 3, description: "Kick + snare clássico" },
    { name: "Chorus", label: "CH", startBar: 17, endBar: 24, energy: 4, description: "Sample principal, energia" },
    { name: "Verse 2", label: "V2", startBar: 25, endBar: 36, energy: 3, description: "Variação do beat" },
    { name: "Outro", label: "OUTRO", startBar: 37, endBar: 40, energy: 1, description: "Fade com scratch" },
  ],
  synthwave: [
    { name: "Intro", label: "INTRO", startBar: 1, endBar: 8, energy: 2, description: "Pad swell, arp entrando" },
    { name: "Verse", label: "V", startBar: 9, endBar: 24, energy: 3, description: "Bateria eletrônica, baixo" },
    { name: "Chorus", label: "CH", startBar: 25, endBar: 40, energy: 5, description: "Saw lead, energia máxima" },
    { name: "Bridge", label: "BRIDGE", startBar: 41, endBar: 48, energy: 2, description: "Breakdown, só pad" },
    { name: "Chorus", label: "CH", startBar: 49, endBar: 64, energy: 5, description: "Final com variação lead" },
  ],
  techno: [
    { name: "Intro", label: "INTRO", startBar: 1, endBar: 16, energy: 2, description: "Kick 4x4, filtro baixo" },
    { name: "Buildup", label: "BUILD", startBar: 17, endBar: 32, energy: 3, description: "Elementos entram gradual" },
    { name: "Drop", label: "DROP", startBar: 33, endBar: 64, energy: 5, description: "Energia total, synths" },
    { name: "Break", label: "BREAK", startBar: 65, endBar: 80, energy: 2, description: "Só kick + atmosfera" },
    { name: "Drop 2", label: "DROP2", startBar: 81, endBar: 112, energy: 5, description: "Drop final estendido" },
  ],
  house: [
    { name: "Intro", label: "INTRO", startBar: 1, endBar: 8, energy: 2, description: "Kick 4x4 suave" },
    { name: "Verse", label: "V", startBar: 9, endBar: 24, energy: 3, description: "Baixo groove, percussão" },
    { name: "Chorus", label: "CH", startBar: 25, endBar: 40, energy: 4, description: "Vocal chops, piano" },
    { name: "Breakdown", label: "BRK", startBar: 41, endBar: 48, energy: 2, description: "Só pads e atmosfera" },
    { name: "Drop", label: "DROP", startBar: 49, endBar: 64, energy: 5, description: "Todos elementos, energia" },
  ],
  classic_rock: [
    { name: "Intro", label: "INTRO", startBar: 1, endBar: 4, energy: 3, description: "Riff de guitarra" },
    { name: "Verse 1", label: "V1", startBar: 5, endBar: 12, energy: 3, description: "Vocal, baixo, bateria" },
    { name: "Chorus", label: "CH", startBar: 13, endBar: 20, energy: 5, description: "Refrão cheio, backing vocals" },
    { name: "Verse 2", label: "V2", startBar: 21, endBar: 28, energy: 3, description: "Segundo verso" },
    { name: "Chorus", label: "CH", startBar: 29, endBar: 36, energy: 5, description: "Refrão com mais energia" },
    { name: "Solo", label: "SOLO", startBar: 37, endBar: 44, energy: 4, description: "Guitar solo" },
    { name: "Outro", label: "OUTRO", startBar: 45, endBar: 48, energy: 2, description: "Fade out com riff" },
  ],
  metal_core: [
    { name: "Intro", label: "INTRO", startBar: 1, endBar: 4, energy: 4, description: "Riff agressivo" },
    { name: "Verse", label: "V", startBar: 5, endBar: 12, energy: 4, description: "Guitarras, double bass" },
    { name: "Chorus", label: "CH", startBar: 13, endBar: 20, energy: 5, description: "Refrão melódico, breakdown" },
    { name: "Bridge", label: "BRIDGE", startBar: 21, endBar: 24, energy: 2, description: "Clean, atmosfera" },
    { name: "Breakdown", label: "BRK", startBar: 25, endBar: 32, energy: 5, description: "Pesado, mosh pit" },
    { name: "Outro", label: "OUTRO", startBar: 33, endBar: 36, energy: 3, description: "Fade agressivo" },
  ],
  indie: [
    { name: "Intro", label: "INTRO", startBar: 1, endBar: 8, energy: 2, description: "Guitarra limpa, ambiente" },
    { name: "Verse", label: "V", startBar: 9, endBar: 24, energy: 3, description: "Vocal, banda entra" },
    { name: "Chorus", label: "CH", startBar: 25, endBar: 32, energy: 5, description: "Energia, distorção" },
    { name: "Verse 2", label: "V2", startBar: 33, endBar: 40, energy: 3, description: "Segundo verso, mais camadas" },
    { name: "Chorus", label: "CH", startBar: 41, endBar: 48, energy: 5, description: "Refrão final explosivo" },
  ],
  lofi_urban: [
    { name: "Intro", label: "INTRO", startBar: 1, endBar: 4, energy: 1, description: "Vinyl crackle, sample" },
    { name: "Verse", label: "V", startBar: 5, endBar: 20, energy: 2, description: "Beat lo-fi, baixo suave" },
    { name: "Chorus", label: "CH", startBar: 21, endBar: 28, energy: 3, description: "Melodia principal" },
    { name: "Bridge", label: "BRIDGE", startBar: 29, endBar: 32, energy: 1, description: "Só textura, sem beat" },
    { name: "Outro", label: "OUTRO", startBar: 33, endBar: 36, energy: 1, description: "Fade com vinyl stop" },
  ],
}

export function generateArrangement(subgenreId: string): EnergySection[] {
  return SUBGENRE_STRUCTURES[subgenreId] ?? SUBGENRE_STRUCTURES.trap
}

export function getEnergyLabel(energy: EnergyLevel): string {
  const labels: Record<EnergyLevel, string> = { 1: "Mínima", 2: "Baixa", 3: "Média", 4: "Alta", 5: "Máxima" }
  return labels[energy]
}

export function getEnergyColor(energy: EnergyLevel): string {
  const colors: Record<EnergyLevel, string> = {
    1: "#374151",
    2: "#6b7280",
    3: "#f59e0b",
    4: "#f97316",
    5: "#ef4444",
  }
  return colors[energy]
}

export function getTotalBars(subgenreId: string): number {
  const sections = generateArrangement(subgenreId)
  return sections[sections.length - 1]?.endBar ?? 32
}

export { SUBGENRE_STRUCTURES }
