import { Platform } from "react-native";

const NOTE_FREQS: number[] = [];
for (let i = 0; i < 128; i++) {
  NOTE_FREQS[i] = 440 * Math.pow(2, (i - 69) / 12);
}

export interface OscillatorConfig {
  type: OscillatorType;
  detune: number;
  octave: number;
  level: number;
}

export interface FilterConfig {
  type: BiquadFilterType;
  frequency: number;
  resonance: number;
  envelope: number;
}

export interface EnvelopeConfig {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface LfoConfig {
  rate: number;
  depth: number;
  target: "pitch" | "filter" | "amp";
}

export interface SubtractiveSynthConfig {
  osc1: OscillatorConfig;
  osc2: OscillatorConfig;
  filter: FilterConfig;
  ampEnvelope: EnvelopeConfig;
  filterEnvelope: EnvelopeConfig;
  lfo: LfoConfig;
  volume: number;
}

export const DEFAULT_SYNTH_CONFIG: SubtractiveSynthConfig = {
  osc1: { type: "sawtooth", detune: 0, octave: 0, level: 0.7 },
  osc2: { type: "square", detune: -5, octave: -1, level: 0.3 },
  filter: { type: "lowpass", frequency: 2000, resonance: 1, envelope: 50 },
  ampEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3 },
  filterEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.2 },
  lfo: { rate: 0, depth: 0, target: "pitch" },
  volume: 0.5,
};

interface ActiveVoice {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  osc1Gain: GainNode;
  osc2Gain: GainNode;
  filter: BiquadFilterNode;
  filterGain: GainNode;
  ampGain: GainNode;
  lfoNode: OscillatorNode | null;
  lfoGain: GainNode | null;
  note: number;
  released: boolean;
}

let audioCtx: AudioContext | null = null;
const voices: Map<string, ActiveVoice> = new Map();
const MAX_VOICES = 16;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

function noteOn(
  note: number,
  velocity: number,
  config: SubtractiveSynthConfig,
): string {
  const ctx = getAudioContext();
  if (!ctx) return "";

  if (voices.size >= MAX_VOICES) {
    const oldest = voices.keys().next().value;
    if (oldest) {
      const v = voices.get(oldest);
      if (v) {
        try { v.osc1.stop(); } catch {}
        try { v.osc2.stop(); } catch {}
        if (v.lfoNode) try { v.lfoNode.stop(); } catch {}
        voices.delete(oldest);
      }
    }
  }

  const freq = NOTE_FREQS[note] || 440;
  const vol = Math.max(0.01, velocity / 127) * config.volume;
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  osc1.type = config.osc1.type;
  osc1.detune.setValueAtTime(config.osc1.detune, now);
  osc1.frequency.setValueAtTime(
    freq * Math.pow(2, config.osc1.octave),
    now,
  );

  const osc2 = ctx.createOscillator();
  osc2.type = config.osc2.type;
  osc2.detune.setValueAtTime(config.osc2.detune, now);
  osc2.frequency.setValueAtTime(
    freq * Math.pow(2, config.osc2.octave),
    now,
  );

  const osc1Gain = ctx.createGain();
  osc1Gain.gain.setValueAtTime(config.osc1.level, now);

  const osc2Gain = ctx.createGain();
  osc2Gain.gain.setValueAtTime(config.osc2.level, now);

  const filter = ctx.createBiquadFilter();
  filter.type = config.filter.type;
  filter.Q.setValueAtTime(config.filter.resonance, now);

  const filterFreq = config.filter.frequency;
  filter.frequency.setValueAtTime(filterFreq * 0.1, now);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(20, filterFreq),
    now + config.filterEnvelope.attack,
  );
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(20, filterFreq * config.filterEnvelope.sustain),
    now + config.filterEnvelope.attack + config.filterEnvelope.decay,
  );

  const filterGain = ctx.createGain();
  filterGain.gain.setValueAtTime(1, now);

  const ampGain = ctx.createGain();
  ampGain.gain.setValueAtTime(0, now);
  ampGain.gain.linearRampToValueAtTime(vol, now + config.ampEnvelope.attack);
  ampGain.gain.linearRampToValueAtTime(
    vol * config.ampEnvelope.sustain,
    now + config.ampEnvelope.attack + config.ampEnvelope.decay,
  );

  let lfoNode: OscillatorNode | null = null;
  let lfoGain: GainNode | null = null;

  if (config.lfo.depth > 0 && config.lfo.rate > 0) {
    lfoNode = ctx.createOscillator();
    lfoNode.type = "sine";
    lfoNode.frequency.setValueAtTime(config.lfo.rate, now);

    lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(config.lfo.depth, now);

    if (config.lfo.target === "pitch") {
      lfoNode.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);
    } else if (config.lfo.target === "filter") {
      lfoNode.connect(lfoGain);
      lfoGain.connect(filter.frequency);
    } else {
      lfoNode.connect(lfoGain);
      lfoGain.connect(ampGain.gain);
    }
    lfoNode.start(now);
  }

  osc1.connect(osc1Gain);
  osc2.connect(osc2Gain);
  osc1Gain.connect(filter);
  osc2Gain.connect(filter);
  filter.connect(filterGain);
  filterGain.connect(ampGain);
  ampGain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);

  const id = `synth-${note}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  voices.set(id, {
    osc1,
    osc2,
    osc1Gain,
    osc2Gain,
    filter,
    filterGain,
    ampGain,
    lfoNode,
    lfoGain,
    note,
    released: false,
  });

  return id;
}

function noteOff(id: string, config: SubtractiveSynthConfig): void {
  const voice = voices.get(id);
  if (!voice || voice.released) return;
  voice.released = true;

  const ctx = getAudioContext();
  if (!ctx) {
    try { voice.osc1.stop(); } catch {}
    try { voice.osc2.stop(); } catch {}
    if (voice.lfoNode) try { voice.lfoNode.stop(); } catch {}
    voices.delete(id);
    return;
  }

  const now = ctx.currentTime;
  const release = config.ampEnvelope.release;

  voice.ampGain.gain.cancelScheduledValues(now);
  voice.ampGain.gain.setValueAtTime(voice.ampGain.gain.value, now);
  voice.ampGain.gain.exponentialRampToValueAtTime(0.001, now + release);

  voice.filter.frequency.cancelScheduledValues(now);
  voice.filter.frequency.setValueAtTime(voice.filter.frequency.value, now);
  voice.filter.frequency.exponentialRampToValueAtTime(
    20,
    now + config.filterEnvelope.release,
  );

  setTimeout(() => {
    try { voice.osc1.stop(); } catch {}
    try { voice.osc2.stop(); } catch {}
    if (voice.lfoNode) try { voice.lfoNode.stop(); } catch {}
    voices.delete(id);
  }, (release + 0.1) * 1000);
}

function stopAll(config: SubtractiveSynthConfig): void {
  for (const [id] of voices) {
    noteOff(id, config);
  }
}

export interface SubtractiveSynth {
  noteOn: (note: number, velocity: number) => string;
  noteOff: (id: string) => void;
  stopAll: () => void;
  setConfig: (config: Partial<SubtractiveSynthConfig>) => void;
  getConfig: () => SubtractiveSynthConfig;
  dispose: () => void;
}

export function createSubtractiveSynth(
  initialConfig: Partial<SubtractiveSynthConfig> = {},
): SubtractiveSynth {
  let config: SubtractiveSynthConfig = {
    ...DEFAULT_SYNTH_CONFIG,
    ...initialConfig,
  };

  return {
    noteOn: (note: number, velocity: number) => noteOn(note, velocity, config),
    noteOff: (id: string) => noteOff(id, config),
    stopAll: () => stopAll(config),
    setConfig: (partial: Partial<SubtractiveSynthConfig>) => {
      config = { ...config, ...partial };
    },
    getConfig: () => config,
    dispose: () => {
      stopAll(config);
    },
  };
}

export const SUBTRACTIVE_PRESETS: Record<string, Partial<SubtractiveSynthConfig>> = {
  "Init Saw": DEFAULT_SYNTH_CONFIG,
  "Fat Bass": {
    osc1: { type: "sawtooth", detune: 0, octave: 0, level: 0.8 },
    osc2: { type: "sawtooth", detune: 7, octave: 0, level: 0.6 },
    filter: { type: "lowpass", frequency: 800, resonance: 4, envelope: 30 },
    ampEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.8, release: 0.1 },
    filterEnvelope: { attack: 0.005, decay: 0.4, sustain: 0.3, release: 0.1 },
  },
  "Soft Pad": {
    osc1: { type: "sine", detune: 0, octave: 0, level: 0.6 },
    osc2: { type: "triangle", detune: 5, octave: 1, level: 0.4 },
    filter: { type: "lowpass", frequency: 3000, resonance: 0.5, envelope: 10 },
    ampEnvelope: { attack: 0.5, decay: 0.5, sustain: 0.6, release: 1.0 },
    filterEnvelope: { attack: 0.3, decay: 0.5, sustain: 0.5, release: 0.5 },
  },
  "Pluck": {
    osc1: { type: "square", detune: 0, octave: 0, level: 0.7 },
    osc2: { type: "sawtooth", detune: -3, octave: 0, level: 0.3 },
    filter: { type: "lowpass", frequency: 5000, resonance: 3, envelope: 70 },
    ampEnvelope: { attack: 0.001, decay: 0.15, sustain: 0.1, release: 0.1 },
    filterEnvelope: { attack: 0.001, decay: 0.2, sustain: 0.1, release: 0.1 },
  },
  "Wobble": {
    osc1: { type: "sawtooth", detune: 0, octave: 0, level: 0.8 },
    osc2: { type: "square", detune: 0, octave: 0, level: 0.4 },
    filter: { type: "lowpass", frequency: 1500, resonance: 8, envelope: 40 },
    ampEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.2 },
    filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.2 },
    lfo: { rate: 4, depth: 800, target: "filter" },
  },
  "Scream Lead": {
    osc1: { type: "sawtooth", detune: 0, octave: 0, level: 0.7 },
    osc2: { type: "sawtooth", detune: 10, octave: 0, level: 0.5 },
    filter: { type: "lowpass", frequency: 4000, resonance: 6, envelope: 50 },
    ampEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.8, release: 0.15 },
    filterEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.1 },
    lfo: { rate: 5, depth: 20, target: "pitch" },
  },
};
