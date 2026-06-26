import { Platform } from "react-native";
import { hashStr, audioBufferToWavBlob } from "./audio";

export const DEMO_AUDIO_URL =
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

const MAX_CACHE_SIZE = 50;
const previewUrlCache = new Map<string, string>();

export async function generatePreviewUrl(
  key: string,
  duration: number = 4,
): Promise<string> {
  const cached = previewUrlCache.get(key);
  if (cached) return cached;
  const sr = 44100;
  const h = hashStr(key);
  const freq = 110 + Math.abs(h % 880);
  const types: OscillatorType[] = ["sine", "triangle", "sawtooth", "square"];
  if (Platform.OS !== "web") return "";
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
  const url = URL.createObjectURL(blob);
  if (previewUrlCache.size >= MAX_CACHE_SIZE) {
    const firstKey = previewUrlCache.keys().next().value;
    if (firstKey !== undefined) {
      URL.revokeObjectURL(previewUrlCache.get(firstKey)!);
      previewUrlCache.delete(firstKey);
    }
  }
  previewUrlCache.set(key, url);
  return url;
}
