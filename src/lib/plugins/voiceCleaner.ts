import type { Plugin } from "../types";

export interface VoiceCleanerParams {
  threshold: number;
  highpass: number;
  reduction: number;
  mix: number;
}

export const VOICE_CLEANER_DEFAULTS: VoiceCleanerParams = {
  threshold: -40,
  highpass: 80,
  reduction: 40,
  mix: 100,
};

export function createVoiceCleaner(
  params: Partial<VoiceCleanerParams> = {},
): Plugin {
  return {
    id: `voiceCleaner-${Date.now()}`,
    name: "Voice Cleaner",
    type: "voiceCleaner",
    enabled: true,
    params: {
      threshold: params.threshold ?? VOICE_CLEANER_DEFAULTS.threshold,
      highpass: params.highpass ?? VOICE_CLEANER_DEFAULTS.highpass,
      reduction: params.reduction ?? VOICE_CLEANER_DEFAULTS.reduction,
      mix: params.mix ?? VOICE_CLEANER_DEFAULTS.mix,
    },
    color: "#30d158",
  };
}

export function applyVoiceCleanerGraph(
  ctx: OfflineAudioContext,
  source: AudioBufferSourceNode,
  p: Record<string, number>,
  sampleRate: number,
  len: number,
): void {
  const threshold = p.threshold ?? -40;
  const highpass = p.highpass ?? 80;
  const reduction = p.reduction ?? 40;
  const mix = p.mix ?? 100;

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = Math.max(20, highpass);

  const threshLin = Math.pow(10, threshold / 20);
  const reductionLin = Math.pow(10, -(reduction / 100) * 80 / 20);

  const ref = source.buffer ? source.buffer.getChannelData(0) : new Float32Array(len);
  const block = 256;
  const attackCoef = Math.max(0.001, 1 / Math.max(1, (5 / 1000) * sampleRate / block));
  const releaseCoef = Math.max(0.001, 1 / Math.max(1, (100 / 1000) * sampleRate / block));
  const gate = ctx.createGain();
  let g = 1;
  for (let b = 0; b < len; b += block) {
    let peak = 0;
    for (let i = b; i < Math.min(b + block, len); i++) {
      peak = Math.max(peak, Math.abs(ref[i]));
    }
    const open = peak > threshLin;
    const target = open ? 1 : reductionLin;
    const coef = open ? attackCoef : releaseCoef;
    g = g + (target - g) * coef;
    gate.gain.setValueAtTime(g, b / sampleRate);
  }

  if (mix < 100) {
    const wetGain = ctx.createGain();
    wetGain.gain.value = mix / 100;
    const dryGain = ctx.createGain();
    dryGain.gain.value = 1 - mix / 100;
    source.connect(dryGain);
    dryGain.connect(ctx.destination);
    source.connect(hp);
    hp.connect(gate);
    gate.connect(wetGain);
    wetGain.connect(ctx.destination);
  } else {
    source.connect(hp);
    hp.connect(gate);
    gate.connect(ctx.destination);
  }
}

export type SampleArray = Float32Array | number[];

export function measureRMS(samples: SampleArray): number {
  const n = samples.length;
  if (n === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    sumSq += s * s;
  }
  const rms = Math.sqrt(sumSq / n);
  return Math.max(0, Math.min(1, rms));
}

export function measureSNR(cleanRef: SampleArray, processed: SampleArray): number {
  const n = Math.min(cleanRef.length, processed.length);
  if (n === 0) return 0;
  let signalPower = 0;
  let noisePower = 0;
  for (let i = 0; i < n; i++) {
    const c = cleanRef[i];
    const p = processed[i];
    signalPower += c * c;
    const diff = c - p;
    noisePower += diff * diff;
  }
  if (signalPower <= 1e-12) return 0;
  if (noisePower <= 1e-12) return Infinity;
  return 10 * Math.log10(signalPower / noisePower);
}
