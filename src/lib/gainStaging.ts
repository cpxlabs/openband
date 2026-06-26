export interface TrackGainInfo {
  name: string
  volume: number
  muted: boolean
  solo: boolean
  midiNotes?: { velocity: number }[]
}

export class GainStager {
  private headroomDb: number
  private ceilingDb: number

  constructor(headroomDb: number = -6, ceilingDb: number = -0.3) {
    this.headroomDb = headroomDb
    this.ceilingDb = ceilingDb
  }

  calculateMasterGain(tracks: TrackGainInfo[]): number {
    const anySolo = tracks.some(t => t.solo)
    const activeTracks = tracks.filter(t => !t.muted && (!anySolo || t.solo))
    if (activeTracks.length === 0) return 1

    let totalLinear = 0
    for (const track of activeTracks) {
      const volLinear = track.volume / 127
      const avgVelocity = track.midiNotes && track.midiNotes.length > 0
        ? track.midiNotes.reduce((s, n) => s + n.velocity, 0) / track.midiNotes.length / 127
        : 0.5
      totalLinear += volLinear * avgVelocity
    }

    const rmsLinear = Math.sqrt(totalLinear / activeTracks.length)
    const peakDb = 20 * Math.log10(rmsLinear)
    const peakHeadroom = peakDb + this.headroomDb
    const requiredReduction = Math.max(0, peakHeadroom - this.ceilingDb)
    const gainFactor = Math.pow(10, -requiredReduction / 20)

    return Math.min(1, Math.max(0.1, gainFactor))
  }

  applyDynamicGain(gainNode: GainNode, tracks: TrackGainInfo[], rampTime: number = 0.05): void {
    const targetGain = this.calculateMasterGain(tracks)
    const ctx = gainNode.context
    const now = ctx.currentTime
    gainNode.gain.cancelScheduledValues(now)
    gainNode.gain.setValueAtTime(gainNode.gain.value, now)
    gainNode.gain.linearRampToValueAtTime(targetGain, now + rampTime)
  }

  setHeadroom(db: number): void {
    this.headroomDb = db
  }

  setCeiling(db: number): void {
    this.ceilingDb = db
  }
}
