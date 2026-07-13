export function hzToNote(freq: number): { note: string; midi: number } {
  const NOTE_NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  const note = `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  return { note, midi };
}

export function estimatePitch(
  frame: Float32Array,
  sampleRate: number,
): number | null {
  const n = frame.length;
  if (n < 2) return null;

  let mean = 0;
  for (let i = 0; i < n; i++) mean += frame[i];
  mean /= n;

  let rms = 0;
  for (let i = 0; i < n; i++) {
    const d = frame[i] - mean;
    rms += d * d;
  }
  rms = Math.sqrt(rms / n);
  if (rms < 0.01) return null;

  const minLag = Math.max(2, Math.floor(sampleRate / 2000));
  const maxLag = Math.min(n - 1, Math.floor(sampleRate / 60));

  let bestLag = -1;
  let bestCorr = 0;

  const acf = new Float32Array(maxLag + 1);
  let norm0 = 0;
  for (let i = 0; i < n; i++) {
    const d = frame[i] - mean;
    norm0 += d * d;
  }
  if (norm0 <= 0) return null;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let norm = 0;
    for (let i = 0; i < n - lag; i++) {
      const a = frame[i] - mean;
      const b = frame[i + lag] - mean;
      corr += a * b;
      norm += b * b;
    }
    const value = norm > 0 ? corr / Math.sqrt(norm0 * norm) : 0;
    acf[lag] = value;
    if (value > bestCorr) {
      bestCorr = value;
      bestLag = lag;
    }
  }

  if (bestLag <= 0 || bestCorr < 0.3) return null;

  let peak = bestLag;
  if (bestLag > minLag && bestLag < maxLag) {
    const a = acf[bestLag - 1];
    const b = acf[bestLag];
    const c = acf[bestLag + 1];
    const denom = a - 2 * b + c;
    if (denom !== 0) {
      peak = bestLag + (0.5 * (a - c)) / denom;
    }
  }

  return sampleRate / peak;
}
