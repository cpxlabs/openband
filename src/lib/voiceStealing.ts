export interface VoiceEntry {
  id: string
  note: number
  startTime: number
  priority: number
  gainNode: GainNode
  oscillator: OscillatorNode
}

export class VoiceManager {
  private voices: VoiceEntry[] = []
  private maxVoices: number
  private ctx: AudioContext

  constructor(ctx: AudioContext, maxVoices: number = 16) {
    this.ctx = ctx
    this.maxVoices = maxVoices
  }

  allocate(oscillator: OscillatorNode, gainNode: GainNode, note: number, priority: number = 0): string {
    const id = `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const entry: VoiceEntry = { id, note, startTime: this.ctx.currentTime, priority, gainNode, oscillator }

    while (this.voices.length >= this.maxVoices) {
      this.stealOldest()
    }

    this.voices.push(entry)
    return id
  }

  release(id: string): void {
    const idx = this.voices.findIndex(v => v.id === id)
    if (idx === -1) return

    const voice = this.voices[idx]
    const now = this.ctx.currentTime

    try {
      voice.gainNode.gain.cancelScheduledValues(now)
      voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now)
      voice.gainNode.gain.linearRampToValueAtTime(0, now + 0.005)
    } catch {}

    this.voices.splice(idx, 1)
  }

  releaseAll(): void {
    const now = this.ctx.currentTime
    for (const voice of this.voices) {
      try {
        voice.gainNode.gain.cancelScheduledValues(now)
        voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now)
        voice.gainNode.gain.linearRampToValueAtTime(0, now + 0.005)
        voice.oscillator.stop(now + 0.01)
      } catch {}
    }
    this.voices = []
  }

  getVoiceCount(): number {
    return this.voices.length
  }

  setMaxVoices(max: number): void {
    this.maxVoices = Math.max(1, max)
  }

  private stealOldest(): void {
    if (this.voices.length === 0) return

    let oldestIdx = 0
    let oldestTime = Infinity

    for (let i = 0; i < this.voices.length; i++) {
      if (this.voices[i].startTime < oldestTime) {
        oldestTime = this.voices[i].startTime
        oldestIdx = i
      }
    }

    const voice = this.voices[oldestIdx]
    const now = this.ctx.currentTime

    try {
      voice.gainNode.gain.cancelScheduledValues(now)
      voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now)
      voice.gainNode.gain.linearRampToValueAtTime(0, now + 0.005)
      voice.oscillator.stop(now + 0.01)
    } catch {}

    this.voices.splice(oldestIdx, 1)
  }
}
