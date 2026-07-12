export interface LufsResult {
  integrated: number;
  shortTerm: number;
  truePeak: number;
  lra: number;
}

const ABSOLUTE_GATE_LUFS = -70;
const RELATIVE_GATE_DELTA = 10;
const BS1770_OFFSET = -0.691;

interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

function rbjHighShelf(f0: number, sampleRate: number, gainDb: number, q: number): Biquad {
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * f0) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const cw = Math.cos(w0);
  const b0 = A * ((A + 1) + (A - 1) * cw + 2 * Math.sqrt(A) * alpha);
  const b1 = -2 * A * ((A - 1) + (A + 1) * cw);
  const b2 = A * ((A + 1) + (A - 1) * cw - 2 * Math.sqrt(A) * alpha);
  const a0 = (A + 1) - (A - 1) * cw + 2 * Math.sqrt(A) * alpha;
  const a1 = 2 * ((A - 1) - (A + 1) * cw);
  const a2 = (A + 1) - (A - 1) * cw - 2 * Math.sqrt(A) * alpha;
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function rbjHighPass(f0: number, sampleRate: number, q: number): Biquad {
  const w0 = (2 * Math.PI * f0) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const cw = Math.cos(w0);
  const num = (1 + cw) / 2;
  const b0 = num;
  const b1 = -2 * num;
  const b2 = num;
  const a0 = 1 + alpha;
  const a1 = -2 * cw;
  const a2 = 1 - alpha;
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function stage1Coeffs(sampleRate: number): Biquad {
  return rbjHighShelf(1500, sampleRate, 4, 0.707);
}

function stage2Coeffs(sampleRate: number): Biquad {
  return rbjHighPass(38, sampleRate, 0.5);
}

function applyBiquad(x: Float32Array, coeffs: Biquad): Float32Array {
  const { b0, b1, b2, a1, a2 } = coeffs;
  const y = new Float32Array(x.length);
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = b0 * xi + z1;
    z1 = b1 * xi - a1 * yi + z2;
    z2 = b2 * xi - a2 * yi;
    y[i] = yi;
  }
  return y;
}

export function kWeight(samples: Float32Array, sampleRate: number): Float32Array {
  const s1 = stage1Coeffs(sampleRate);
  const s2 = stage2Coeffs(sampleRate);
  const stage1 = applyBiquad(samples, s1);
  return applyBiquad(stage1, s2);
}

function blockMeanSquares(
  samples: Float32Array,
  sampleRate: number,
  blockSec: number,
): number[] {
  const blockLen = Math.max(1, Math.floor(sampleRate * blockSec));
  const out: number[] = [];
  for (let i = 0; i < samples.length; i += blockLen) {
    const end = Math.min(samples.length, i + blockLen);
    let sum = 0;
    for (let j = i; j < end; j++) {
      const v = samples[j];
      sum += v * v;
    }
    out.push(sum / (end - i));
  }
  return out;
}

function loudnessFromEnergy(energy: number): number {
  return BS1770_OFFSET + 10 * Math.log10(energy);
}

function gatedLoudness(blocks: number[]): number {
  const absolute = blocks.filter(
    (z) => z > 0 && loudnessFromEnergy(z) > ABSOLUTE_GATE_LUFS,
  );
  if (absolute.length === 0) return ABSOLUTE_GATE_LUFS;

  let remaining = absolute;
  for (let iter = 0; iter < 4; iter++) {
    const mean = remaining.reduce((a, b) => a + b, 0) / remaining.length;
    if (mean <= 0) break;
    const relativeThreshold = loudnessFromEnergy(mean) - RELATIVE_GATE_DELTA;
    const next = remaining.filter((z) => loudnessFromEnergy(z) > relativeThreshold);
    if (next.length === 0 || next.length === remaining.length) break;
    remaining = next;
  }

  const finalMean = remaining.reduce((a, b) => a + b, 0) / remaining.length;
  return loudnessFromEnergy(finalMean);
}

export function truePeak(samples: Float32Array, _sampleRate: number): number {
  const n = samples.length;
  if (n === 0) return -Infinity;

  let maxAbs = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(samples[i]);
    if (a > maxAbs) maxAbs = a;
  }

  const factor = 4;
  const upLen = (n - 1) * factor;
  for (let i = 0; i < upLen; i++) {
    const pos = i / factor;
    const i0 = Math.floor(pos);
    const i1 = Math.min(n - 1, i0 + 1);
    const frac = pos - i0;
    const val = samples[i0] * (1 - frac) + samples[i1] * frac;
    const a = Math.abs(val);
    if (a > maxAbs) maxAbs = a;
  }

  if (maxAbs <= 0) return -Infinity;
  return 20 * Math.log10(maxAbs);
}

function computeLra(blocks: number[]): number {
  const loudnesses = blocks
    .filter((z) => z > 0)
    .map(loudnessFromEnergy);
  if (loudnesses.length < 2) return 0;
  const max = Math.max(...loudnesses);
  const min = Math.min(...loudnesses);
  return Math.max(0, max - min);
}

export function measureLUFS(
  samples: Float32Array | Float32Array[],
  sampleRate: number,
): LufsResult {
  const channels = Array.isArray(samples) ? samples : [samples];
  const filtered = channels.map((ch) => kWeight(ch, sampleRate));

  const blocksPerChannel = filtered.map((ch) =>
    blockMeanSquares(ch, sampleRate, 0.4),
  );
  const numBlocks = blocksPerChannel.reduce(
    (max, b) => Math.max(max, b.length),
    0,
  );

  const combinedIntegrated: number[] = [];
  for (let b = 0; b < numBlocks; b++) {
    let sum = 0;
    let count = 0;
    for (let ch = 0; ch < channels.length; ch++) {
      const v = blocksPerChannel[ch][b];
      if (v !== undefined) {
        sum += v;
        count++;
      }
    }
    combinedIntegrated.push(count > 0 ? sum / count : 0);
  }

  const blocksIn3s = Math.max(1, Math.ceil(3 / 0.4));
  const shortBlocks = combinedIntegrated.slice(-blocksIn3s);

  const integrated = gatedLoudness(combinedIntegrated);
  const shortTerm = gatedLoudness(
    shortBlocks.length ? shortBlocks : combinedIntegrated,
  );
  const lra = computeLra(
    shortBlocks.length ? shortBlocks : combinedIntegrated,
  );
  const peak = channels.map((ch) => truePeak(ch, sampleRate));
  const truePeakValue = peak.length ? Math.max(...peak) : -Infinity;

  return {
    integrated,
    shortTerm,
    truePeak: truePeakValue,
    lra,
  };
}
