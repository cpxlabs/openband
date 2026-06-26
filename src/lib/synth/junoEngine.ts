export class JunoEngine {
  private ctx: AudioContext

  constructor(ctx: AudioContext) {
    this.ctx = ctx
  }

  playNote(frequency: number, duration: number, velocity: number = 0.7, time?: number) {
    const t = time ?? this.ctx.currentTime
    const vol = Math.max(0.01, velocity) * 0.4

    const oscSaw = this.ctx.createOscillator()
    oscSaw.type = "sawtooth"
    oscSaw.frequency.setValueAtTime(frequency, t)

    const oscSub = this.ctx.createOscillator()
    oscSub.type = "square"
    oscSub.frequency.setValueAtTime(frequency / 2, t)

    const subGain = this.ctx.createGain()
    subGain.gain.setValueAtTime(vol * 0.3, t)

    const vcf = this.ctx.createBiquadFilter()
    vcf.type = "lowpass"
    vcf.frequency.setValueAtTime(Math.min(frequency * 4, 8000), t)
    vcf.Q.setValueAtTime(2, t)
    vcf.frequency.exponentialRampToValueAtTime(Math.min(frequency * 0.5, 800), t + duration * 0.7)

    const dryGain = this.ctx.createGain()
    dryGain.gain.setValueAtTime(vol * 0.7, t)

    const delayNode = this.ctx.createDelay(0.05)
    delayNode.delayTime.setValueAtTime(0.015, t)

    const lfo = this.ctx.createOscillator()
    const lfoGain = this.ctx.createGain()
    lfo.type = "sine"
    lfo.frequency.setValueAtTime(1.5, t)
    lfoGain.gain.setValueAtTime(0.002, t)

    const wetGain = this.ctx.createGain()
    wetGain.gain.setValueAtTime(vol * 0.6, t)

    const ampEnv = this.ctx.createGain()
    ampEnv.gain.setValueAtTime(0, t)
    ampEnv.gain.linearRampToValueAtTime(vol, t + 0.01)
    ampEnv.gain.setValueAtTime(vol, t + duration - 0.05)
    ampEnv.gain.linearRampToValueAtTime(0, t + duration)

    oscSub.connect(subGain)
    subGain.connect(vcf)
    oscSaw.connect(vcf)

    vcf.connect(dryGain)
    dryGain.connect(ampEnv)

    vcf.connect(delayNode)
    lfo.connect(lfoGain)
    lfoGain.connect(delayNode.delayTime)
    delayNode.connect(wetGain)
    wetGain.connect(ampEnv)

    ampEnv.connect(this.ctx.destination)

    oscSaw.start(t)
    oscSub.start(t)
    lfo.start(t)
    oscSaw.stop(t + duration + 0.1)
    oscSub.stop(t + duration + 0.1)
    lfo.stop(t + duration + 0.1)
  }
}
