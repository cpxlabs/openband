export interface DrumSample {
  url: string
  buffer: AudioBuffer | null
  category: "essential" | "secondary"
  loaded: boolean
}

export interface DrumKitManifest {
  name: string
  samples: { pitch: number; url: string; category: "essential" | "secondary" }[]
}

const DRUM_KITS: Record<string, DrumKitManifest> = {
  trap: {
    name: "Trap Kit",
    samples: [
      { pitch: 36, url: "/samples/trap/kick.wav", category: "essential" },
      { pitch: 38, url: "/samples/trap/snare.wav", category: "essential" },
      { pitch: 42, url: "/samples/trap/hihat.wav", category: "essential" },
      { pitch: 46, url: "/samples/trap/openhat.wav", category: "secondary" },
      { pitch: 49, url: "/samples/trap/crash.wav", category: "secondary" },
      { pitch: 37, url: "/samples/trap/rim.wav", category: "secondary" },
    ],
  },
  boombap: {
    name: "Boom Bap Kit",
    samples: [
      { pitch: 36, url: "/samples/boombap/kick.wav", category: "essential" },
      { pitch: 38, url: "/samples/boombap/snare.wav", category: "essential" },
      { pitch: 42, url: "/samples/boombap/hihat.wav", category: "essential" },
      { pitch: 51, url: "/samples/boombap/ride.wav", category: "secondary" },
    ],
  },
  rock: {
    name: "Rock Kit",
    samples: [
      { pitch: 36, url: "/samples/rock/kick.wav", category: "essential" },
      { pitch: 38, url: "/samples/rock/snare.wav", category: "essential" },
      { pitch: 42, url: "/samples/rock/hihat.wav", category: "essential" },
      { pitch: 49, url: "/samples/rock/crash.wav", category: "secondary" },
      { pitch: 51, url: "/samples/rock/ride.wav", category: "secondary" },
    ],
  },
}

const sampleCache = new Map<string, AudioBuffer>()

export async function loadEssentialSamples(kitId: string, ctx: AudioContext): Promise<boolean> {
  const kit = DRUM_KITS[kitId]
  if (!kit) return false

  const essentialSamples = kit.samples.filter(s => s.category === "essential")

  for (const sample of essentialSamples) {
    if (sampleCache.has(sample.url)) continue
    try {
      const response = await fetch(sample.url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      sampleCache.set(sample.url, audioBuffer)
    } catch (e) {
      console.warn("Failed to load drum sample:", sample.url, e)
    }
  }

  return true
}

export function getSampleBuffer(kitId: string, pitch: number): AudioBuffer | null {
  const kit = DRUM_KITS[kitId]
  if (!kit) return null
  const sample = kit.samples.find(s => s.pitch === pitch)
  if (!sample) return null
  return sampleCache.get(sample.url) || null
}

export function preloadSecondarySamples(kitId: string, ctx: AudioContext): void {
  const kit = DRUM_KITS[kitId]
  if (!kit) return
  const secondary = kit.samples.filter(s => s.category === "secondary")
  for (const sample of secondary) {
    if (sampleCache.has(sample.url)) continue
    fetch(sample.url)
      .then(r => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(audioBuf => sampleCache.set(sample.url, audioBuf))
      .catch(e => console.warn("Secondary sample preload failed:", sample.url, e))
  }
}
