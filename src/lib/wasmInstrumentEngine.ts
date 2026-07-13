export interface WasmInstrumentMessage {
  type: "noteOn" | "noteOff" | "cc" | "pitchBend" | "polyPressure" | "programChange" | "allNotesOff";
  note?: number;
  velocity?: number;
  cc?: number;
  value?: number;
  program?: number;
  timestamp?: number;
}

export interface VoiceState {
  note: number;
  velocity: number;
  frequency: number;
  ampEnvelope: number;
  filterEnvelope: number;
  startTime: number;
  active: boolean;
  osc1Phase: number;
  osc2Phase: number;
  filterState: number;
}

export interface InstrumentPreset {
  name: string;
  osc1Type: "sawtooth" | "square" | "triangle" | "sine";
  osc2Type: "sawtooth" | "square" | "triangle" | "sine";
  osc2Detune: number;
  osc2Level: number;
  filterCutoff: number;
  filterResonance: number;
  filterEnvAmount: number;
  ampAttack: number;
  ampDecay: number;
  ampSustain: number;
  ampRelease: number;
  filterAttack: number;
  filterDecay: number;
  filterSustain: number;
  filterRelease: number;
  volume: number;
  glideTime: number;
  voices: number;
}

export const INSTRUMENT_PRESETS: InstrumentPreset[] = [
  {
    name: "Init Saw",
    osc1Type: "sawtooth", osc2Type: "sawtooth", osc2Detune: 0, osc2Level: 0.5,
    filterCutoff: 8000, filterResonance: 1, filterEnvAmount: 0,
    ampAttack: 0.01, ampDecay: 0.2, ampSustain: 0.8, ampRelease: 0.3,
    filterAttack: 0.01, filterDecay: 0.3, filterSustain: 0.5, filterRelease: 0.5,
    volume: 0.7, glideTime: 0, voices: 16,
  },
  {
    name: "Fat Bass",
    osc1Type: "sawtooth", osc2Type: "square", osc2Detune: -12, osc2Level: 0.6,
    filterCutoff: 1200, filterResonance: 6, filterEnvAmount: 2000,
    ampAttack: 0.005, ampDecay: 0.3, ampSustain: 0.6, ampRelease: 0.2,
    filterAttack: 0.005, filterDecay: 0.4, filterSustain: 0.3, filterRelease: 0.3,
    volume: 0.8, glideTime: 0.05, voices: 8,
  },
  {
    name: "Soft Pad",
    osc1Type: "triangle", osc2Type: "sine", osc2Detune: 7, osc2Level: 0.7,
    filterCutoff: 3000, filterResonance: 2, filterEnvAmount: 500,
    ampAttack: 0.5, ampDecay: 1.0, ampSustain: 0.7, ampRelease: 2.0,
    filterAttack: 0.3, filterDecay: 0.8, filterSustain: 0.6, filterRelease: 1.5,
    volume: 0.6, glideTime: 0, voices: 16,
  },
  {
    name: "Pluck",
    osc1Type: "sawtooth", osc2Type: "square", osc2Detune: 0, osc2Level: 0.3,
    filterCutoff: 6000, filterResonance: 4, filterEnvAmount: 5000,
    ampAttack: 0.001, ampDecay: 0.15, ampSustain: 0.0, ampRelease: 0.1,
    filterAttack: 0.001, filterDecay: 0.1, filterSustain: 0.0, filterRelease: 0.1,
    volume: 0.7, glideTime: 0, voices: 8,
  },
  {
    name: "Wobble",
    osc1Type: "sawtooth", osc2Type: "square", osc2Detune: -5, osc2Level: 0.5,
    filterCutoff: 2000, filterResonance: 10, filterEnvAmount: 3000,
    ampAttack: 0.01, ampDecay: 0.3, ampSustain: 0.7, ampRelease: 0.3,
    filterAttack: 0.01, filterDecay: 0.5, filterSustain: 0.5, filterRelease: 0.5,
    volume: 0.7, glideTime: 0.02, voices: 8,
  },
  {
    name: "Orchestral",
    osc1Type: "sawtooth", osc2Type: "triangle", osc2Detune: 8, osc2Level: 0.6,
    filterCutoff: 4000, filterResonance: 1.5, filterEnvAmount: 1500,
    ampAttack: 0.15, ampDecay: 0.6, ampSustain: 0.8, ampRelease: 1.2,
    filterAttack: 0.1, filterDecay: 0.6, filterSustain: 0.6, filterRelease: 1.0,
    volume: 0.65, glideTime: 0.03, voices: 12,
  },
];

const NOTE_FREQS: number[] = [];
for (let i = 0; i < 128; i++) {
  NOTE_FREQS[i] = 440 * Math.pow(2, (i - 69) / 12);
}

function getOscSample(type: string, phase: number): number {
  const p = phase % 1;
  switch (type) {
    case "sine": return Math.sin(p * 2 * Math.PI);
    case "square": return p < 0.5 ? 1 : -1;
    case "sawtooth": return 2 * p - 1;
    case "triangle": return 4 * Math.abs(p - 0.5) - 1;
    default: return 0;
  }
}

function simpleFilter(input: number, cutoff: number, _resonance: number, state: number): number {
  const fc = Math.sin(Math.PI * cutoff / sampleRate);

  const output = fc * fc * input + 2 * fc * fc * state - (fc * fc - 1) * state;
  return Math.max(-1, Math.min(1, output));
}

let sampleRate = 44100;

function processVoice(
  voice: VoiceState,
  preset: InstrumentPreset,
  numSamples: number,
): Float32Array {
  const output = new Float32Array(numSamples);
  const freq = NOTE_FREQS[voice.note] ?? 440;

  for (let i = 0; i < numSamples; i++) {
    const dt = 1 / sampleRate;
    const elapsed = voice.startTime + i * dt;

    let ampEnv = 0;
    if (elapsed < preset.ampAttack) {
      ampEnv = elapsed / preset.ampAttack;
    } else if (elapsed < preset.ampAttack + preset.ampDecay) {
      const t = (elapsed - preset.ampAttack) / preset.ampDecay;
      ampEnv = 1 - (1 - preset.ampSustain) * t;
    } else {
      ampEnv = preset.ampSustain;
    }

    let filterEnv = 0;
    if (elapsed < preset.filterAttack) {
      filterEnv = elapsed / preset.filterAttack;
    } else if (elapsed < preset.filterAttack + preset.filterDecay) {
      const t = (elapsed - preset.filterAttack) / preset.filterDecay;
      filterEnv = 1 - (1 - preset.filterSustain) * t;
    } else {
      filterEnv = preset.filterSustain;
    }

    const filterCutoff = preset.filterCutoff + filterEnv * preset.filterEnvAmount;

    voice.osc1Phase += freq / sampleRate;
    voice.osc2Phase += freq * Math.pow(2, preset.osc2Detune / 12) / sampleRate;

    const osc1 = getOscSample(preset.osc1Type, voice.osc1Phase);
    const osc2 = getOscSample(preset.osc2Type, voice.osc2Phase) * preset.osc2Level;
    const mixed = (osc1 + osc2) / (1 + preset.osc2Level);

    voice.filterState = simpleFilter(mixed, filterCutoff, preset.filterResonance, voice.filterState);

    output[i] = voice.filterState * ampEnv * preset.volume;
  }

  return output;
}

export interface UnifiedInstrumentEngine {
  setPreset(preset: InstrumentPreset): void;
  getPreset(): InstrumentPreset;
  noteOn(note: number, velocity: number): void;
  noteOff(note: number): void;
  cc(control: number, value: number): void;
  pitchBend(value: number): void;
  render(output: Float32Array, numSamples: number): void;
  dispose(): void;
}

export function createUnifiedInstrumentEngine(
  preset: InstrumentPreset = INSTRUMENT_PRESETS[0],
): UnifiedInstrumentEngine {
  let currentPreset = { ...preset };
  const activeVoices = new Map<number, VoiceState>();
  let maxVoices = preset.voices;

  function getVoices(): VoiceState[] {
    return Array.from(activeVoices.values()).sort((a, b) => a.startTime - b.startTime);
  }

  function stealVoice(): void {
    const voices = getVoices();
    if (voices.length >= maxVoices) {
      const oldest = voices[0];
      activeVoices.delete(oldest.note);
    }
  }

  return {
    setPreset(p: InstrumentPreset) {
      currentPreset = { ...p };
      maxVoices = p.voices;
    },
    getPreset() {
      return { ...currentPreset };
    },
    noteOn(note: number, velocity: number) {
      if (activeVoices.has(note)) {
        activeVoices.delete(note);
      }
      stealVoice();

      const freq = NOTE_FREQS[note] ?? 440;
      activeVoices.set(note, {
        note,
        velocity,
        frequency: freq,
        ampEnvelope: 0,
        filterEnvelope: 0,
        startTime: 0,
        active: true,
        osc1Phase: 0,
        osc2Phase: 0,
        filterState: 0,
      });
    },
    noteOff(note: number) {
      activeVoices.delete(note);
    },
    cc(control: number, value: number) {
      const normalized = value / 127;
      switch (control) {
        case 1: break;
        case 7: currentPreset.volume = normalized; break;
        case 74: currentPreset.filterCutoff = normalized * 12000; break;
        case 71: currentPreset.filterResonance = normalized * 20; break;
      }
    },
    pitchBend(_value: number) {
    },
    render(output: Float32Array, numSamples: number) {
      output.fill(0);

      for (const [, voice] of activeVoices) {
        const rendered = processVoice(voice, currentPreset, numSamples);
        for (let i = 0; i < numSamples; i++) {
          output[i] += rendered[i] * (voice.velocity / 127);
        }
      }

      for (let i = 0; i < numSamples; i++) {
        output[i] = Math.max(-1, Math.min(1, output[i]));
      }
    },
    dispose() {
      activeVoices.clear();
    },
  };
}

export function createWasmInstrumentWorkletNode(
  ctx: AudioContext,
): AudioWorkletNode {
  const code = `
    class WasmInstrumentProcessor extends AudioWorkletProcessor {
      constructor() {
        super();
        this._voices = new Map();
        this._preset = ${JSON.stringify(INSTRUMENT_PRESETS[0])};
        this._pitchBend = 0;
        this._noteFreqs = new Float32Array(128);
        for (let i = 0; i < 128; i++) {
          this._noteFreqs[i] = 440 * Math.pow(2, (i - 69) / 12);
        }

        this.port.onmessage = (e) => {
          const msg = e.data;
          switch (msg.type) {
            case "noteOn":
              this._voices.set(msg.note, {
                note: msg.note,
                velocity: msg.velocity,
                osc1Phase: 0,
                osc2Phase: 0,
                filterState: 0,
                age: 0,
              });
              break;
            case "noteOff":
              this._voices.delete(msg.note);
              break;
            case "cc":
              if (msg.cc === 74) this._preset.filterCutoff = (msg.value / 127) * 12000;
              if (msg.cc === 71) this._preset.filterResonance = (msg.value / 127) * 20;
              if (msg.cc === 7) this._preset.volume = msg.value / 127;
              break;
            case "pitchBend":
              this._pitchBend = (msg.value - 8192) / 8192;
              break;
            case "preset":
              this._preset = msg.preset;
              break;
          }
        };
      }

      _getOsc(type, phase) {
        const p = phase % 1;
        switch (type) {
          case "sine": return Math.sin(p * 6.2831853);
          case "square": return p < 0.5 ? 1 : -1;
          case "sawtooth": return 2 * p - 1;
          case "triangle": return 4 * Math.abs(p - 0.5) - 1;
          default: return 0;
        }
      }

      _filter(input, cutoff, resonance, state) {
        const fc = Math.sin(3.14159 * cutoff / sampleRate);
        const q = 1 / (1 + resonance * 0.5);
        const f = 1 / (1 + (1/q) * fc + fc * fc);
        const out = fc * fc * input + 2 * fc * fc * state - (fc * fc - 1) * state;
        return Math.max(-1, Math.min(1, out));
      }

      process(inputs, outputs) {
        const output = outputs[0];
        if (!output || !output[0]) return true;
        const ch0 = output[0];
        const n = ch0.length;

        ch0.fill(0);

        for (const [note, voice] of this._voices) {
          const freq = this._noteFreqs[note] * Math.pow(2, this._pitchBend);
          const dt = 1 / sampleRate;

          for (let i = 0; i < n; i++) {
            voice.osc1Phase += freq * dt;
            voice.osc2Phase += freq * Math.pow(2, this._preset.osc2Detune / 12) * dt;

            const osc1 = this._getOsc(this._preset.osc1Type, voice.osc1Phase);
            const osc2 = this._getOsc(this._preset.osc2Type, voice.osc2Phase) * this._preset.osc2Level;
            const mixed = (osc1 + osc2) / (1 + this._preset.osc2Level);

            voice.filterState = this._filter(mixed, this._preset.filterCutoff, this._preset.filterResonance, voice.filterState);
            ch0[i] += voice.filterState * this._preset.volume * (voice.velocity / 127);
          }
        }

        for (let i = 0; i < n; i++) {
          ch0[i] = Math.max(-1, Math.min(1, ch0[i]));
        }

        for (let ch = 1; ch < output.length; ch++) {
          output[ch].set(ch0);
        }

        return true;
      }
    }

    registerProcessor("wasm-instrument-processor", WasmInstrumentProcessor);
  `;

  const blob = new Blob([code], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const node = new AudioWorkletNode(ctx, "wasm-instrument-processor", {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2],
  });
  URL.revokeObjectURL(url);
  return node;
}
