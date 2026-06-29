import { AudioNodeGraph, type AudioNodeFactory } from "./audioNodeGraph";

let _workletRegistered = false;

const WORKLET_CODE = `
class PedalboardProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.drive = 1;
    this.level = 1;
    this.port.onmessage = (event) => {
      const { type, value } = event.data;
      if (type === "drive") this.drive = value;
      if (type === "level") this.level = value;
    };
  }
  process(inputs, outputs, _parameters) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const input = inputs[0];
    for (let channel = 0; channel < output.length; channel++) {
      const outChan = output[channel];
      const inChan = input && input.length > channel ? input[channel] : outChan;
      for (let i = 0; i < outChan.length; i++) {
        let sample = inChan[i];
        sample = Math.tanh(sample * this.drive);
        sample *= this.level;
        outChan[i] = Math.max(-1, Math.min(1, sample));
      }
    }
    return true;
  }
}
registerProcessor("pedalboard-processor", PedalboardProcessor);
`;

export async function registerPedalboardWorklet(
  audioCtx: AudioContext,
): Promise<boolean> {
  if (_workletRegistered) return true;
  if (!audioCtx.audioWorklet) {
    console.warn("AudioWorklet not supported");
    return false;
  }
  try {
    const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    await audioCtx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    _workletRegistered = true;
    return true;
  } catch (e) {
    console.warn("Failed to register pedalboard worklet:", e);
    return false;
  }
}

export function createPedalboardNode(
  ctx: AudioContext,
  drive?: number,
  level?: number,
): AudioWorkletNode {
  const node = new AudioWorkletNode(ctx, "pedalboard-processor");
  if (drive !== undefined) node.port.postMessage({ type: "drive", value: drive });
  if (level !== undefined) node.port.postMessage({ type: "level", value: level });
  return node;
}

export function createOverdriveFactory(
  drive: number,
  level: number,
): AudioNodeFactory {
  return (ctx: AudioContext) => createPedalboardNode(ctx, drive, level);
}

export function createDelayNode(ctx: AudioContext): AudioNode {
  const delay = ctx.createDelay(2);
  delay.delayTime.value = 0.3;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.3;
  delay.connect(feedback);
  feedback.connect(delay);
  return delay;
}

export function createChorusNode(ctx: AudioContext): AudioNode {
  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = 0.015;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 1.5;

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.005;

  lfo.connect(lfoGain);
  lfoGain.connect(delay.delayTime);
  lfo.start();

  const mix = ctx.createGain();
  mix.gain.value = 0.5;

  delay.connect(mix);
  return mix;
}

export function createTremoloNode(ctx: AudioContext): GainNode {
  const gain = ctx.createGain();
  gain.gain.value = 0.5;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 5;

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.5;

  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();

  return gain;
}

export function connectPedalChain(
  graph: AudioNodeGraph,
  pedals: { id: string; name: string; type: string; enabled: boolean; params: Record<string, number> }[],
): void {
  for (const pedal of pedals) {
    const factory = pedalFactoryForType(pedal.type, pedal.params);
    if (factory) {
      graph.addPlugin(pedal.id, pedal.name, factory);
      graph.togglePlugin(pedal.id, pedal.enabled);
    }
  }
}

function pedalFactoryForType(
  type: string,
  params: Record<string, number>,
): AudioNodeFactory | null {
  switch (type) {
    case "overdrive":
    case "distortion":
    case "fuzz":
      return createOverdriveFactory(
        params.drive ?? 50,
        params.level ?? params.output ?? 50,
      );
    case "delay":
      return (ctx: AudioContext) => createDelayNode(ctx);
    case "chorus":
    case "flanger":
      return (ctx: AudioContext) => createChorusNode(ctx);
    case "tremolo":
    case "vibrato":
      return (ctx: AudioContext) => createTremoloNode(ctx);
    case "boost":
      return (ctx: AudioContext) => {
        const g = ctx.createGain();
        g.gain.value = 1 + (params.gain ?? 0) / 100;
        return g;
      };
    default:
      return null;
  }
}
