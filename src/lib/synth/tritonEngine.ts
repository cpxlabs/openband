export interface TritonZone {
  rootNote: number
  sampleBuffer: AudioBuffer
  loNote: number
  hiNote: number
}

export class TritonEngine {
  private ctx: AudioContext
  private zones: TritonZone[] = []

  constructor(ctx: AudioContext) {
    this.ctx = ctx
  }

  async loadPreset(presetUrl: string): Promise<void> {
    try {
      const response = await fetch(presetUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer)
      this.zones = [{ rootNote: 60, sampleBuffer: audioBuffer, loNote: 0, hiNote: 127 }]
    } catch (e) {
      throw new Error(`Failed to load preset ${presetUrl}: ${e}`)
    }
  }

  loadSingleSample(audioBuffer: AudioBuffer, rootNote: number = 60): void {
    this.zones = [{ rootNote, sampleBuffer: audioBuffer, loNote: 0, hiNote: 127 }]
  }

  playNote(note: number, duration: number, velocity: number = 0.7, time?: number): void {
    const t = time ?? this.ctx.currentTime
    const zone = this.findZone(note)
    if (!zone) return

    const source = this.ctx.createBufferSource()
    source.buffer = zone.sampleBuffer

    const semitoneOffset = note - zone.rootNote
    source.playbackRate.setValueAtTime(Math.pow(2, semitoneOffset / 12), t)

    const gain = this.ctx.createGain()
    const vol = Math.max(0.01, velocity) * 0.5
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(vol, t + 0.005)
    gain.gain.setValueAtTime(vol, t + duration - 0.02)
    gain.gain.linearRampToValueAtTime(0, t + duration)

    source.connect(gain)
    gain.connect(this.ctx.destination)

    source.start(t)
    source.stop(t + duration + 0.1)
  }

  private findZone(note: number): TritonZone | null {
    return this.zones.find(z => note >= z.loNote && note <= z.hiNote) || this.zones[0] || null
  }
}
