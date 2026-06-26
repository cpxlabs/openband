export interface SubgenreDefinition {
  id: string
  name: string
  defaultBpmRange: [number, number]
  drumPatternId: string
  recommendedTimbres: string[]
}

export interface GenreNode {
  id: string
  name: string
  icon: string
  defaultKey: string
  subgenres: SubgenreDefinition[]
}

export const GENRE_TREE: GenreNode[] = [
  {
    id: "urban",
    name: "Urban/Hip-Hop",
    icon: "🎤",
    defaultKey: "D#m",
    subgenres: [
      {
        id: "trap", name: "Modern Trap",
        defaultBpmRange: [130, 160],
        drumPatternId: "double_time_hihats",
        recommendedTimbres: ["808_sub_bass", "triton_brass_stabs", "trap_snare"],
      },
      {
        id: "boombap", name: "90s Boom Bap",
        defaultBpmRange: [85, 95],
        drumPatternId: "swung_vintage",
        recommendedTimbres: ["juno_sub_bass", "fender_rhodes_dirty", "boom_bap_kick"],
      },
      {
        id: "lofi_urban", name: "Lo-Fi Hip-Hop",
        defaultBpmRange: [75, 90],
        drumPatternId: "chill_swung",
        recommendedTimbres: ["triton_epiano", "vinyl_drums", "juno_warm_pad"],
      },
    ],
  },
  {
    id: "electronic",
    name: "Electronic",
    icon: "🎛",
    defaultKey: "F#m",
    subgenres: [
      {
        id: "synthwave", name: "Retro Synthwave",
        defaultBpmRange: [100, 120],
        drumPatternId: "four_on_floor",
        recommendedTimbres: ["juno_chorus_pad", "juno_saw_lead", "linndrum_kit"],
      },
      {
        id: "techno", name: "Melodic Techno",
        defaultBpmRange: [124, 128],
        drumPatternId: "driving_kick",
        recommendedTimbres: ["triton_modular_pluck", "analog_sub_bass", "techno_kit"],
      },
      {
        id: "house", name: "Deep House",
        defaultBpmRange: [118, 125],
        drumPatternId: "four_on_floor_light",
        recommendedTimbres: ["triton_organ", "juno_bassline", "house_kit"],
      },
    ],
  },
  {
    id: "rock_metal",
    name: "Rock & Metal",
    icon: "🎸",
    defaultKey: "E",
    subgenres: [
      {
        id: "classic_rock", name: "Classic Rock",
        defaultBpmRange: [110, 140],
        drumPatternId: "rock_backbeat",
        recommendedTimbres: ["triton_overdrive_guitar", "rock_bass", "rock_kit"],
      },
      {
        id: "metal_core", name: "Metalcore/Djent",
        defaultBpmRange: [140, 200],
        drumPatternId: "double_bass",
        recommendedTimbres: ["djent_guitar", "metal_bass", "metal_kit"],
      },
      {
        id: "indie", name: "Indie Rock",
        defaultBpmRange: [100, 130],
        drumPatternId: "indie_backbeat",
        recommendedTimbres: ["juno_synth_lead", "triton_strings", "indie_kit"],
      },
    ],
  },
]

export function findGenreNode(genreId: string): GenreNode | undefined {
  return GENRE_TREE.find(g => g.id === genreId)
}

export function findSubgenre(genreId: string, subgenreId: string): SubgenreDefinition | undefined {
  const node = findGenreNode(genreId)
  return node?.subgenres.find(s => s.id === subgenreId)
}
