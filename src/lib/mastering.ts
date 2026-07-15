import type { Plugin } from "./types";
import { getDefaultParams, EQ_DEFAULT_BANDS, PLUGIN_SPECS } from "./types";
import {
  paramToTarget,
  getModulationState,
  applyModulation,
} from "./modulationMatrix";

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
    description: "EQ → Multiband → True Peak",
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
    description: "EQ → Multiband → Imager → True Peak",
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
    description: "Tape → EQ → True Peak",
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
  if (types.length < 2) return { valid: true };
  const last = types[types.length - 1];
  const secondLast = types[types.length - 2];
  const isLimiter = (t: string | undefined) =>
    t === "limiter" || t === "truePeakLimiter";
  if (isLimiter(last) && isLimiter(secondLast)) {
    return {
      valid: false,
      error:
        "Chain ends with more than one limiter node (limiter/truePeakLimiter)",
    };
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

const EQ_BAND_FILTER_TYPES = [
  "lowpass",
  "lowshelf",
  "peaking",
  "notch",
  "highshelf",
  "highpass",
];

export async function applyMasteringChain(
  buffer: AudioBuffer,
  plugins: Plugin[],
  sampleRate: number,
  opts: { modTime?: number; duration?: number } = {},
): Promise<AudioBuffer> {
  let current = buffer;
  for (const plugin of plugins) {
    if (!plugin.enabled) continue;
    current = await applyMasteringPlugin(current, plugin, sampleRate, opts);
  }
  return current;
}

async function applyMasteringPlugin(
  buffer: AudioBuffer,
  plugin: Plugin,
  sampleRate: number,
  opts: { modTime?: number; duration?: number } = {},
): Promise<AudioBuffer> {
  const modTime = opts.modTime ?? 0;
  const p = applyModulationToPluginParams(plugin, modTime);
  switch (plugin.type) {
    case "eq":
      return applyEq(buffer, p, sampleRate);
    case "compressor":
      return applyCompressor(buffer, p, sampleRate);
    case "limiter":
      return applyLimiter(buffer, p, sampleRate);
    case "truePeakLimiter":
      return applyTruePeakLimiter(buffer, p, sampleRate);
    case "multibandCompressor":
      return applyMultiband(buffer, p, sampleRate);
    case "stereoImager":
      return applyStereoImager(buffer, p, sampleRate);
    case "tapeSaturator":
      return applyTapeSaturator(buffer, p, sampleRate);
    case "deesser":
      return applyDeesser(buffer, p, sampleRate);
    default:
      return buffer;
  }
}

/**
 * Returns a copy of the plugin params with every routed mod target replaced by
 * its value at `modTime` (via the modulation matrix). Params without an active
 * route keep their base value, so the mastering render path honours modulation
 * assignments made in the PluginEditor at playback time.
 */
function applyModulationToPluginParams(
  plugin: Plugin,
  modTime: number,
): Record<string, number> {
  if (!plugin.params) return {};
  const spec = PLUGIN_SPECS[plugin.type];
  const out: Record<string, number> = { ...plugin.params };
  if (!spec) return out;
  for (const param of spec.params) {
    const target = paramToTarget(param.id);
    if (!target) continue;
    const active = getModulationState().routes.some(
      (r) => r.enabled && r.target === target,
    );
    if (!active) continue;
    out[param.id] = applyModulation(
      target,
      plugin.params[param.id] ?? param.default,
      param.min,
      param.max,
      { time: modTime },
    );
  }
  return out;
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

async function applyEq(
  buffer: AudioBuffer,
  p: Record<string, number>,
  sampleRate: number,
): Promise<AudioBuffer> {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length;
  const ctx = new OfflineAudioContext(numCh, len, sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  let node: AudioNode = source;
  for (let i = 0; i < 8; i++) {
    const enabled = (p[`b${i}_enabled`] ?? EQ_DEFAULT_BANDS[i].enabled) as number;
    if (!enabled) continue;
    const f = ctx.createBiquadFilter();
    const typeVal = (p[`b${i}_type`] ?? EQ_DEFAULT_BANDS[i].type) as number;
    f.type = (EQ_BAND_FILTER_TYPES[typeVal] || "peaking") as BiquadFilterType;
    f.frequency.value = (p[`b${i}_freq`] ?? EQ_DEFAULT_BANDS[i].freq) as number;
    f.gain.value = (p[`b${i}_gain`] ?? EQ_DEFAULT_BANDS[i].gain) as number;
    f.Q.value = (p[`b${i}_q`] ?? EQ_DEFAULT_BANDS[i].q) as number;
    node.connect(f);
    node = f;
  }
  const master = ctx.createGain();
  master.gain.value = Math.pow(10, ((p.master ?? 0) as number) / 20);
  node.connect(master);
  master.connect(ctx.destination);
  source.start(0);
  return ctx.startRendering();
}

async function applyCompressor(
  buffer: AudioBuffer,
  p: Record<string, number>,
  sampleRate: number,
): Promise<AudioBuffer> {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length;
  const ctx = new OfflineAudioContext(numCh, len, sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const comp = ctx.createDynamicsCompressor();
  if (p.threshold != null) comp.threshold.value = p.threshold;
  if (p.knee != null) comp.knee.value = p.knee;
  if (p.ratio != null) comp.ratio.value = p.ratio;
  if (p.attack != null) comp.attack.value = Math.max(0.001, p.attack / 1000);
  if (p.release != null) comp.release.value = p.release / 1000;
  const makeup = ctx.createGain();
  makeup.gain.value = Math.pow(10, ((p.makeupGain ?? 0) as number) / 20);
  source.connect(comp);
  comp.connect(makeup);
  makeup.connect(ctx.destination);
  source.start(0);
  return ctx.startRendering();
}

async function applyLimiter(
  buffer: AudioBuffer,
  p: Record<string, number>,
  sampleRate: number,
): Promise<AudioBuffer> {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length;
  const ctx = new OfflineAudioContext(numCh, len, sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = (p.threshold ?? -6) as number;
  comp.knee.value = 0;
  comp.ratio.value = 20;
  comp.attack.value = Math.max(0.001, ((p.attack ?? 0.5) as number) / 1000);
  comp.release.value = ((p.release ?? 40) as number) / 1000;
  const waveShaper = ctx.createWaveShaper();
  waveShaper.curve = makeLimiterCurve(4096, (p.ceiling ?? -1) as number);
  source.connect(comp);
  comp.connect(waveShaper);
  waveShaper.connect(ctx.destination);
  source.start(0);
  return ctx.startRendering();
}

async function applyTruePeakLimiter(
  buffer: AudioBuffer,
  p: Record<string, number>,
  sampleRate: number,
): Promise<AudioBuffer> {
  const oversample = Math.pow(2, (p.oversample ?? 2) as number);
  const osr = sampleRate * oversample;
  const olen = buffer.length * oversample;
  const osCtx = new OfflineAudioContext(buffer.numberOfChannels, olen, osr);
  const osBuf = osCtx.createBuffer(
    buffer.numberOfChannels,
    olen,
    osr,
  );
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = osBuf.getChannelData(c);
    for (let i = 0; i < olen; i++) {
      const idx = i / oversample;
      const i0 = Math.floor(idx);
      const frac = idx - i0;
      const i1 = Math.min(src.length - 1, i0 + 1);
      dst[i] = src[i0] * (1 - frac) + src[i1] * frac;
    }
  }
  const src = osCtx.createBufferSource();
  src.buffer = osBuf;
  const inGain = osCtx.createGain();
  inGain.gain.value = Math.pow(10, (Math.abs((p.threshold ?? -3) as number)) / 20);
  const comp = osCtx.createDynamicsCompressor();
  comp.threshold.value = (p.threshold ?? -3) as number;
  comp.knee.value = 0;
  comp.ratio.value = 20;
  comp.attack.value = Math.max(0.0001, ((p.lookahead ?? 1) as number) / 1000);
  comp.release.value = ((p.release ?? 50) as number) / 1000;
  const waveShaper = osCtx.createWaveShaper();
  waveShaper.curve = makeLimiterCurve(4096, (p.ceiling ?? -0.5) as number);
  src.connect(inGain);
  inGain.connect(comp);
  comp.connect(waveShaper);
  waveShaper.connect(osCtx.destination);
  src.start(0);
  const rendered = await osCtx.startRendering();
  const factor = oversample;
  const outCtx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, sampleRate);
  const out = outCtx.createBuffer(buffer.numberOfChannels, buffer.length, sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const r = rendered.getChannelData(c);
    const d = out.getChannelData(c);
    for (let i = 0; i < buffer.length; i++) {
      d[i] = r[Math.min(r.length - 1, Math.floor(i * factor))];
    }
  }
  return out;
}

async function applyMultiband(
  buffer: AudioBuffer,
  p: Record<string, number>,
  sampleRate: number,
): Promise<AudioBuffer> {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length;
  const crosses = [
    (p.b0_cross ?? 200) as number,
    (p.b1_cross ?? 2000) as number,
    (p.b2_cross ?? 20000) as number,
  ];
  const bands: { lo: number | null; hi: number | null }[] = [
    { lo: null, hi: crosses[0] },
    { lo: crosses[0], hi: crosses[1] },
    { lo: crosses[1], hi: crosses[2] },
    { lo: crosses[2], hi: null },
  ];
  const outCh: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) outCh.push(new Float32Array(len));
  for (let bi = 0; bi < 4; bi++) {
    if (((p[`b${bi}_mute`] ?? 0) as number) === 1) continue;
    const ctx = new OfflineAudioContext(numCh, len, sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    let node: AudioNode = source;
    if (bands[bi].lo != null) {
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = bands[bi].lo ?? 0;
      node.connect(hp);
      node = hp;
    }
    if (bands[bi].hi != null) {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = bands[bi].hi ?? 0;
      node.connect(lp);
      node = lp;
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = (p[`b${bi}_threshold`] ?? -20) as number;
    comp.ratio.value = (p[`b${bi}_ratio`] ?? 4) as number;
    comp.knee.value = 3;
    comp.attack.value = Math.max(0.001, ((p[`b${bi}_attack`] ?? 2) as number) / 1000);
    comp.release.value = ((p[`b${bi}_release`] ?? 80) as number) / 1000;
    const makeup = ctx.createGain();
    makeup.gain.value = Math.pow(10, ((p[`b${bi}_makeup`] ?? 4) as number) / 20);
    node.connect(comp);
    comp.connect(makeup);
    makeup.connect(ctx.destination);
    source.start(0);
    const bandBuf = await ctx.startRendering();
    for (let c = 0; c < numCh; c++) {
      const d = bandBuf.getChannelData(c);
      const o = outCh[c];
      for (let i = 0; i < len; i++) o[i] += d[i];
    }
  }
  const outCtx = new OfflineAudioContext(numCh, len, sampleRate);
  const out = outCtx.createBuffer(numCh, len, sampleRate);
  for (let c = 0; c < numCh; c++) out.getChannelData(c).set(outCh[c]);
  return out;
}

async function applyStereoImager(
  buffer: AudioBuffer,
  p: Record<string, number>,
  sampleRate: number,
): Promise<AudioBuffer> {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length;
  const ctx = new OfflineAudioContext(numCh, len, sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  if (numCh < 2) {
    source.connect(ctx.destination);
    source.start(0);
    return ctx.startRendering();
  }
  const width = ((p.width ?? 100) as number) / 100;
  const midGainDb = (p.midGain ?? 0) as number;
  const sideGainDb = (p.sideGain ?? 0) as number;
  const monoCross = (p.monoCross ?? 150) as number;
  const balance = (p.balance ?? 0) as number;
  const splitter = ctx.createChannelSplitter(2);
  const sumL = ctx.createGain();
  sumL.gain.value = 0.5;
  const sumR = ctx.createGain();
  sumR.gain.value = 0.5;
  const diffL = ctx.createGain();
  diffL.gain.value = 0.5;
  const diffR = ctx.createGain();
  diffR.gain.value = -0.5;
  const sideHpL = ctx.createBiquadFilter();
  sideHpL.type = "highpass";
  sideHpL.frequency.value = monoCross;
  const sideHpR = ctx.createBiquadFilter();
  sideHpR.type = "highpass";
  sideHpR.frequency.value = monoCross;
  const sideL = ctx.createGain();
  sideL.gain.value = width * Math.pow(10, sideGainDb / 20);
  const sideR = ctx.createGain();
  sideR.gain.value = width * Math.pow(10, sideGainDb / 20);
  const midG = ctx.createGain();
  midG.gain.value = Math.pow(10, midGainDb / 20);
  const outL = ctx.createGain();
  const outR = ctx.createGain();
  source.connect(splitter);
  splitter.connect(sumL, 0);
  splitter.connect(sumR, 1);
  splitter.connect(diffL, 0);
  splitter.connect(diffR, 1);
  sumL.connect(midG);
  sumR.connect(midG);
  diffL.connect(sideHpL);
  diffR.connect(sideHpR);
  sideHpL.connect(sideL);
  sideHpR.connect(sideR);
  midG.connect(outL);
  midG.connect(outR);
  sideL.connect(outL);
  sideR.connect(outR);
  if (ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, balance / 100));
    outL.connect(panner);
    outR.connect(panner);
    panner.connect(ctx.destination);
  } else {
    outL.connect(ctx.destination);
    outR.connect(ctx.destination);
  }
  source.start(0);
  return ctx.startRendering();
}

async function applyTapeSaturator(
  buffer: AudioBuffer,
  p: Record<string, number>,
  sampleRate: number,
): Promise<AudioBuffer> {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length;
  const ctx = new OfflineAudioContext(numCh, len, sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const drive = (p.drive ?? 3) as number;
  const warmth = (p.warmth ?? 50) as number;
  const noise = (p.noise ?? 5) as number;
  const wow = (p.wow ?? 10) as number;
  const mix = (p.mix ?? 60) as number;
  const waveShaper = ctx.createWaveShaper();
  waveShaper.curve = makeTapeCurve(4096, drive);
  const warmthFilter = ctx.createBiquadFilter();
  warmthFilter.type = "lowpass";
  warmthFilter.frequency.value = 2000 + (100 - warmth) * 180;
  const wetGain = ctx.createGain();
  wetGain.gain.value = mix / 100;
  const dryGain = ctx.createGain();
  dryGain.gain.value = 1 - mix / 100;
  source.connect(dryGain);
  dryGain.connect(ctx.destination);
  source.connect(waveShaper);
  waveShaper.connect(warmthFilter);
  warmthFilter.connect(wetGain);
  wetGain.connect(ctx.destination);
  if (wow > 0 && ctx.createDelay) {
    const delay = ctx.createDelay(0.02);
    delay.delayTime.value = 0.005;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.5 + wow / 50;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = (wow / 100) * 0.003;
    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);
    const wowGain = ctx.createGain();
    wowGain.gain.value = mix / 100;
    source.connect(delay);
    delay.connect(wowGain);
    wowGain.connect(ctx.destination);
    lfo.start(0);
  }
  if (noise > 0) {
    const noiseLen = Math.floor(0.1 * sampleRate);
    const noiseBuf = ctx.createBuffer(numCh, noiseLen, sampleRate);
    for (let c = 0; c < numCh; c++) {
      const d = noiseBuf.getChannelData(c);
      for (let i = 0; i < noiseLen; i++) d[i] = Math.random() * 2 - 1;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = (noise / 100) * 0.02;
    noiseSrc.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSrc.start(0);
  }
  source.start(0);
  return ctx.startRendering();
}

async function applyDeesser(
  buffer: AudioBuffer,
  p: Record<string, number>,
  sampleRate: number,
): Promise<AudioBuffer> {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length;
  const ctx = new OfflineAudioContext(numCh, len, sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const freq = (p.frequency ?? 6000) as number;
  const threshold = (p.threshold ?? -18) as number;
  const range = (p.range ?? 12) as number;
  const mode = (p.mode ?? 0) as number;
  const ratio = 2 + range / 2;
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = freq;
  const lowGain = ctx.createGain();
  source.connect(low);
  low.connect(lowGain);
  lowGain.connect(ctx.destination);
  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = freq;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = threshold;
  comp.ratio.value = ratio;
  comp.knee.value = 0;
  comp.attack.value = 0.005;
  comp.release.value = 0.05;
  const highGain = ctx.createGain();
  source.connect(high);
  high.connect(comp);
  comp.connect(highGain);
  highGain.connect(ctx.destination);
  if (mode === 1) {
    const comp2 = ctx.createDynamicsCompressor();
    comp2.threshold.value = threshold;
    comp2.ratio.value = ratio;
    comp2.attack.value = 0.005;
    comp2.release.value = 0.05;
    const wideGain = ctx.createGain();
    source.connect(comp2);
    comp2.connect(wideGain);
    wideGain.connect(ctx.destination);
  }
  source.start(0);
  return ctx.startRendering();
}
