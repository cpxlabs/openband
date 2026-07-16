import { Platform } from "react-native";
import { djb2Hash, audioBufferToWavBlob, writeWavHeader } from "./audio";

export const DEMO_AUDIO_URL =
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

export const SCREEN_BOTTOM_PADDING = 100;

const MAX_CACHE_SIZE = 50;
const previewUrlCache = new Map<string, string>();

const MAX_PREVIEW_DURATION = 3;

export async function generatePreviewUrl(
  key: string,
  duration: number = 4,
): Promise<string> {
  const cached = previewUrlCache.get(key);
  if (cached) return cached;
  duration = Math.min(duration, MAX_PREVIEW_DURATION);
  const sr = 44100;
  const h = djb2Hash(key);
  const freq = 110 + Math.abs(h % 880);
  const types: OscillatorType[] = ["sine", "triangle", "sawtooth", "square"];

  let url: string;
  if (Platform.OS === "web" && typeof OfflineAudioContext !== "undefined") {
    const ctx = new OfflineAudioContext(1, Math.ceil(sr * duration), sr);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = types[Math.abs(h) % 4];
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, 0);
    gain.gain.linearRampToValueAtTime(0.25, 0.01);
    gain.gain.linearRampToValueAtTime(0, duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
    osc.stop(duration);
    const buf = await ctx.startRendering();
    const blob = audioBufferToWavBlob(buf, 16);
    url = URL.createObjectURL(blob);
  } else {
    const numSamples = Math.ceil(sr * duration);
    const bitDepth = 16;
    const numChannels = 1;
    const bytesPerSample = bitDepth / 8;
    const dataSize = numSamples * numChannels * bytesPerSample;
    const headerSize = 44;
    const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(arrayBuffer);
    writeWavHeader(view, 0, numChannels, sr, bitDepth, dataSize);
    const oscType = Math.abs(h) % 4;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sr;
      const phase = (t * freq * 2 * Math.PI) % (2 * Math.PI);
      let wave: number;
      if (oscType === 0) {
        wave = Math.sin(phase);
      } else if (oscType === 1) {
        wave = 2 * Math.abs(2 * (phase / (2 * Math.PI)) - 1) - 1;
      } else if (oscType === 2) {
        wave = 2 * (phase / (2 * Math.PI)) - 1;
      } else {
        wave = phase < Math.PI ? 1 : -1;
      }
      const envelope = Math.max(0, 0.25 * (1 - t / duration));
      const sample = wave * envelope;
      const pcm = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
      view.setInt16(headerSize + i * bytesPerSample, pcm, true);
    }
    const blob = new Blob([arrayBuffer], { type: "audio/wav" });
    url = URL.createObjectURL(blob);
  }

  if (previewUrlCache.size >= MAX_CACHE_SIZE) {
    const firstKey = previewUrlCache.keys().next().value;
    if (firstKey !== undefined) {
      const oldUrl = previewUrlCache.get(firstKey);
      if (oldUrl !== undefined) {
        URL.revokeObjectURL(oldUrl);
        previewUrlCache.delete(firstKey);
      }
    }
  }
  previewUrlCache.set(key, url);
  return url;
}

export function getCachedPreview(key: string): string | undefined {
  return previewUrlCache.get(key);
}

export async function preloadPreview(key: string, duration: number = 4): Promise<string> {
  return generatePreviewUrl(key, duration);
}
