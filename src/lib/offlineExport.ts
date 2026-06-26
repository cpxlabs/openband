import { Platform } from "react-native"
import type { TrackDef } from "./types"
import type { Mood } from "./projectTemplates"
import { MOODS } from "./projectTemplates"

const NOTE_FREQS: number[] = []
for (let i = 0; i < 128; i++) NOTE_FREQS[i] = 440 * Math.pow(2, (i - 69) / 12)

export interface ExportOptions {
  bpm: number
  sampleRate?: number
  bitDepth?: 16 | 24 | 32
  format?: "wav"
  normalize?: boolean
  mood?: Mood
  onProgress?: (percent: number) => void
}

export async function exportToWav(
  tracks: TrackDef[],
  options: ExportOptions,
): Promise<Blob | null> {
  if (Platform.OS !== "web" || typeof OfflineAudioContext === "undefined") return null

  const { bpm, sampleRate = 44100, mood } = options
  const safeBpm = Math.max(1, bpm)
  const beatDuration = 60 / safeBpm
  const moodPreset = mood ? MOODS.find(m => m.id === mood) : undefined

  let totalBeats = 0
  for (const track of tracks) {
    if (track.midiNotes) {
      for (const note of track.midiNotes) {
        const end = note.start + note.duration
        if (end > totalBeats) totalBeats = end
      }
    }
  }
  if (totalBeats === 0) return null

  const duration = totalBeats * beatDuration + 3
  const numSamples = Math.ceil(sampleRate * duration)
  const anySolo = tracks.some(t => t.solo)
  const activeTracks = tracks.filter(t => !t.muted && (!anySolo || t.solo) && t.midiNotes?.length)
  if (activeTracks.length === 0) return null

  try {
    const ctx = new OfflineAudioContext(2, numSamples, sampleRate)
    let processedCount = 0

    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.9

    let masterOut: AudioNode = masterGain

    if (moodPreset?.filter) {
      const masterFilter = ctx.createBiquadFilter()
      masterFilter.type = moodPreset.filter.type
      masterFilter.frequency.value = moodPreset.filter.freq
      masterFilter.Q.value = moodPreset.filter.q
      masterGain.connect(masterFilter)
      masterOut = masterFilter
    }

    if (moodPreset?.reverb && moodPreset.reverb.mix > 0) {
      const dryGain = ctx.createGain()
      dryGain.gain.value = 1 - moodPreset.reverb.mix
      const wetGain = ctx.createGain()
      wetGain.gain.value = moodPreset.reverb.mix
      const convolver = ctx.createConvolver()
      convolver.buffer = createReverbBuffer(ctx, moodPreset.reverb.decay)

      masterOut.connect(dryGain)
      masterOut.connect(convolver)
      convolver.connect(wetGain)

      const merger = ctx.createGain()
      dryGain.connect(merger)
      wetGain.connect(merger)
      masterOut = merger
    }

    masterOut.connect(ctx.destination)

    for (const track of tracks) {
      if (track.muted || (anySolo && !track.solo)) continue
      if (!track.midiNotes || track.midiNotes.length === 0) continue

      const trackGain = ctx.createGain()
      trackGain.gain.value = (track.volume ?? 80) / 127

      const panNode = ctx.createStereoPanner()
      panNode.pan.value = (track.pan ?? 0) / 100
      panNode.connect(trackGain)
      trackGain.connect(masterGain)

      for (const note of track.midiNotes) {
        const freq = NOTE_FREQS[note.pitch] || 440
        const noteStart = note.start * beatDuration
        const noteDur = note.duration * beatDuration
        const vol = Math.max(0.01, note.velocity / 127) * 0.3

        const isDrum = track.name.toLowerCase().includes("bateria") ||
          track.name.toLowerCase().includes("drums") ||
          track.name.toLowerCase().includes("percussão") ||
          track.name.toLowerCase().includes("percussion")

        if (isDrum) {
          const drumNode = createDrumNode(ctx, note.pitch, noteStart, vol)
          drumNode.connect(panNode)
        } else {
          const osc = ctx.createOscillator()
          osc.type = getTrackWaveform(track.name)

          if (osc.type === "sawtooth" && track.name.toLowerCase().includes("bass")) {
            const filter = ctx.createBiquadFilter()
            filter.type = "lowpass"
            filter.frequency.value = 400
            osc.connect(filter)
            filter.connect(trackGain)
          }

          osc.frequency.setValueAtTime(freq, noteStart)

          const noteGain = ctx.createGain()
          noteGain.gain.setValueAtTime(0, noteStart)
          noteGain.gain.linearRampToValueAtTime(vol, noteStart + 0.005)
          noteGain.gain.setValueAtTime(vol * 0.8, noteStart + noteDur * 0.7)
          noteGain.gain.linearRampToValueAtTime(0, noteStart + noteDur)

          osc.connect(noteGain)
          noteGain.connect(panNode)

          osc.start(noteStart)
          osc.stop(noteStart + noteDur + 0.05)
        }
      }

      processedCount++
      options.onProgress?.(Math.round((processedCount / activeTracks.length) * 100))
    }

    const buffer = await ctx.startRendering()
    const blob = audioBufferToWavBlob(buffer, options.bitDepth ?? 16)

    if (options.normalize) {
      return normalizeAudioBlob(blob)
    }

    return blob
  } catch (e) {
    console.error("Offline export failed:", e)
    return null
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function exportAndDownload(
  tracks: TrackDef[],
  options: ExportOptions,
  filename: string = "openband_export.wav",
): Promise<boolean> {
  const blob = await exportToWav(tracks, options)
  if (!blob) return false
  downloadBlob(blob, filename)
  return true
}

function getTrackWaveform(trackName: string): OscillatorType {
  const l = trackName.toLowerCase()
  if (l.includes("bass") || l.includes("baixo") || l.includes("808")) return "sawtooth"
  if (l.includes("guitar") || l.includes("violão")) return "triangle"
  if (l.includes("piano") || l.includes("keys")) return "triangle"
  if (l.includes("pad")) return "sine"
  if (l.includes("synth") || l.includes("lead")) return "sawtooth"
  if (l.includes("sax") || l.includes("organ")) return "sawtooth"
  return "sawtooth"
}

function createDrumNode(ctx: OfflineAudioContext, pitch: number, startTime: number, vol: number): AudioNode {
  const output = ctx.createGain()

  if (pitch === 36 || pitch === 35) {
    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.setValueAtTime(150, startTime)
    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.05)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol * 0.8, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3)
    osc.connect(gain)
    gain.connect(output)
    osc.start(startTime)
    osc.stop(startTime + 0.3)
  } else if (pitch === 38 || pitch === 40) {
    const noise = createNoiseBuffer(ctx, 0.15)
    const noiseSrc = ctx.createBufferSource()
    noiseSrc.buffer = noise
    const bp = ctx.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.value = 1000
    bp.Q.value = 0.5
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol * 0.6, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15)
    noiseSrc.connect(bp)
    bp.connect(gain)
    gain.connect(output)
    noiseSrc.start(startTime)
    noiseSrc.stop(startTime + 0.15)
  } else {
    const noise = createNoiseBuffer(ctx, 0.08)
    const noiseSrc = ctx.createBufferSource()
    noiseSrc.buffer = noise
    const hp = ctx.createBiquadFilter()
    hp.type = "highpass"
    hp.frequency.value = 7000
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol * 0.4, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08)
    noiseSrc.connect(hp)
    hp.connect(gain)
    gain.connect(output)
    noiseSrc.start(startTime)
    noiseSrc.stop(startTime + 0.08)
  }

  return output
}

function createNoiseBuffer(ctx: OfflineAudioContext, duration: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

function createReverbBuffer(ctx: OfflineAudioContext, decay: number): AudioBuffer {
  const sr = ctx.sampleRate
  const length = Math.ceil(sr * decay)
  const buffer = ctx.createBuffer(2, length, sr)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * decay * 0.3))
    }
  }
  return buffer
}

function audioBufferToWavBlob(buffer: AudioBuffer, bitDepth: 16 | 24 | 32 = 16): Blob {
  const nc = buffer.numberOfChannels
  const sr = buffer.sampleRate
  const ns = buffer.length
  const bytesPerSample = bitDepth / 8
  const ba = nc * bytesPerSample
  const ds = ns * ba
  const ab = new ArrayBuffer(44 + ds)
  const v = new DataView(ab)
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  w(0, "RIFF")
  v.setUint32(4, 36 + ds, true)
  w(8, "WAVE")
  w(12, "fmt ")
  v.setUint32(16, 16, true)
  v.setUint16(20, bitDepth === 32 ? 3 : 1, true)
  v.setUint16(22, nc, true)
  v.setUint32(24, sr, true)
  v.setUint32(28, sr * ba, true)
  v.setUint16(32, ba, true)
  v.setUint16(34, bitDepth, true)
  w(36, "data")
  v.setUint32(40, ds, true)
  for (let i = 0; i < ns; i++) {
    for (let ch = 0; ch < nc; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
      const offset = 44 + (i * nc + ch) * bytesPerSample
      if (bitDepth === 16) {
        v.setInt16(offset, Math.round(sample * 32767), true)
      } else if (bitDepth === 24) {
        const val = Math.round(sample * 8388607)
        v.setUint8(offset, val & 0xff)
        v.setUint8(offset + 1, (val >> 8) & 0xff)
        v.setUint8(offset + 2, (val >> 16) & 0xff)
      } else {
        v.setFloat32(offset, sample, true)
      }
    }
  }
  return new Blob([ab], { type: "audio/wav" })
}

function normalizeAudioBlob(_blob: Blob): Promise<Blob> {
  return Promise.resolve(_blob)
}
