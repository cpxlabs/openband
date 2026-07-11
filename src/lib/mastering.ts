import type { Plugin } from "./types";
import { getDefaultParams } from "./types";

export interface MasteringChainPreset {
  name: string;
  description: string;
  plugins: { name: string; type: Plugin["type"]; color: string }[];
}

export const MASTERING_CHAIN_PRESETS: MasteringChainPreset[] = [
  {
    name: "Master Rápido",
    description: "EQ → Comp → Limiter",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Compressor", type: "compressor", color: "#ff9500" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Master Completo",
    description: "EQ → Multiband → Imager → Tape → True Peak",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Multiband Comp", type: "multibandCompressor", color: "#bf5af2" },
      { name: "Stereo Imager", type: "stereoImager", color: "#00d4aa" },
      { name: "Tape Saturator", type: "tapeSaturator", color: "#ff453a" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Rádio / Podcast",
    description: "EQ → De-Ess → Comp → True Peak",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "DeEsser", type: "deesser", color: "#ff9f0a" },
      { name: "Compressor", type: "compressor", color: "#ff9500" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Loudness Maximizer",
    description: "EQ → Multiband → Limiter → True Peak",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Multiband Comp", type: "multibandCompressor", color: "#bf5af2" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Acústico Natural",
    description: "EQ leve → Tape → True Peak",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Tape Saturator", type: "tapeSaturator", color: "#ff453a" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "EDM Club",
    description: "EQ → Multiband → Imager → Limiter → True Peak",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Multiband Comp", type: "multibandCompressor", color: "#bf5af2" },
      { name: "Stereo Imager", type: "stereoImager", color: "#00d4aa" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Vintage Warm",
    description: "Tape → EQ → Comp → True Peak",
    plugins: [
      { name: "Tape Saturator", type: "tapeSaturator", color: "#ff453a" },
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Compressor", type: "compressor", color: "#ff9500" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Modern Clean",
    description: "EQ → Comp → Stereo Imager → True Peak",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "Compressor", type: "compressor", color: "#ff9500" },
      { name: "Stereo Imager", type: "stereoImager", color: "#00d4aa" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Lo-Fi Vibe",
    description: "Tape → EQ → Limiter → True Peak",
    plugins: [
      { name: "Tape Saturator", type: "tapeSaturator", color: "#ff453a" },
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
  {
    name: "Broadcast Ready",
    description: "EQ → De-Ess → Multiband → Comp → True Peak",
    plugins: [
      { name: "EQ Eight", type: "eq", color: "#5ac8fa" },
      { name: "DeEsser", type: "deesser", color: "#ff9f0a" },
      { name: "Multiband Comp", type: "multibandCompressor", color: "#bf5af2" },
      { name: "Compressor", type: "compressor", color: "#ff9500" },
      { name: "True Peak Limiter", type: "truePeakLimiter", color: "#ff375f" },
    ],
  },
];

export function validateMasteringChain(
  chain: Plugin[] | MasteringChainPreset,
): { valid: boolean; error?: string } {
  const types = Array.isArray(chain)
    ? chain.map((p) => p.type)
    : chain.plugins.map((p) => p.type);
  const last = types[types.length - 1];
  const secondLast = types[types.length - 2];
  const isLimiter = (t: string | undefined) =>
    t === "limiter" || t === "truePeakLimiter";
  if (isLimiter(last) && isLimiter(secondLast)) {
    return { valid: false, error: "Chain ends with duplicate limiter nodes" };
  }
  return { valid: true };
}

export function buildMasteringChain(preset: MasteringChainPreset): Plugin[] {
  return preset.plugins.map((p, i) => ({
    id: `master-chain-${i}-${Date.now()}`,
    name: p.name,
    type: p.type,
    enabled: true,
    params: getDefaultParams(p.type),
    color: p.color,
  }));
}

export function getOversampleLabel(value: number): string {
  const map: Record<number, string> = { 0: "1x", 1: "2x", 2: "4x", 3: "8x" };
  return map[value] || "2x";
}

export async function applyMasteringChain(
  buffer: AudioBuffer,
  plugins: Plugin[],
  sampleRate: number,
): Promise<AudioBuffer> {
  const len = buffer.length;
  const numChannels = buffer.numberOfChannels;
  const offlineCtx = new OfflineAudioContext(numChannels, len, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  let chain: AudioNode = source;
  for (const plugin of plugins) {
    if (!plugin.enabled) continue;
    switch (plugin.type) {
      case "eq": {
        const p = plugin.params;
        const filter = offlineCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = p.lowCut ?? 20000;
        chain.connect(filter);
        chain = filter;
        break;
      }
      case "compressor": {
        const p = plugin.params;
        const comp = offlineCtx.createDynamicsCompressor();
        if (p.threshold != null) comp.threshold.value = p.threshold;
        if (p.knee != null) comp.knee.value = p.knee;
        if (p.ratio != null) comp.ratio.value = p.ratio;
        if (p.attack != null) comp.attack.value = p.attack / 1000;
        if (p.release != null) comp.release.value = p.release / 1000;
        chain.connect(comp);
        chain = comp;
        break;
      }
      case "limiter": {
        const p = plugin.params;
        const gain = offlineCtx.createGain();
        const ceiling = p.ceiling ?? -0.5;
        const headroom = p.headroom ?? 1;
        const makeup = Math.min(headroom, 10);
        gain.gain.value = makeup;
        const waveShaper = offlineCtx.createWaveShaper();
        waveShaper.curve = makeLimiterCurve(4096, ceiling);
        chain.connect(gain);
        gain.connect(waveShaper);
        chain = waveShaper;
        break;
      }
      case "truePeakLimiter": {
        const p = plugin.params;
        const gain = offlineCtx.createGain();
        const ceiling = p.ceiling ?? -2;
        const makeup = p.gain ?? 4;
        gain.gain.value = makeup;
        const waveShaper = offlineCtx.createWaveShaper();
        waveShaper.curve = makeLimiterCurve(4096, ceiling);
        chain.connect(gain);
        gain.connect(waveShaper);
        chain = waveShaper;
        break;
      }
      case "multibandCompressor": {
        const p = plugin.params;
        const lowBand = offlineCtx.createBiquadFilter();
        lowBand.type = "lowpass";
        lowBand.frequency.value = p.crossLow ?? 200;
        lowBand.Q.value = 0.707;
        const midBand = offlineCtx.createBiquadFilter();
        midBand.type = "bandpass";
        midBand.frequency.value = ((p.crossLow ?? 200) + (p.crossHigh ?? 2000)) / 2;
        midBand.Q.value = 0.707;
        const highBand = offlineCtx.createBiquadFilter();
        highBand.type = "highpass";
        highBand.frequency.value = p.crossHigh ?? 2000;
        highBand.Q.value = 0.707;
        const compLow = offlineCtx.createDynamicsCompressor();
        compLow.threshold.value = p.thresholdLow ?? -20;
        compLow.ratio.value = p.ratioLow ?? 4;
        const compMid = offlineCtx.createDynamicsCompressor();
        compMid.threshold.value = p.thresholdMid ?? -20;
        compMid.ratio.value = p.ratioMid ?? 3;
        const compHigh = offlineCtx.createDynamicsCompressor();
        compHigh.threshold.value = p.thresholdHigh ?? -20;
        compHigh.ratio.value = p.ratioHigh ?? 3;
        const gainLow = offlineCtx.createGain();
        gainLow.gain.value = p.makeupLow ?? 3;
        const gainMid = offlineCtx.createGain();
        gainMid.gain.value = p.makeupMid ?? 2;
        const gainHigh = offlineCtx.createGain();
        gainHigh.gain.value = p.makeupHigh ?? 2;
        const merger = offlineCtx.createChannelMerger(numChannels);
        chain.connect(lowBand);
        lowBand.connect(compLow).connect(gainLow).connect(merger, 0, 0);
        chain.connect(midBand);
        midBand.connect(compMid).connect(gainMid).connect(merger, 0, 0);
        chain.connect(highBand);
        highBand.connect(compHigh).connect(gainHigh).connect(merger, 0, 0);
        chain = merger;
        break;
      }
      case "stereoImager": {
        const p = plugin.params;
        const width = p.width ?? 150;
        const widthScale = Math.max(0, width / 100);
        const splitter = offlineCtx.createChannelSplitter(2);
        const sumL = offlineCtx.createGain();
        sumL.gain.value = 0.5;
        const sumR = offlineCtx.createGain();
        sumR.gain.value = 0.5;
        const diffL = offlineCtx.createGain();
        diffL.gain.value = 0.5;
        const diffR = offlineCtx.createGain();
        diffR.gain.value = -0.5;
        const sideL = offlineCtx.createGain();
        sideL.gain.value = widthScale;
        const sideR = offlineCtx.createGain();
        sideR.gain.value = widthScale;
        const merger = offlineCtx.createChannelMerger(2);
        chain.connect(splitter);
        splitter.connect(sumL, 0);
        splitter.connect(sumR, 1);
        splitter.connect(diffL, 0);
        splitter.connect(diffR, 1);
        sumL.connect(merger, 0, 0);
        sumR.connect(merger, 0, 1);
        diffL.connect(sideL);
        diffR.connect(sideR);
        sideL.connect(merger, 0, 0);
        sideR.connect(merger, 0, 1);
        chain = merger;
        break;
      }
      case "tapeSaturator": {
        const p = plugin.params;
        const drive = p.drive ?? 3;
        const gain = offlineCtx.createGain();
        gain.gain.value = 1;
        const waveShaper = offlineCtx.createWaveShaper();
        waveShaper.curve = makeTapeCurve(4096, drive);
        chain.connect(gain);
        gain.connect(waveShaper);
        chain = waveShaper;
        break;
      }
      case "deesser": {
        const p = plugin.params;
        const filter = offlineCtx.createBiquadFilter();
        filter.type = "notch";
        filter.frequency.value = p.frequency ?? 7000;
        filter.Q.value = p.q ?? 1;
        chain.connect(filter);
        chain = filter;
        break;
      }
    }
  }
  const masterGain = offlineCtx.createGain();
  masterGain.gain.value = 0.99;
  chain.connect(masterGain);
  masterGain.connect(offlineCtx.destination);
  source.start(0);
  return offlineCtx.startRendering();
}

function makeLimiterCurve(size: number, ceilingDb: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(size);
  const ceiling = Math.pow(10, ceilingDb / 20);
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    const absX = Math.abs(x);
    if (absX <= ceiling) {
      curve[i] = x;
    } else {
      curve[i] = Math.sign(x) * ceiling;
    }
  }
  return curve;
}

function makeTapeCurve(size: number, drive: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}
