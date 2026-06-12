export type EqBandType = 0 | 1 | 2 | 3 | 4 | 5;
export const EQ_BAND_TYPES = ['lowCut', 'lowShelf', 'peak', 'notch', 'highShelf', 'highCut'] as const;
export const EQ_BAND_LABELS: Record<number, string> = {
  0: 'LC', 1: 'LS', 2: 'PK', 3: 'NT', 4: 'HS', 5: 'HC',
};

export type PluginType =
  | 'eq' | 'compressor' | 'limiter' | 'distortion' | 'reverb' | 'delay'
  | 'filter' | 'modulation' | 'utility'
  | 'multibandCompressor' | 'stereoImager' | 'deesser' | 'tapeSaturator' | 'truePeakLimiter';

export interface PluginParamSpec {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

export interface PluginTypeSpec {
  params: PluginParamSpec[];
  presets: { name: string; values: Record<string, number> }[];
}

export interface Plugin {
  id: string;
  name: string;
  type: PluginType;
  enabled: boolean;
  params: Record<string, number>;
  color?: string;
}

export interface MixSnapshot {
  id: string;
  name: string;
  created: number;
  trackVolumes: Record<string, number>;
  trackMutes: Record<string, boolean>;
  trackSolos: Record<string, boolean>;
  plugins: Record<string, Plugin[]>;
}

export interface MetronomeSettings {
  bpm: number;
  timeSig: [number, number];
  accentInterval: number;
  volume: number;
  enabled: boolean;
  countIn: boolean;
  countInBars: number;
}

export interface RecordSettings {
  armed: boolean;
  inputSource: 'mic' | 'line' | 'virtual';
  quality: 'low' | 'medium' | 'high' | 'lossless';
  sampleRate: 44100 | 48000 | 96000;
  mono: boolean;
  punchIn?: number;
  punchOut?: number;
  preRoll: number;
}

const EQ_DEFAULT_BANDS = [
  { freq: 30, gain: 0, q: 0.71, type: 3, enabled: 0 },
  { freq: 120, gain: 0, q: 0.71, type: 2, enabled: 0 },
  { freq: 500, gain: 0, q: 0.71, type: 2, enabled: 1 },
  { freq: 1500, gain: 0, q: 0.71, type: 2, enabled: 1 },
  { freq: 5000, gain: 0, q: 0.71, type: 2, enabled: 0 },
  { freq: 10000, gain: 0, q: 0.71, type: 4, enabled: 0 },
  { freq: 40, gain: 0, q: 0.71, type: 0, enabled: 0 },
  { freq: 18000, gain: 0, q: 0.71, type: 5, enabled: 0 },
];

function buildEqParams(bands?: { freq: number; gain: number; q: number; type: number; enabled: number }[]): Record<string, number> {
  const p: Record<string, number> = { master: 0 };
  const src = bands || EQ_DEFAULT_BANDS;
  for (let i = 0; i < 8; i++) {
    p[`b${i}_freq`] = src[i]?.freq ?? EQ_DEFAULT_BANDS[i].freq;
    p[`b${i}_gain`] = src[i]?.gain ?? EQ_DEFAULT_BANDS[i].gain;
    p[`b${i}_q`] = src[i]?.q ?? EQ_DEFAULT_BANDS[i].q;
    p[`b${i}_type`] = src[i]?.type ?? EQ_DEFAULT_BANDS[i].type;
    p[`b${i}_enabled`] = src[i]?.enabled ?? EQ_DEFAULT_BANDS[i].enabled;
  }
  return p;
}

function makeEqPreset(name: string, bands: { freq: number; gain: number; q: number; type: number; enabled: number }[]) {
  return { name, values: buildEqParams(bands) };
}

export const PLUGIN_SPECS: Record<PluginType, PluginTypeSpec> = {
  eq: {
    params: [
      { id: 'master', label: 'Master', min: -6, max: 6, step: 0.5, default: 0, unit: 'dB' },
      ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap(i => [
        { id: `b${i}_freq`, label: `B${i + 1} Freq`, min: 20, max: 20000, step: 1, default: EQ_DEFAULT_BANDS[i].freq, unit: 'Hz' },
        { id: `b${i}_gain`, label: `B${i + 1} Gain`, min: -18, max: 18, step: 0.5, default: EQ_DEFAULT_BANDS[i].gain, unit: 'dB' },
        { id: `b${i}_q`, label: `B${i + 1} Q`, min: 0.1, max: 10, step: 0.01, default: EQ_DEFAULT_BANDS[i].q },
        { id: `b${i}_type`, label: `B${i + 1} Type`, min: 0, max: 5, step: 1, default: EQ_DEFAULT_BANDS[i].type },
        { id: `b${i}_enabled`, label: `B${i + 1}`, min: 0, max: 1, step: 1, default: EQ_DEFAULT_BANDS[i].enabled },
      ] as PluginParamSpec[]),
    ],
    presets: [
      makeEqPreset('Flat', EQ_DEFAULT_BANDS),
      makeEqPreset('Presença', [
        { freq: 30, gain: 0, q: 0.71, type: 3, enabled: 0 },
        { freq: 120, gain: 0.5, q: 0.71, type: 1, enabled: 1 },
        { freq: 500, gain: -0.5, q: 0.71, type: 2, enabled: 1 },
        { freq: 2500, gain: 3, q: 1.2, type: 2, enabled: 1 },
        { freq: 6000, gain: 2, q: 0.9, type: 2, enabled: 1 },
        { freq: 10000, gain: 1, q: 0.71, type: 2, enabled: 0 },
        { freq: 40, gain: 0, q: 0.71, type: 0, enabled: 1 },
        { freq: 18000, gain: 0, q: 0.71, type: 5, enabled: 0 },
      ]),
      makeEqPreset('Soround', [
        { freq: 30, gain: 0, q: 0.71, type: 3, enabled: 0 },
        { freq: 120, gain: 0, q: 0.71, type: 2, enabled: 0 },
        { freq: 500, gain: -2, q: 1.5, type: 2, enabled: 1 },
        { freq: 1500, gain: -1.5, q: 1, type: 2, enabled: 1 },
        { freq: 3000, gain: 3, q: 1.2, type: 2, enabled: 1 },
        { freq: 6000, gain: 4, q: 1.5, type: 2, enabled: 1 },
        { freq: 40, gain: 0, q: 0.71, type: 0, enabled: 1 },
        { freq: 18000, gain: 0, q: 0.71, type: 5, enabled: 0 },
      ]),
      makeEqPreset('Aquecido', [
        { freq: 30, gain: 0, q: 0.71, type: 3, enabled: 0 },
        { freq: 80, gain: 2.5, q: 0.6, type: 1, enabled: 1 },
        { freq: 200, gain: 1.5, q: 0.8, type: 2, enabled: 1 },
        { freq: 500, gain: 0, q: 0.71, type: 2, enabled: 0 },
        { freq: 3000, gain: -1, q: 0.9, type: 2, enabled: 1 },
        { freq: 8000, gain: -2, q: 0.71, type: 2, enabled: 1 },
        { freq: 40, gain: 0, q: 0.71, type: 0, enabled: 1 },
        { freq: 18000, gain: -3, q: 0.71, type: 5, enabled: 1 },
      ]),
      makeEqPreset('Telefone', [
        { freq: 30, gain: 0, q: 0.71, type: 3, enabled: 1 },
        { freq: 80, gain: 0, q: 0.71, type: 0, enabled: 0 },
        { freq: 200, gain: 0, q: 0.71, type: 2, enabled: 0 },
        { freq: 500, gain: 0, q: 0.71, type: 2, enabled: 0 },
        { freq: 2000, gain: 0, q: 0.71, type: 2, enabled: 0 },
        { freq: 3000, gain: 0, q: 0.71, type: 5, enabled: 1 },
        { freq: 40, gain: 0, q: 0.71, type: 0, enabled: 1 },
        { freq: 18000, gain: 0, q: 0.71, type: 5, enabled: 1 },
      ]),
    ],
  },
  compressor: {
    params: [
      { id: 'threshold', label: 'Threshold', min: -60, max: 0, step: 0.5, default: -18, unit: 'dB' },
      { id: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.5, default: 4, unit: ':1' },
      { id: 'knee', label: 'Knee', min: 0, max: 10, step: 0.5, default: 3, unit: 'dB' },
      { id: 'attack', label: 'Attack', min: 0.1, max: 50, step: 0.1, default: 3, unit: 'ms' },
      { id: 'release', label: 'Release', min: 10, max: 1000, step: 10, default: 150, unit: 'ms' },
      { id: 'makeupGain', label: 'Make-Up', min: 0, max: 24, step: 0.5, default: 6, unit: 'dB' },
    ],
    presets: [
      { name: 'Neutro', values: { threshold: -18, ratio: 4, knee: 3, attack: 3, release: 150, makeupGain: 6 } },
      { name: 'Vocal', values: { threshold: -24, ratio: 3, knee: 5, attack: 2, release: 80, makeupGain: 8 } },
      { name: 'Bateria', values: { threshold: -30, ratio: 8, knee: 1, attack: 0.5, release: 60, makeupGain: 12 } },
      { name: 'Guitarra', values: { threshold: -20, ratio: 4, knee: 3, attack: 5, release: 200, makeupGain: 6 } },
      { name: 'Master Bus', values: { threshold: -14, ratio: 2, knee: 6, attack: 10, release: 100, makeupGain: 3 } },
    ],
  },
  limiter: {
    params: [
      { id: 'threshold', label: 'Threshold', min: -30, max: 0, step: 0.5, default: -6, unit: 'dB' },
      { id: 'ceiling', label: 'Ceiling', min: -6, max: 0, step: 0.1, default: -1, unit: 'dB' },
      { id: 'attack', label: 'Attack', min: 0.01, max: 5, step: 0.01, default: 0.5, unit: 'ms' },
      { id: 'release', label: 'Release', min: 10, max: 100, step: 5, default: 40, unit: 'ms' },
    ],
    presets: [
      { name: 'Transparente', values: { threshold: -6, ceiling: -1, attack: 0.5, release: 40 } },
      { name: 'Agressivo', values: { threshold: -12, ceiling: -0.5, attack: 0.1, release: 20 } },
      { name: 'Master Bus', values: { threshold: -8, ceiling: -0.3, attack: 0.3, release: 50 } },
    ],
  },
  distortion: {
    params: [
      { id: 'drive', label: 'Drive', min: 0, max: 24, step: 0.5, default: 6, unit: 'dB' },
      { id: 'tone', label: 'Tone', min: 0, max: 100, step: 1, default: 50, unit: '%' },
      { id: 'mix', label: 'Mix', min: 0, max: 100, step: 1, default: 70, unit: '%' },
    ],
    presets: [
      { name: 'Overdrive', values: { drive: 6, tone: 60, mix: 70 } },
      { name: 'Distortion', values: { drive: 15, tone: 40, mix: 85 } },
      { name: 'Fuzz', values: { drive: 24, tone: 30, mix: 100 } },
    ],
  },
  reverb: {
    params: [
      { id: 'decay', label: 'Decay', min: 0.1, max: 10, step: 0.1, default: 2.5, unit: 's' },
      { id: 'preDelay', label: 'Pré-Delay', min: 0, max: 100, step: 1, default: 20, unit: 'ms' },
      { id: 'damping', label: 'Damping', min: 0, max: 100, step: 1, default: 40, unit: '%' },
      { id: 'size', label: 'Size', min: 0, max: 100, step: 1, default: 60, unit: '%' },
      { id: 'mix', label: 'Mix', min: 0, max: 100, step: 1, default: 30, unit: '%' },
    ],
    presets: [
      { name: 'Hall', values: { decay: 3.5, preDelay: 30, damping: 30, size: 70, mix: 30 } },
      { name: 'Room', values: { decay: 1.2, preDelay: 10, damping: 50, size: 40, mix: 25 } },
      { name: 'Plate', values: { decay: 2, preDelay: 5, damping: 20, size: 50, mix: 35 } },
      { name: 'Spring', values: { decay: 1.5, preDelay: 0, damping: 60, size: 30, mix: 20 } },
      { name: 'Ambiente', values: { decay: 0.8, preDelay: 5, damping: 70, size: 25, mix: 15 } },
    ],
  },
  delay: {
    params: [
      { id: 'time', label: 'Tempo', min: 1, max: 2000, step: 1, default: 300, unit: 'ms' },
      { id: 'feedback', label: 'Feedback', min: 0, max: 100, step: 1, default: 35, unit: '%' },
      { id: 'mix', label: 'Mix', min: 0, max: 100, step: 1, default: 25, unit: '%' },
    ],
    presets: [
      { name: 'Slap', values: { time: 80, feedback: 15, mix: 30 } },
      { name: 'Ping-Pong', values: { time: 300, feedback: 40, mix: 25 } },
      { name: 'Dublagem', values: { time: 120, feedback: 20, mix: 20 } },
      { name: 'Cavernoso', values: { time: 600, feedback: 55, mix: 35 } },
    ],
  },
  filter: {
    params: [
      { id: 'freq', label: 'Frequência', min: 20, max: 20000, step: 1, default: 100, unit: 'Hz' },
      { id: 'resonance', label: 'Ressonância', min: 0, max: 100, step: 1, default: 0, unit: '%' },
      { id: 'mode', label: 'Modo', min: 0, max: 1, step: 1, default: 0 },
    ],
    presets: [
      { name: 'Low Cut 80Hz', values: { freq: 80, resonance: 0, mode: 0 } },
      { name: 'Low Cut 150Hz', values: { freq: 150, resonance: 0, mode: 0 } },
      { name: 'High Cut 8kHz', values: { freq: 8000, resonance: 0, mode: 1 } },
    ],
  },
  modulation: {
    params: [
      { id: 'rate', label: 'Rate', min: 0.1, max: 10, step: 0.1, default: 1.5, unit: 'Hz' },
      { id: 'depth', label: 'Profund.', min: 0, max: 100, step: 1, default: 40, unit: '%' },
      { id: 'mix', label: 'Mix', min: 0, max: 100, step: 1, default: 40, unit: '%' },
    ],
    presets: [
      { name: 'Chorus Suave', values: { rate: 0.8, depth: 30, mix: 35 } },
      { name: 'Chorus Forte', values: { rate: 2, depth: 60, mix: 50 } },
      { name: 'Flanger', values: { rate: 0.5, depth: 80, mix: 45 } },
    ],
  },
  utility: {
    params: [
      { id: 'gain', label: 'Ganho', min: -24, max: 24, step: 0.5, default: 0, unit: 'dB' },
      { id: 'pan', label: 'Pan', min: -100, max: 100, step: 1, default: 0, unit: '%' },
      { id: 'phase', label: 'Inverter Fase', min: 0, max: 1, step: 1, default: 0 },
    ],
    presets: [
      { name: 'Ganho +3dB', values: { gain: 3, pan: 0, phase: 0 } },
      { name: 'Ganho -6dB', values: { gain: -6, pan: 0, phase: 0 } },
      { name: 'Pan Esquerda', values: { gain: 0, pan: -50, phase: 0 } },
      { name: 'Pan Direita', values: { gain: 0, pan: 50, phase: 0 } },
    ],
  },
  multibandCompressor: {
    params: [
      ...[0, 1, 2].flatMap(b => [
        { id: `b${b}_cross`, label: `Cruz B${b + 1}`, min: 20, max: 20000, step: 1, default: [200, 2000, 20000][b], unit: 'Hz' },
        { id: `b${b}_threshold`, label: `Tresh B${b + 1}`, min: -60, max: 0, step: 0.5, default: [-24, -20, -22][b], unit: 'dB' },
        { id: `b${b}_ratio`, label: `Ratio B${b + 1}`, min: 1, max: 20, step: 0.5, default: [4, 3, 4][b], unit: ':1' },
        { id: `b${b}_attack`, label: `Atq B${b + 1}`, min: 0.1, max: 50, step: 0.1, default: [1, 3, 2][b], unit: 'ms' },
        { id: `b${b}_release`, label: `Rel B${b + 1}`, min: 10, max: 1000, step: 10, default: [60, 100, 80][b], unit: 'ms' },
        { id: `b${b}_makeup`, label: `MakeUp B${b + 1}`, min: 0, max: 24, step: 0.5, default: [6, 4, 5][b], unit: 'dB' },
        { id: `b${b}_mute`, label: `Mute B${b + 1}`, min: 0, max: 1, step: 1, default: 0 },
      ] as PluginParamSpec[]),
    ],
    presets: [
      { name: 'Master', values: {} },
      { name: 'Dynamics', values: { b0_cross: 200, b0_threshold: -28, b0_ratio: 5, b0_attack: 1, b0_release: 50, b0_makeup: 8, b1_cross: 2000, b1_threshold: -22, b1_ratio: 3, b1_attack: 5, b1_release: 100, b1_makeup: 4, b2_cross: 20000, b2_threshold: -20, b2_ratio: 4, b2_attack: 3, b2_release: 80, b2_makeup: 5 } },
      { name: 'De-essing', values: { b0_cross: 200, b0_threshold: -20, b0_ratio: 3, b0_attack: 2, b0_release: 80, b0_makeup: 3, b1_cross: 2000, b1_threshold: -18, b1_ratio: 2, b1_attack: 5, b1_release: 150, b1_makeup: 2, b2_cross: 20000, b2_threshold: -30, b2_ratio: 6, b2_attack: 0.5, b2_release: 30, b2_makeup: 4 } },
    ],
  },
  stereoImager: {
    params: [
      { id: 'width', label: 'Largura', min: 0, max: 200, step: 1, default: 100, unit: '%' },
      { id: 'midGain', label: 'Mid Gain', min: -12, max: 12, step: 0.5, default: 0, unit: 'dB' },
      { id: 'sideGain', label: 'Side Gain', min: -12, max: 12, step: 0.5, default: 0, unit: 'dB' },
      { id: 'monoCross', label: 'Mono Cruz', min: 20, max: 500, step: 1, default: 150, unit: 'Hz' },
      { id: 'balance', label: 'Balanço', min: -100, max: 100, step: 1, default: 0, unit: '%' },
    ],
    presets: [
      { name: 'Estéreo Normal', values: { width: 100, midGain: 0, sideGain: 0, monoCross: 150, balance: 0 } },
      { name: 'Largo', values: { width: 150, midGain: -0.5, sideGain: 2, monoCross: 200, balance: 0 } },
      { name: 'Mono', values: { width: 0, midGain: 0, sideGain: -12, monoCross: 20, balance: 0 } },
      { name: 'Mid Boost', values: { width: 80, midGain: 3, sideGain: -3, monoCross: 100, balance: 0 } },
    ],
  },
  deesser: {
    params: [
      { id: 'frequency', label: 'Frequência', min: 1000, max: 10000, step: 10, default: 6000, unit: 'Hz' },
      { id: 'threshold', label: 'Threshold', min: -40, max: 0, step: 0.5, default: -18, unit: 'dB' },
      { id: 'range', label: 'Range', min: 0, max: 24, step: 0.5, default: 12, unit: 'dB' },
      { id: 'mode', label: 'Modo', min: 0, max: 1, step: 1, default: 0 },
    ],
    presets: [
      { name: 'Suave', values: { frequency: 6000, threshold: -18, range: 8, mode: 0 } },
      { name: 'Médio', values: { frequency: 5000, threshold: -24, range: 12, mode: 0 } },
      { name: 'Agressivo', values: { frequency: 7000, threshold: -30, range: 18, mode: 1 } },
      { name: 'Voz Suave', values: { frequency: 4000, threshold: -16, range: 6, mode: 0 } },
    ],
  },
  tapeSaturator: {
    params: [
      { id: 'drive', label: 'Drive', min: 0, max: 24, step: 0.5, default: 4, unit: 'dB' },
      { id: 'warmth', label: 'Warmth', min: 0, max: 100, step: 1, default: 50, unit: '%' },
      { id: 'noise', label: 'Ruído', min: 0, max: 100, step: 1, default: 5, unit: '%' },
      { id: 'wow', label: 'Wow/Flutter', min: 0, max: 100, step: 1, default: 10, unit: '%' },
      { id: 'mix', label: 'Mix', min: 0, max: 100, step: 1, default: 60, unit: '%' },
    ],
    presets: [
      { name: 'Warm', values: { drive: 4, warmth: 50, noise: 3, wow: 5, mix: 60 } },
      { name: 'Tape Sat', values: { drive: 10, warmth: 60, noise: 8, wow: 15, mix: 75 } },
      { name: 'Lo-Fi', values: { drive: 18, warmth: 80, noise: 30, wow: 40, mix: 90 } },
      { name: 'Master Tape', values: { drive: 3, warmth: 40, noise: 2, wow: 3, mix: 40 } },
    ],
  },
  truePeakLimiter: {
    params: [
      { id: 'threshold', label: 'Threshold', min: -30, max: 0, step: 0.5, default: -3, unit: 'dB' },
      { id: 'ceiling', label: 'Ceiling', min: -6, max: 0, step: 0.1, default: -0.5, unit: 'dBTP' },
      { id: 'oversample', label: 'Oversampling', min: 0, max: 3, step: 1, default: 2 },
      { id: 'lookahead', label: 'Lookahead', min: 0.1, max: 10, step: 0.1, default: 1, unit: 'ms' },
      { id: 'release', label: 'Release', min: 10, max: 200, step: 5, default: 50, unit: 'ms' },
    ],
    presets: [
      { name: 'Transparente', values: { threshold: -3, ceiling: -0.5, oversample: 2, lookahead: 1, release: 50 } },
      { name: 'Seguro', values: { threshold: -6, ceiling: -1, oversample: 3, lookahead: 2, release: 80 } },
      { name: 'Máximo', values: { threshold: -1, ceiling: -0.1, oversample: 2, lookahead: 0.5, release: 30 } },
      { name: 'Broadcast', values: { threshold: -8, ceiling: -2, oversample: 3, lookahead: 3, release: 100 } },
    ],
  },
};

export function getDefaultParams(type: PluginType): Record<string, number> {
  const spec = PLUGIN_SPECS[type];
  const params: Record<string, number> = {};
  for (const p of spec.params) {
    params[p.id] = p.default;
  }
  return params;
}

export const PLUGIN_PRESETS: Partial<Plugin>[] = [
  { name: 'EQ Eight', type: 'eq', color: '#5ac8fa' },
  { name: 'Compressor', type: 'compressor', color: '#ff9500' },
  { name: 'Limiter', type: 'limiter', color: '#ff6482' },
  { name: 'Multiband Comp', type: 'multibandCompressor', color: '#bf5af2' },
  { name: 'Stereo Imager', type: 'stereoImager', color: '#00d4aa' },
  { name: 'DeEsser', type: 'deesser', color: '#ff9f0a' },
  { name: 'Tape Saturator', type: 'tapeSaturator', color: '#ff453a' },
  { name: 'True Peak Limiter', type: 'truePeakLimiter', color: '#ff375f' },
  { name: 'Distortion', type: 'distortion', color: '#ff375f' },
  { name: 'Reverb', type: 'reverb', color: '#64d2ff' },
  { name: 'Delay', type: 'delay', color: '#30d158' },
  { name: 'Filter', type: 'filter', color: '#bf5af2' },
  { name: 'Chorus', type: 'modulation', color: '#ff9f0a' },
  { name: 'Utility', type: 'utility', color: '#aeaeb2' },
];

export const PLUGIN_ICONS: Record<string, string> = {
  eq: '◈',
  compressor: '◉',
  limiter: '⊡',
  multibandCompressor: '◈',
  stereoImager: '⇔',
  deesser: '∿',
  tapeSaturator: '∾',
  truePeakLimiter: '⊡',
  distortion: '▲',
  reverb: '↗',
  delay: '↘',
  filter: '◀',
  modulation: '◐',
  utility: '≡',
};
