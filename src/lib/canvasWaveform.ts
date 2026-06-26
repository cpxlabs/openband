export interface WaveformRenderOptions {
  canvas: HTMLCanvasElement
  audioBuffer: AudioBuffer
  color: string
  width: number
  height: number
  scrollOffset: number
  visibleWidth: number
  samplesPerPixel: number
}

export function renderWaveformCanvas(opts: WaveformRenderOptions): void {
  const { canvas, audioBuffer, color, height, scrollOffset, visibleWidth, samplesPerPixel } = opts
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  canvas.width = visibleWidth
  canvas.height = height

  ctx.fillStyle = "#18181c"
  ctx.fillRect(0, 0, visibleWidth, height)

  const data = audioBuffer.getChannelData(0)
  const startSample = Math.floor(scrollOffset * samplesPerPixel)

  ctx.fillStyle = color
  const mid = height / 2

  for (let x = 0; x < visibleWidth; x++) {
    const sampleStart = startSample + Math.floor(x * samplesPerPixel)
    const sampleEnd = Math.min(data.length, sampleStart + Math.floor(samplesPerPixel))
    let min = 1, max = -1

    for (let i = sampleStart; i < sampleEnd; i++) {
      const v = data[i]
      if (v < min) min = v
      if (v > max) max = v
    }

    const barHeight = Math.max(2, (max - min) * mid * 0.9)
    ctx.fillRect(x, mid - barHeight / 2, 1, barHeight)
  }
}

export interface VirtualScrollState {
  scrollTop: number
  viewportHeight: number
  totalHeight: number
  itemHeight: number
}

export function getVisibleRange(state: VirtualScrollState): { start: number; end: number } {
  const start = Math.max(0, Math.floor(state.scrollTop / state.itemHeight) - 1)
  const visibleCount = Math.ceil(state.viewportHeight / state.itemHeight) + 2
  const end = Math.min(start + visibleCount, Math.floor(state.totalHeight / state.itemHeight))
  return { start, end }
}

export function generatePeakData(audioBuffer: AudioBuffer, peaksPerSecond: number = 50): number[] {
  const data = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const samplesPerPeak = Math.floor(sampleRate / peaksPerSecond)
  const peaks: number[] = []

  for (let i = 0; i < data.length; i += samplesPerPeak) {
    let max = 0
    for (let j = i; j < Math.min(i + samplesPerPeak, data.length); j++) {
      const v = Math.abs(data[j])
      if (v > max) max = v
    }
    peaks.push(max)
  }

  return peaks
}