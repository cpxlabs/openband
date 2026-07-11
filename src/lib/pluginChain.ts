import type { Plugin, PluginType } from "./types";
import { applyMasteringChain } from "./mastering";
import { pitchShift } from "./timeStretch";
import { PLUGIN_SPECS, clampParam } from "./types";

export type ScaleType = "major" | "minor" | "chromatic" | "pentatonicMajor" | "pentatonicMinor";

const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
};

export function snapToScale(
  frequency: number,
  key: number,
  scale: ScaleType,
): { midiNote: number; frequency: number; correction: number } {
  const intervals = SCALE_INTERVALS[scale] || SCALE_INTERVALS.major;
  const midiNoteFloat = 12 * Math.log2(frequency / 440) + 69;
  const originalMidiNote = Math.round(midiNoteFloat);
  const pitchClass = ((originalMidiNote % 12) + 12) % 12;

  const scaledPitchClasses = new Set(intervals.map((i) => (key + i) % 12));

  if (scaledPitchClasses.has(pitchClass)) {
    return {
      midiNote: originalMidiNote,
      frequency: 440 * Math.pow(2, (originalMidiNote - 69) / 12),
      correction: 0,
    };
  }

  let bestDist = Infinity;
  let bestPc = pitchClass;
  for (const spc of scaledPitchClasses) {
    const dist = Math.min(
      Math.abs(pitchClass - spc),
      Math.abs(pitchClass - spc + 12),
      Math.abs(pitchClass - spc - 12),
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestPc = spc;
    }
  }

  const octaveDiff = Math.round((originalMidiNote - pitchClass - (originalMidiNote - bestPc)) / 12);
  const targetMidiNote = originalMidiNote + (bestPc - pitchClass) + octaveDiff * 12;
  const correction = targetMidiNote - originalMidiNote;

  return {
    midiNote: targetMidiNote,
    frequency: 440 * Math.pow(2, (targetMidiNote - 69) / 12),
    correction,
  };
}

function makeHardClipCurve(size: number, ceiling: number): Float32Array {
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = Math.max(-ceiling, Math.min(ceiling, x));
  }
  return curve;
}

function makeDistortionCurve(size: number, drive: number): Float32Array {
  const curve = new Float32Array(size);
  const k = Math.max(1, drive * 10);
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = ((3 + k) * x * 20 * Math.PI / 180) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

const VALID_FILTER_TYPES: BiquadFilterType[] = [
  "lowpass", "highpass", "bandpass", "lowshelf",
  "highshelf", "peaking", "notch", "allpass",
];

export function buildPluginGraph(plugins: Plugin[]): Plugin[] {
  return plugins.filter((p) => p.enabled !== false);
}

export async function applyPluginChain(
  buffer: AudioBuffer,
  plugins: Plugin[],
  sampleRate: number,
): Promise<AudioBuffer> {
  if (!plugins || plugins.length === 0) return buffer;

  const enabled = plugins.filter((p) => p.enabled);
  if (enabled.length === 0) return buffer;

  const masteringTypes = new Set([
    "eq", "compressor", "limiter", "truePeakLimiter",
    "multibandCompressor", "stereoImager", "tapeSaturator", "deesser",
  ]);

  const masteringPlugins = enabled.filter((p) => masteringTypes.has(p.type));
  const otherPlugins = enabled.filter((p) => !masteringTypes.has(p.type));

  let current = buffer;

  if (masteringPlugins.length > 0) {
    current = await applyMasteringChain(current, masteringPlugins, sampleRate);
  }

  for (const plugin of otherPlugins) {
    current = await applySinglePlugin(current, plugin, sampleRate);
  }

  return current;
}

async function applySinglePlugin(
  buffer: AudioBuffer,
  plugin: Plugin,
  sampleRate: number,
): Promise<AudioBuffer> {
  if (plugin.type === "autoPitch") {
    return applyAutoPitch(buffer, plugin, sampleRate, plugin.params);
  }

  const len = buffer.length;
  const numCh = buffer.numberOfChannels;
  const ctx = new OfflineAudioContext(numCh, len, sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const p = plugin.params;

  switch (plugin.type) {
    case "distortion": {
      const drive = (p.drive ?? 5) as number;
      const ws = ctx.createWaveShaper();
      ws.curve = makeDistortionCurve(4096, drive) as Float32Array<ArrayBuffer>;
      const inputGain = ctx.createGain();
      inputGain.gain.value = 1 + drive * 0.5;
      const outputGain = ctx.createGain();
      outputGain.gain.value = 1 / (1 + drive * 0.5);
      source.connect(inputGain);
      inputGain.connect(ws);
      ws.connect(outputGain);
      outputGain.connect(ctx.destination);
      break;
    }
    case "reverb": {
      const decay = (p.decay ?? 2) as number;
      const mix = (p.mix ?? 30) as number;
      const irLen = Math.max(256, Math.floor(sampleRate * decay));
      const ir = ctx.createBuffer(numCh, irLen, sampleRate);
      for (let c = 0; c < numCh; c++) {
        const data = ir.getChannelData(c);
        for (let i = 0; i < irLen; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2);
        }
      }
      const convolver = ctx.createConvolver();
      convolver.buffer = ir;
      const wetGain = ctx.createGain();
      wetGain.gain.value = mix / 100;
      const dryGain = ctx.createGain();
      dryGain.gain.value = 1 - mix / 100;
      source.connect(dryGain);
      dryGain.connect(ctx.destination);
      source.connect(convolver);
      convolver.connect(wetGain);
      wetGain.connect(ctx.destination);
      break;
    }
    case "delay": {
      const delayTime = ((p.delayTime ?? 0.25) as number) / 1000;
      const feedback = (p.feedback ?? 30) as number;
      const wet = (p.wet ?? 30) as number;
      const delayNode = ctx.createDelay(5);
      delayNode.delayTime.value = Math.max(0.001, delayTime);
      const fbGain = ctx.createGain();
      fbGain.gain.value = feedback / 100;
      const wetGain = ctx.createGain();
      wetGain.gain.value = wet / 100;
      const dryGain = ctx.createGain();
      dryGain.gain.value = 1 - wet / 100;
      source.connect(dryGain);
      dryGain.connect(ctx.destination);
      source.connect(delayNode);
      delayNode.connect(fbGain);
      fbGain.connect(delayNode);
      delayNode.connect(wetGain);
      wetGain.connect(ctx.destination);
      break;
    }
    case "filter": {
      const filter = ctx.createBiquadFilter();
      const requestedType = String(p.type ?? "lowpass");
      filter.type = VALID_FILTER_TYPES.includes(requestedType as BiquadFilterType)
        ? (requestedType as BiquadFilterType)
        : "lowpass";
      filter.frequency.value = (p.frequency ?? 1000) as number;
      filter.Q.value = (p.q ?? 0.707) as number;
      filter.gain.value = (p.gain ?? 0) as number;
      source.connect(filter);
      filter.connect(ctx.destination);
      break;
    }
    case "modulation": {
      const rate = (p.rate ?? 2) as number;
      const depth = (p.depth ?? 50) as number;
      const osc = ctx.createOscillator();
      osc.frequency.value = rate;
      const modGain = ctx.createGain();
      modGain.gain.value = depth / 100;
      const mainGain = ctx.createGain();
      mainGain.gain.value = 0.5;
      osc.connect(modGain);
      modGain.connect(mainGain.gain);
      source.connect(mainGain);
      mainGain.connect(ctx.destination);
      osc.start(0);
      break;
    }
    case "utility": {
      const volume = (p.volume ?? 0) as number;
      const invert = Boolean(p.invert ?? false);
      const gain = ctx.createGain();
      gain.gain.value = Math.pow(10, volume / 20);
      if (invert) {
        const ws = ctx.createWaveShaper();
        const invCurve = new Float32Array(4096);
        for (let i = 0; i < 4096; i++) {
          invCurve[i] = (i / 2047.5) - 1;
        }
        ws.curve = invCurve;
        source.connect(ws);
        ws.connect(gain);
      } else {
        source.connect(gain);
      }
      gain.connect(ctx.destination);
      break;
    }
    case "noiseGate": {
      const threshold = (p.threshold ?? -40) as number;
      const gate = ctx.createGain();
      const gateData = buffer.getChannelData(0);
      const thresholdLinear = Math.pow(10, threshold / 20);
      let rms = 0;
      for (let i = 0; i < gateData.length; i++) rms += gateData[i] * gateData[i];
      rms = Math.sqrt(rms / gateData.length);
      gate.gain.value = rms < thresholdLinear ? 0.01 : 1;
      source.connect(gate);
      gate.connect(ctx.destination);
      break;
    }
    case "bassMono": {
      const freq = (p.frequency ?? 100) as number;
      const splitter = ctx.createChannelSplitter(2);
      const lowL = ctx.createBiquadFilter();
      lowL.type = "lowpass";
      lowL.frequency.value = freq;
      const lowR = ctx.createBiquadFilter();
      lowR.type = "lowpass";
      lowR.frequency.value = freq;
      const highL = ctx.createBiquadFilter();
      highL.type = "highpass";
      highL.frequency.value = freq;
      const highR = ctx.createBiquadFilter();
      highR.type = "highpass";
      highR.frequency.value = freq;
      const monoSum = ctx.createGain();
      monoSum.gain.value = 0.5;
      const merger = ctx.createChannelMerger(2);
      source.connect(splitter);
      splitter.connect(lowL, 0);
      splitter.connect(lowR, 1);
      splitter.connect(highL, 0);
      splitter.connect(highR, 1);
      lowL.connect(monoSum);
      lowR.connect(monoSum);
      monoSum.connect(merger, 0, 0);
      monoSum.connect(merger, 0, 1);
      highL.connect(merger, 0, 0);
      highR.connect(merger, 0, 1);
      merger.connect(ctx.destination);
      break;
    }
    case "stereoWidener": {
      const width = (p.width ?? 150) as number;
      const widthScale = Math.max(0, width / 100);
      const splitter = ctx.createChannelSplitter(2);
      const sumL = ctx.createGain();
      sumL.gain.value = 0.5;
      const sumR = ctx.createGain();
      sumR.gain.value = 0.5;
      const diffL = ctx.createGain();
      diffL.gain.value = 0.5;
      const diffR = ctx.createGain();
      diffR.gain.value = -0.5;
      const sideL = ctx.createGain();
      sideL.gain.value = widthScale;
      const sideR = ctx.createGain();
      sideR.gain.value = widthScale;
      const merger = ctx.createChannelMerger(2);
      source.connect(splitter);
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
      merger.connect(ctx.destination);
      break;
    }
    case "clipper": {
      const ceilingDb = (p.ceiling ?? -0.5) as number;
      const ceiling = Math.pow(10, ceilingDb / 20);
      const ws = ctx.createWaveShaper();
      ws.curve = makeHardClipCurve(4096, ceiling) as Float32Array<ArrayBuffer>;
      const gain = ctx.createGain();
      gain.gain.value = 1;
      source.connect(gain);
      gain.connect(ws);
      ws.connect(ctx.destination);
      break;
    }
    default:
      source.connect(ctx.destination);
  }

  source.start(0);
  return ctx.startRendering();
}

async function applyAutoPitch(
  buffer: AudioBuffer,
  _plugin: Plugin,
  _sampleRate: number,
  p: Record<string, number>,
): Promise<AudioBuffer> {
  const amount = (p.amount ?? 70) as number;
  const key = (p.key ?? 0) as number;
  const scaleIdx = (p.scale ?? 0) as number;
  const mix = (p.mix ?? 80) as number;
  const scaleMap: ScaleType[] = ["major", "minor", "chromatic"];
  const scale = scaleMap[scaleIdx] || "major";
  const data = buffer.getChannelData(0);
  let zeroCrossings = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i - 1] <= 0 && data[i] > 0) zeroCrossings++;
  }
  const duration = buffer.duration;
  const detectedFreq = duration > 0 ? zeroCrossings / duration : 440;
  const snap = snapToScale(detectedFreq, key, scale);
  const correctionSemitones = snap.correction * (amount / 100);
  const shifted = await pitchShift(buffer, correctionSemitones);
  const mixRatio = mix / 100;
  const numCh = buffer.numberOfChannels;
  const len = buffer.length;
  const sampleRate = buffer.sampleRate;
  const ctx2 = new OfflineAudioContext(numCh, len, sampleRate);
  const srcDry = ctx2.createBufferSource();
  srcDry.buffer = buffer;
  const srcWet = ctx2.createBufferSource();
  srcWet.buffer = shifted;
  const dryGain = ctx2.createGain();
  dryGain.gain.value = 1 - mixRatio;
  const wetGain = ctx2.createGain();
  wetGain.gain.value = mixRatio;
  srcDry.connect(dryGain);
  dryGain.connect(ctx2.destination);
  srcWet.connect(wetGain);
  wetGain.connect(ctx2.destination);
  srcDry.start(0);
  srcWet.start(0);
  return ctx2.startRendering();
}

export function serializePlugin(plugin: Plugin): string {
  return JSON.stringify({
    id: plugin.id,
    type: plugin.type,
    name: plugin.name,
    enabled: plugin.enabled,
    params: plugin.params,
    color: plugin.color,
  });
}

export function deserializePlugin(json: string): Plugin {
  const parsed = JSON.parse(json) as Partial<Plugin>;
  const type = (parsed.type ?? "eq") as PluginType;
  const spec = PLUGIN_SPECS[type];
  const rawParams = parsed.params ?? {};
  const params: Record<string, number> = {};
  if (spec) {
    for (const p of spec.params) {
      const raw = rawParams[p.id];
      params[p.id] = raw !== undefined ? clampParam(p, raw) : clampParam(p, p.default);
    }
    for (const key of Object.keys(rawParams)) {
      if (params[key] === undefined) params[key] = rawParams[key];
    }
  } else {
    Object.assign(params, rawParams);
  }
  return {
    id: parsed.id ?? "",
    name: parsed.name ?? "",
    type,
    enabled: parsed.enabled ?? true,
    params,
    color: parsed.color,
    latencySamples: parsed.latencySamples,
    stateA: parsed.stateA,
    stateB: parsed.stateB,
    activeSlot: parsed.activeSlot,
  };
}

export function applyPluginSlot(plugin: Plugin): Plugin {
  if (plugin.activeSlot === "B" && plugin.stateB) {
    return { ...plugin, params: { ...plugin.stateB } };
  }
  if (plugin.activeSlot === "A" && plugin.stateA) {
    return { ...plugin, params: { ...plugin.stateA } };
  }
  return plugin;
}

export function storePluginSlot(plugin: Plugin, slot: "A" | "B"): Plugin {
  if (slot === "A") {
    return { ...plugin, stateA: { ...plugin.params }, activeSlot: "A" };
  }
  return { ...plugin, stateB: { ...plugin.params }, activeSlot: "B" };
}

export function getChainLatency(plugins: Plugin[]): number {
  return plugins.reduce((sum, p) => {
    if (p.enabled === false) return sum;
    return sum + (p.latencySamples ?? PLUGIN_SPECS[p.type]?.latencySamples ?? 0);
  }, 0);
}
