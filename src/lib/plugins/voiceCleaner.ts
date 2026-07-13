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
