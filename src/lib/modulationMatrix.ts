import { Platform } from "react-native";

export type ModSource =
  | "lfo1"
  | "lfo2"
  | "env1"
  | "env2"
  | "macro1"
  | "macro2"
  | "macro3"
  | "macro4"
  | "velocity"
  | "noteNumber"
  | "random";

export type ModTarget =
  | "filter.cutoff"
  | "filter.resonance"
  | "amp.gain"
  | "osc1.detune"
  | "osc2.detune"
  | "osc1.pitch"
  | "osc2.pitch"
  | "lfo1.rate"
  | "lfo2.rate"
  | "pan.position"
  | "volume";

export interface ModRoute {
  id: string;
  source: ModSource;
  target: ModTarget;
  amount: number;
  bipolar: boolean;
  enabled: boolean;
}

export interface LfoConfig {
  rate: number;
  depth: number;
  waveform: "sine" | "triangle" | "sawtooth" | "square" | "random";
  phase: number;
}

export interface EnvelopeConfig {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface MacroConfig {
  value: number;
  name: string;
  attachedParams: string[];
}

export interface ModulationState {
  routes: ModRoute[];
  lfo1: LfoConfig;
  lfo2: LfoConfig;
  env1: EnvelopeConfig;
  env2: EnvelopeConfig;
  macros: MacroConfig[];
}

const DEFAULT_MOD_STATE: ModulationState = {
  routes: [],
  lfo1: { rate: 1, depth: 1, waveform: "sine", phase: 0 },
  lfo2: { rate: 0.5, depth: 1, waveform: "triangle", phase: 0 },
  env1: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3 },
  env2: { attack: 0.1, decay: 0.5, sustain: 0.5, release: 0.5 },
  macros: [
    { value: 0, name: "Macro 1", attachedParams: [] },
    { value: 0, name: "Macro 2", attachedParams: [] },
    { value: 0, name: "Macro 3", attachedParams: [] },
    { value: 0, name: "Macro 4", attachedParams: [] },
  ],
};

function generateLfo(
  config: LfoConfig,
  time: number,
): number {
  const phase = (time * config.rate + config.phase) % 1;
  const t = phase * Math.PI * 2;

  switch (config.waveform) {
    case "sine":
      return Math.sin(t) * config.depth;
    case "triangle":
      return (2 * Math.abs(2 * phase - 1) - 1) * config.depth;
    case "sawtooth":
      return (2 * phase - 1) * config.depth;
    case "square":
      return (phase < 0.5 ? 1 : -1) * config.depth;
    case "random": {
      const s = Math.sin(time * 12345.6789) * 43758.5453;
      return ((s - Math.floor(s)) * 2 - 1) * config.depth;
    }
    default:
      return 0;
  }
}

function generateEnvelope(
  config: EnvelopeConfig,
  noteOnTime: number,
  currentTime: number,
  gate: boolean,
): number {
  const elapsed = currentTime - noteOnTime;

  if (gate) {
    if (elapsed < config.attack) {
      return elapsed / config.attack;
    }
    if (elapsed < config.attack + config.decay) {
      const decayProgress = (elapsed - config.attack) / config.decay;
      return 1 - (1 - config.sustain) * decayProgress;
    }
    return config.sustain;
  }

  return 0;
}

let modulationState: ModulationState = { ...DEFAULT_MOD_STATE };
let lfoTime = 0;
let frameId: number | null = null;

const MOD_SOURCES: ModSource[] = [
  "lfo1", "lfo2", "env1", "env2",
  "macro1", "macro2", "macro3", "macro4",
  "velocity", "noteNumber", "random",
];

const MOD_TARGETS: ModTarget[] = [
  "filter.cutoff", "filter.resonance", "amp.gain",
  "osc1.detune", "osc2.detune", "osc1.pitch", "osc2.pitch",
  "lfo1.rate", "lfo2.rate", "pan.position", "volume",
];

export function getModSources(): ModSource[] {
  return MOD_SOURCES;
}

export function getModTargets(): ModTarget[] {
  return MOD_TARGETS;
}

export function getModulationState(): ModulationState {
  return JSON.parse(JSON.stringify(modulationState));
}

export function setModulationState(state: Partial<ModulationState>): void {
  modulationState = { ...modulationState, ...state };
}

export function addModRoute(
  source: ModSource,
  target: ModTarget,
  amount: number = 0.5,
  bipolar: boolean = false,
): ModRoute {
  const route: ModRoute = {
    id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source,
    target,
    amount,
    bipolar,
    enabled: true,
  };
  modulationState = {
    ...modulationState,
    routes: [...modulationState.routes, route],
  };
  return route;
}

export function removeModRoute(routeId: string): void {
  modulationState = {
    ...modulationState,
    routes: modulationState.routes.filter((r) => r.id !== routeId),
  };
}

export function updateModRoute(
  routeId: string,
  updates: Partial<ModRoute>,
): void {
  modulationState = {
    ...modulationState,
    routes: modulationState.routes.map((r) =>
      r.id === routeId ? { ...r, ...updates } : r,
    ),
  };
}

export function setMacroValue(macroIndex: number, value: number): void {
  const macros = [...modulationState.macros];
  if (macros[macroIndex]) {
    macros[macroIndex] = { ...macros[macroIndex], value: Math.max(0, Math.min(1, value)) };
    modulationState = { ...modulationState, macros };
  }
}

export function setMacroName(macroIndex: number, name: string): void {
  const macros = [...modulationState.macros];
  if (macros[macroIndex]) {
    macros[macroIndex] = { ...macros[macroIndex], name };
    modulationState = { ...modulationState, macros };
  }
}

export function attachParamToMacro(
  macroIndex: number,
  paramPath: string,
): void {
  const macros = [...modulationState.macros];
  if (macros[macroIndex]) {
    const attached = macros[macroIndex].attachedParams.includes(paramPath);
    if (!attached) {
      macros[macroIndex] = {
        ...macros[macroIndex],
        attachedParams: [...macros[macroIndex].attachedParams, paramPath],
      };
      modulationState = { ...modulationState, macros };
    }
  }
}

export function detachParamFromMacro(
  macroIndex: number,
  paramPath: string,
): void {
  const macros = [...modulationState.macros];
  if (macros[macroIndex]) {
    macros[macroIndex] = {
      ...macros[macroIndex],
      attachedParams: macros[macroIndex].attachedParams.filter((p) => p !== paramPath),
    };
    modulationState = { ...modulationState, macros };
  }
}

export function computeModulation(
  target: ModTarget,
  context: {
    time: number;
    noteOnTime?: number;
    gate?: boolean;
    velocity?: number;
    noteNumber?: number;
  },
): number {
  let total = 0;

  for (const route of modulationState.routes) {
    if (!route.enabled || route.target !== target) continue;

    let sourceValue = 0;

    switch (route.source) {
      case "lfo1":
        sourceValue = generateLfo(modulationState.lfo1, context.time);
        break;
      case "lfo2":
        sourceValue = generateLfo(modulationState.lfo2, context.time);
        break;
      case "env1":
        if (context.noteOnTime !== undefined) {
          sourceValue = generateEnvelope(
            modulationState.env1,
            context.noteOnTime,
            context.time,
            context.gate ?? true,
          );
        }
        break;
      case "env2":
        if (context.noteOnTime !== undefined) {
          sourceValue = generateEnvelope(
            modulationState.env2,
            context.noteOnTime,
            context.time,
            context.gate ?? true,
          );
        }
        break;
      case "macro1":
        sourceValue = modulationState.macros[0]?.value ?? 0;
        break;
      case "macro2":
        sourceValue = modulationState.macros[1]?.value ?? 0;
        break;
      case "macro3":
        sourceValue = modulationState.macros[2]?.value ?? 0;
        break;
      case "macro4":
        sourceValue = modulationState.macros[3]?.value ?? 0;
        break;
      case "velocity":
        sourceValue = (context.velocity ?? 64) / 127;
        break;
      case "noteNumber":
        sourceValue = ((context.noteNumber ?? 60) - 36) / 72;
        break;
      case "random":
        sourceValue = Math.random() * 2 - 1;
        break;
    }

    if (route.bipolar) {
      total += sourceValue * route.amount;
    } else {
      total += (sourceValue * 0.5 + 0.5) * route.amount;
    }
  }

  return Math.max(-1, Math.min(1, total));
}

export function startModulationEngine(): void {
  if (Platform.OS !== "web") return;
  lfoTime = 0;

  function tick(): void {
    lfoTime += 1 / 60;
    frameId = requestAnimationFrame(tick);
  }
  frameId = requestAnimationFrame(tick);
}

export function stopModulationEngine(): void {
  if (frameId !== null) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
  lfoTime = 0;
}

export function disposeModulationMatrix(): void {
  stopModulationEngine();
  modulationState = { ...DEFAULT_MOD_STATE };
}
