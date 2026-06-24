export const DEMO_AUDIO_URL =
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

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
  const blob = audioBufferToPreviewBlob(buf);
  const url = URL.createObjectURL(blob);
  previewUrlCache.set(key, url);
  return url;
}

function audioBufferToPreviewBlob(buffer: AudioBuffer): Blob {
  const nc = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const ns = buffer.length;
  const bps = 2;
  const ba = nc * bps;
  const ds = ns * ba;
  const ab = new ArrayBuffer(44 + ds);
  const v = new DataView(ab);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  v.setUint32(4, 36 + ds, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, nc, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * ba, true);
  v.setUint16(32, ba, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, ds, true);
  for (let i = 0; i < ns; i++) {
    for (let ch = 0; ch < nc; ch++) {
      v.setInt16(
        44 + (i * nc + ch) * bps,
        Math.max(
          -32768,
          Math.min(32767, Math.round(buffer.getChannelData(ch)[i] * 32767)),
        ),
        true,
      );
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}
