import type { MIDINote } from "./types"

export interface RenderChunk {
  startBeat: number
  endBeat: number
  notes: MIDINote[]
  buffer: AudioBuffer | null
}

export function splitIntoLayers(notes: MIDINote[], barsPerChunk: number = 4, beatsPerBar: number = 4): RenderChunk[] {
  const chunks: RenderChunk[] = []
  let maxEnd = 0
  for (const note of notes) {
    const end = note.start + note.duration
    if (end > maxEnd) maxEnd = end
  }
  const totalBeats = Math.ceil(maxEnd)
  const chunkSize = barsPerChunk * beatsPerBar

  for (let start = 0; start < totalBeats; start += chunkSize) {
    const end = start + chunkSize
    chunks.push({
      startBeat: start,
      endBeat: end,
      notes: notes.filter(n => n.start >= start && n.start < end),
      buffer: null,
    })
  }

  return chunks
}

export interface ChunkRenderResult {
  buffer: AudioBuffer
  startBeat: number
  endBeat: number
}

export async function renderLayer(
  notes: MIDINote[],
  startBeat: number,
  endBeat: number,
  bpm: number,
  sampleRate: number = 44100,
): Promise<ChunkRenderResult | null> {
  const beatDuration = 60 / Math.max(1, bpm)
  const duration = (endBeat - startBeat) * beatDuration + 0.5
  const numSamples = Math.ceil(sampleRate * duration)

  if (typeof OfflineAudioContext === "undefined") return null

  const ctx = new OfflineAudioContext(1, numSamples, sampleRate)
  const NOTE_FREQS: number[] = []
  for (let i = 0; i < 128; i++) NOTE_FREQS[i] = 440 * Math.pow(2, (i - 69) / 12)

  for (const note of notes) {
    const freq = NOTE_FREQS[note.pitch] || 440
    const noteStart = (note.start - startBeat) * beatDuration
    const noteDur = note.duration * beatDuration
    const vol = Math.max(0.01, note.velocity / 127) * 0.3

    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(freq, noteStart)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, noteStart)
    gain.gain.linearRampToValueAtTime(vol, noteStart + 0.005)
    gain.gain.setValueAtTime(vol * 0.8, noteStart + noteDur * 0.7)
    gain.gain.linearRampToValueAtTime(0, noteStart + noteDur)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(noteStart)
    osc.stop(noteStart + noteDur + 0.05)
  }

  const buffer = await ctx.startRendering()
  return { buffer, startBeat, endBeat }
}

export function freeChunkBuffer(chunk: RenderChunk): void {
  chunk.buffer = null
}
