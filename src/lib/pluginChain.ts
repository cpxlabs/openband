import type { Plugin, PluginType } from "./types";
import { applyMasteringChain } from "./mastering";
import { pitchShift } from "./timeStretch";
import { PLUGIN_SPECS, clampParam } from "./types";
import {
  paramToTarget,
  getModulationState,
  applyModulation,
  type ModTarget,
} from "./modulationMatrix";

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

function makeSoftClipCurve(size: number, ceiling: number, thresholdDb: number): Float32Array {
  const curve = new Float32Array(size);
  const threshold = Math.pow(10, thresholdDb / 20);
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    if (Math.abs(x) <= threshold) {
      curve[i] = x;
    } else {
      const sign = Math.sign(x);
      const over = Math.min(1, (Math.abs(x) - threshold) / (1 - threshold || 1));
      curve[i] = sign * (threshold + (ceiling - threshold) * Math.tanh(over));
    }
  }
  return curve;
}

function makeTanhCurve(size: number, drive: number): Float32Array {
  const curve = new Float32Array(size);
  const k = Math.max(0.1, 1 + drive * 0.6);
  const norm = Math.tanh(k);
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / norm;
  }
  return curve;
}

function makeReverbIR(
  ctx: OfflineAudioContext,
  decay: number,
  preDelay: number,
  damping: number,
  size: number,
  shimmerPitch: number,
  modulationAmt: number,
  numCh: number,
  sampleRate: number,
): AudioBuffer {
  const baseLen = Math.max(256, Math.floor(sampleRate * decay));
  const len = Math.max(256, Math.floor(baseLen * (0.4 + (size / 100) * 1.2)));
  const preSamp = Math.floor((preDelay / 1000) * sampleRate);
  const irLen = len + preSamp;
  const ir = ctx.createBuffer(numCh, irLen, sampleRate);
  const dampCoef = damping / 100;
  const lpCoef = 0.01 + (1 - dampCoef) * 0.25;
  const mod = modulationAmt / 100;
  const shift = shimmerPitch !== 0 ? Math.pow(2, shimmerPitch / 12) : 1;
  for (let c = 0; c < numCh; c++) {
    const data = ir.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, 2 + dampCoef * 4);
      const noise = Math.random() * 2 - 1;
      lp = lp + (noise - lp) * lpCoef;
      data[i + preSamp] = lp * env;
    }
    if (shimmerPitch !== 0) {
      for (let i = 0; i < len; i++) {
        const srcIdx = Math.floor(i / shift);
        if (srcIdx < len) {
          data[i + preSamp] += data[srcIdx + preSamp] * 0.3 * (1 - dampCoef);
        }
      }
    }
    if (mod > 0) {
      for (let i = 0; i < len; i++) {
        const lfo = 1 + mod * 0.3 * Math.sin((i / len) * Math.PI * 8);
        data[i + preSamp] *= lfo;
      }
    }
  }
  return ir;
}

const VALID_FILTER_TYPES: BiquadFilterType[] = [
  "lowpass", "highpass", "bandpass", "lowshelf",
  "highshelf", "peaking", "notch", "allpass",
];

export function resolveParam(
  p: Record<string, number>,
  canonical: string,
  ...aliases: (string | undefined)[]
): number | undefined {
  const v = p[canonical];
  if (v !== undefined) return v;
  for (const a of aliases) {
    if (a && p[a] !== undefined) return p[a];
  }
  return undefined;
}

export function buildPluginGraph(plugins: Plugin[]): Plugin[] {
  return plugins.filter((p) => p.enabled !== false);
}

export interface PluginChainOptions {
  duration?: number;
  modTime?: number;
}

function routeEnabledFor(target: ModTarget | null): boolean {
  if (!target) return false;
  return getModulationState().routes.some(
    (r) => r.enabled && r.target === target,
  );
}

function paramRange(plugin: Plugin, paramId: string): [number, number] {
  const spec = PLUGIN_SPECS[plugin.type];
  const p = spec?.params.find((pp) => pp.id === paramId);
  if (p) return [p.min, p.max];
  return [0, 1];
}

function scheduleModulated(
  param: AudioParam,
  base: number,
  min: number,
  max: number,
  target: ModTarget | null,
  duration: number,
  modTime: number,
): void {
  if (!target || !routeEnabledFor(target)) {
    param.value = base;
    return;
  }
  const steps = Math.max(2, Math.min(256, Math.round(duration * 20)));
  param.setValueAtTime(
    applyModulation(target, base, min, max, { time: modTime }),
    modTime,
  );
  for (let i = 1; i <= steps; i++) {
    const t = modTime + (i / steps) * duration;
    const v = applyModulation(target, base, min, max, { time: t });
    param.linearRampToValueAtTime(v, t);
  }
}

export async function applyPluginChain(
  buffer: AudioBuffer,
  plugins: Plugin[],
  sampleRate: number,
  opts: PluginChainOptions = {},
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
    current = await applySinglePlugin(current, plugin, sampleRate, opts);
  }

  return current;
}

async function applySinglePlugin(
  buffer: AudioBuffer,
  plugin: Plugin,
  sampleRate: number,
  opts: PluginChainOptions = {},
): Promise<AudioBuffer> {
  const duration = opts.duration && opts.duration > 0 ? opts.duration : 1;
  const modTime = opts.modTime ?? 0;
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
      const drive = (resolveParam(p, "drive") ?? 5) as number;
      const tone = (resolveParam(p, "tone") ?? 50) as number;
      const mix = (resolveParam(p, "mix") ?? 70) as number;
      const ws = ctx.createWaveShaper();
      ws.curve = makeTanhCurve(4096, drive) as Float32Array<ArrayBuffer>;
      const inputGain = ctx.createGain();
      inputGain.gain.value = 1 + drive * 0.5;
      const outputGain = ctx.createGain();
      outputGain.gain.value = 1 / (1 + drive * 0.5);
      const toneFilter = ctx.createBiquadFilter();
      toneFilter.type = "lowpass";
      toneFilter.frequency.value = 200 + (tone / 100) * 16000;
      const wetGain = ctx.createGain();
      wetGain.gain.value = mix / 100;
      const dryGain = ctx.createGain();
      dryGain.gain.value = 1 - mix / 100;
      source.connect(dryGain);
      dryGain.connect(ctx.destination);
      source.connect(inputGain);
      inputGain.connect(ws);
      ws.connect(toneFilter);
      toneFilter.connect(outputGain);
      outputGain.connect(wetGain);
      wetGain.connect(ctx.destination);
      break;
    }
    case "reverb": {
      const decay = (p.decay ?? 2) as number;
      const preDelay = (p.preDelay ?? 20) as number;
      const damping = (p.damping ?? 40) as number;
      const size = (p.size ?? 60) as number;
      const shimmerPitch = (p.shimmerPitch ?? 0) as number;
      const modulationAmt = (p.modulation ?? 0) as number;
      const mix = (p.mix ?? 30) as number;
      const ir = makeReverbIR(ctx, decay, preDelay, damping, size, shimmerPitch, modulationAmt, numCh, sampleRate);
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
      const time = (resolveParam(p, "time", "delayTime") ?? 300) as number;
      const feedback = (p.feedback ?? 35) as number;
      const mix = (resolveParam(p, "mix", "wet") ?? 25) as number;
      const delayNode = ctx.createDelay(5);
      delayNode.delayTime.value = Math.max(0.001, time / 1000);
      const fbGain = ctx.createGain();
      fbGain.gain.value = feedback / 100;
      const wetGain = ctx.createGain();
      wetGain.gain.value = mix / 100;
      const dryGain = ctx.createGain();
      dryGain.gain.value = 1 - mix / 100;
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
      const modeVal = resolveParam(p, "mode", "type") ?? 0;
      const FILTER_MODES: BiquadFilterType[] = [
        "lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "notch",
      ];
      let filterType: BiquadFilterType = "lowpass";
      if (typeof modeVal === "string") {
        filterType = VALID_FILTER_TYPES.includes(modeVal as BiquadFilterType)
          ? (modeVal as BiquadFilterType)
          : "lowpass";
      } else {
        const idx = Math.round(modeVal);
        filterType = FILTER_MODES[idx] ?? "lowpass";
      }
      filter.type = filterType;
      const freq = (resolveParam(p, "freq", "frequency") ?? 1000) as number;
      const [freqMin, freqMax] = paramRange(plugin, "freq");
      scheduleModulated(
        filter.frequency,
        freq,
        freqMin,
        freqMax,
        paramToTarget("freq"),
        duration,
        modTime,
      );
      const res = (resolveParam(p, "resonance", "q") ?? 0) as number;
      const [resMin, resMax] = paramRange(plugin, "resonance");
      scheduleModulated(
        filter.Q,
        0.707 + (res / 100) * 10,
        resMin,
        resMax,
        paramToTarget("resonance"),
        duration,
        modTime,
      );
      filter.gain.value = 0;
      source.connect(filter);
      filter.connect(ctx.destination);
      break;
    }
    case "modulation": {
      const rate = (p.rate ?? 2) as number;
      const depth = (p.depth ?? 50) as number;
      const mix = (resolveParam(p, "mix") ?? 40) as number;
      const baseDelay = 0.02;
      const modDepth = (depth / 100) * 0.01;
      const splitter = ctx.createChannelSplitter(numCh);
      const merger = ctx.createChannelMerger(numCh);
      const oscL = ctx.createOscillator();
      oscL.frequency.value = rate;
      const oscR = ctx.createOscillator();
      oscR.frequency.value = rate * 1.05;
      const delays: { delay: DelayNode; mod: GainNode }[] = [];
      for (let c = 0; c < numCh; c++) {
        const delay = ctx.createDelay(1);
        delay.delayTime.value = baseDelay;
        const mod = ctx.createGain();
        mod.gain.value = modDepth;
        const osc = c % 2 === 0 ? oscL : oscR;
        osc.connect(mod);
        mod.connect(delay.delayTime);
        splitter.connect(delay, c, 0);
        delay.connect(merger, 0, c);
        delays.push({ delay, mod });
      }
      const wetGain = ctx.createGain();
      wetGain.gain.value = mix / 100;
      const dryGain = ctx.createGain();
      dryGain.gain.value = 1 - mix / 100;
      source.connect(splitter);
      source.connect(dryGain);
      dryGain.connect(ctx.destination);
      merger.connect(wetGain);
      wetGain.connect(ctx.destination);
      oscL.start(0);
      oscR.start(0);
      break;
    }
    case "utility": {
      const gainDb = (resolveParam(p, "gain", "volume") ?? 0) as number;
      const pan = (p.pan ?? 0) as number;
      const phase = (resolveParam(p, "phase", "invert") ?? 0) as number;
      let node: AudioNode = source;
      if (phase) {
        const ws = ctx.createWaveShaper();
        const invCurve = new Float32Array(4096);
        for (let i = 0; i < 4096; i++) {
          const x = (i / 4095) * 2 - 1;
          invCurve[i] = -x;
        }
        ws.curve = invCurve;
        source.connect(ws);
        node = ws;
      }
      const gain = ctx.createGain();
      const [gainMin, gainMax] = paramRange(plugin, "gain");
      scheduleModulated(
        gain.gain,
        Math.pow(10, gainDb / 20),
        gainMin,
        gainMax,
        paramToTarget("gain"),
        duration,
        modTime,
      );
      node.connect(gain);
      if (numCh > 1 && ctx.createStereoPanner) {
        const panner = ctx.createStereoPanner();
        const [panMin, panMax] = paramRange(plugin, "pan");
        scheduleModulated(
          panner.pan,
          Math.max(-1, Math.min(1, pan / 100)),
          panMin,
          panMax,
          paramToTarget("pan"),
          duration,
          modTime,
        );
        gain.connect(panner);
        panner.connect(ctx.destination);
      } else {
        gain.connect(ctx.destination);
      }
      break;
    }
    case "noiseGate": {
      const threshold = (p.threshold ?? -40) as number;
      const attack = (p.attack ?? 1) as number;
      const release = (p.release ?? 100) as number;
      const rangeDb = (p.range ?? 60) as number;
      const hold = (p.hold ?? 20) as number;
      const threshLin = Math.pow(10, threshold / 20);
      const rangeLin = Math.pow(10, -rangeDb / 20);
      const ref = buffer.getChannelData(0);
      const block = 256;
      const attackCoef = Math.max(0.001, 1 / Math.max(1, (attack / 1000) * sampleRate / block));
      const releaseCoef = Math.max(0.001, 1 / Math.max(1, (release / 1000) * sampleRate / block));
      const holdBlocks = Math.max(0, Math.floor((hold / 1000) * sampleRate / block));
      const gate = ctx.createGain();
      let g = 1;
      let holdCount = 0;
      for (let b = 0; b < len; b += block) {
        let peak = 0;
        for (let i = b; i < Math.min(b + block, len); i++) {
          peak = Math.max(peak, Math.abs(ref[i]));
        }
        const open = peak > threshLin;
        if (open) {
          holdCount = holdBlocks;
          const target = 1;
          g = g + (target - g) * attackCoef;
        } else if (holdCount > 0) {
          holdCount--;
        } else {
          const target = rangeLin;
          g = g + (target - g) * releaseCoef;
        }
        gate.gain.setValueAtTime(g, b / sampleRate);
      }
      source.connect(gate);
      gate.connect(ctx.destination);
      break;
    }
    case "bassMono": {
      const freq = (resolveParam(p, "crossover", "frequency") ?? 150) as number;
      const amount = (p.amount ?? 100) as number;
      const phaseFlip = (p.phase ?? 0) as number;
      const dryWet = (p.dryWet ?? 100) as number;
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
      const monoGain = phaseFlip ? -0.5 : 0.5;
      const monoSum = ctx.createGain();
      monoSum.gain.value = monoGain;
      const origLowL = ctx.createGain();
      origLowL.gain.value = 1 - amount / 100;
      const origLowR = ctx.createGain();
      origLowR.gain.value = 1 - amount / 100;
      const monoLowL = ctx.createGain();
      monoLowL.gain.value = amount / 100;
      const monoLowR = ctx.createGain();
      monoLowR.gain.value = amount / 100;
      const merger = ctx.createChannelMerger(2);
      source.connect(splitter);
      splitter.connect(lowL, 0);
      splitter.connect(lowR, 1);
      splitter.connect(highL, 0);
      splitter.connect(highR, 1);
      lowL.connect(monoSum);
      lowR.connect(monoSum);
      lowL.connect(origLowL);
      lowR.connect(origLowR);
      monoSum.connect(monoLowL);
      monoSum.connect(monoLowR);
      monoLowL.connect(merger, 0, 0);
      monoLowR.connect(merger, 0, 1);
      origLowL.connect(merger, 0, 0);
      origLowR.connect(merger, 0, 1);
      highL.connect(merger, 0, 0);
      highR.connect(merger, 0, 1);
      const wetGain = ctx.createGain();
      wetGain.gain.value = dryWet / 100;
      const dryGain = ctx.createGain();
      dryGain.gain.value = 1 - dryWet / 100;
      merger.connect(wetGain);
      wetGain.connect(ctx.destination);
      source.connect(dryGain);
      dryGain.connect(ctx.destination);
      break;
    }
    case "stereoWidener": {
      const width = (p.width ?? 120) as number;
      const widthScale = Math.max(0, width / 100);
      const midGainDb = (p.midGain ?? 0) as number;
      const sideGainDb = (p.sideGain ?? 0) as number;
      const crossover = (p.crossover ?? 200) as number;
      const mix = (p.mix ?? 100) as number;
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
      sideHpL.frequency.value = crossover;
      const sideHpR = ctx.createBiquadFilter();
      sideHpR.type = "highpass";
      sideHpR.frequency.value = crossover;
      const stereoize = (p.stereoize ?? 30) as number;
      const stereoizeFactor = 1 + (stereoize / 100) * 0.5;
      const sideL = ctx.createGain();
      const [widthMin, widthMax] = paramRange(plugin, "width");
      scheduleModulated(
        sideL.gain,
        widthScale * Math.pow(10, sideGainDb / 20) * stereoizeFactor,
        widthMin,
        widthMax,
        paramToTarget("width"),
        duration,
        modTime,
      );
      const sideR = ctx.createGain();
      scheduleModulated(
        sideR.gain,
        widthScale * Math.pow(10, sideGainDb / 20) * stereoizeFactor,
        widthMin,
        widthMax,
        paramToTarget("width"),
        duration,
        modTime,
      );
      const midG = ctx.createGain();
      midG.gain.value = Math.pow(10, midGainDb / 20);
      const outL = ctx.createGain();
      outL.gain.value = 1;
      const outR = ctx.createGain();
      outR.gain.value = 1;
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
      const wetGain = ctx.createGain();
      wetGain.gain.value = mix / 100;
      const dryGain = ctx.createGain();
      dryGain.gain.value = 1 - mix / 100;
      outL.connect(wetGain);
      outR.connect(wetGain);
      wetGain.connect(ctx.destination);
      source.connect(dryGain);
      dryGain.connect(ctx.destination);
      break;
    }
    case "clipper": {
      const threshold = (p.threshold ?? -3) as number;
      const ceilingDb = (p.ceiling ?? -0.5) as number;
      const mode = (p.mode ?? 0) as number;
      const mix = (p.mix ?? 100) as number;
      const ceiling = Math.pow(10, ceilingDb / 20);
      const ws = ctx.createWaveShaper();
      ws.curve = mode === 1
        ? makeHardClipCurve(4096, ceiling) as Float32Array<ArrayBuffer>
        : makeSoftClipCurve(4096, ceiling, threshold) as Float32Array<ArrayBuffer>;
      const wetGain = ctx.createGain();
      wetGain.gain.value = mix / 100;
      const dryGain = ctx.createGain();
      dryGain.gain.value = 1 - mix / 100;
      source.connect(dryGain);
      dryGain.connect(ctx.destination);
      source.connect(ws);
      ws.connect(wetGain);
      wetGain.connect(ctx.destination);
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
  const mix = (resolveParam(p, "mix") ?? 80) as number;
  const speed = (p.speed ?? 30) as number;
  const formant = (p.formant ?? 0) as number;
  const vibrato = (p.vibrato ?? 15) as number;
  const scaleMap: ScaleType[] = ["major", "minor", "chromatic"];
  const scale = scaleMap[scaleIdx] || "major";
  const data = buffer.getChannelData(0);
  const frameSize = Math.max(256, Math.floor((speed / 100) * data.length || 256));
  const frameCount = Math.max(1, Math.floor(data.length / frameSize));
  let correctionSum = 0;
  for (let f = 0; f < frameCount; f++) {
    const start = f * frameSize;
    let zc = 0;
    for (let i = start + 1; i < start + frameSize && i < data.length; i++) {
      if (data[i - 1] <= 0 && data[i] > 0) zc++;
    }
    const fDur = frameSize / buffer.sampleRate;
    const fFreq = fDur > 0 ? zc / fDur : 440;
    correctionSum += snapToScale(fFreq, key, scale).correction;
  }
  const avgCorrection = correctionSum / frameCount;
  const correctionSemitones = avgCorrection * (amount / 100);
  const shifted = await pitchShift(buffer, correctionSemitones);
  void formant;
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
  if (vibrato > 0 && numCh > 0) {
    const lfo = ctx2.createOscillator();
    lfo.frequency.value = 5 + vibrato / 20;
    const lfoGain = ctx2.createGain();
    lfoGain.gain.value = (vibrato / 100) * mixRatio * 0.5;
    lfo.connect(lfoGain);
    lfoGain.connect(wetGain.gain);
    lfo.start(0);
  }
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
