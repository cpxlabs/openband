let waveCache = new Map<string, number[]>();

export function generateWaveform(seed: string, count: number): number[] {
  const key = `${seed}-${count}`;
  if (waveCache.has(key)) return waveCache.get(key)!;
  const data: number[] = [];
  let h = hashStr(seed);
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const t = i / count;
    const envelope = Math.sin(t * Math.PI) * 0.9 + 0.1;
    const shape = Math.sin(i * 0.5) * 0.4 + Math.sin(i * 1.3) * 0.3 + Math.sin(i * 3.7) * 0.2;
    const noise = ((h & 0xff) / 255) * 2 - 1;
    data.push(Math.max(-1, Math.min(1, (shape * 0.6 + noise * 0.4) * envelope)));
  }
  waveCache.set(key, data);
  return data;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function clearWaveCache() {
  waveCache = new Map();
}
