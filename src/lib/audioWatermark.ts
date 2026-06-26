export interface WatermarkConfig {
  userId: string
  intervalSeconds: number
  gain: number
  frequency: number
}

export function applyAudioWatermark(
  ctx: OfflineAudioContext,
  destination: AudioNode,
  config: WatermarkConfig,
): void {
  const { userId, intervalSeconds = 30, gain = 0.05, frequency = 18000 } = config
  const totalDuration = ctx.length / ctx.sampleRate
  const intervals = Math.floor(totalDuration / intervalSeconds)

  const userBytes = new TextEncoder().encode(userId)
  for (let i = 0; i < intervals; i++) {
    const startTime = i * intervalSeconds
    const byteIdx = i % userBytes.length
    const bit = (userBytes[byteIdx] >> (i % 8)) & 1
    const freq = frequency + (bit ? 50 : 0)

    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.setValueAtTime(freq, startTime)

    const env = ctx.createGain()
    env.gain.setValueAtTime(0, startTime)
    env.gain.linearRampToValueAtTime(gain, startTime + 0.01)
    env.gain.linearRampToValueAtTime(0, startTime + 0.1)

    osc.connect(env)
    env.connect(destination)

    osc.start(startTime)
    osc.stop(startTime + 0.1)
  }
}

export function extractWatermarkUserId(
  audioBuffer: AudioBuffer,
  intervalSeconds: number = 30,
): string | null {
  const sampleRate = audioBuffer.sampleRate
  const totalDuration = audioBuffer.length / sampleRate
  const intervals = Math.floor(totalDuration / intervalSeconds)
  if (intervals === 0) return null

  const data = audioBuffer.getChannelData(0)
  const bits: number[] = []

  for (let i = 0; i < intervals; i++) {
    const startSample = Math.floor(i * intervalSeconds * sampleRate)
    const endSample = startSample + Math.floor(0.1 * sampleRate)
    let energy = 0
    for (let s = startSample; s < endSample && s < data.length; s++) {
      energy += Math.abs(data[s])
    }
    energy /= (endSample - startSample)
    bits.push(energy > 0.001 ? 1 : 0)
  }

  const bytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let b = 0; b < 8 && i + b < bits.length; b++) {
      byte |= (bits[i + b] << b)
    }
    bytes.push(byte)
  }

  try {
    const decoded = new TextDecoder().decode(new Uint8Array(bytes))
    const match = decoded.match(/[a-f0-9-]{8,}/i)
    return match ? match[0] : null
  } catch {
    return null
  }
}