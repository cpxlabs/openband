import { applyMcuPreset } from "./mcu";

// ---------------------------------------------------------------------------
// Legacy per-plugin-parameter mapping API (used by PluginEditor + lib6 tests)
// ---------------------------------------------------------------------------

export interface MidiMapping {
  cc: number;
  pluginId: string;
  paramId: string;
  trackId: string;
}

export interface MidiLearnState {
  mappings: MidiMapping[];
  learningMode: boolean;
  activeTarget: { pluginId: string; paramId: string; trackId: string } | null;
}

const LEGACY_STORAGE_KEY = "openband_midi_learn";

export function processMidiCC(
  cc: number,
  value: number,
  state: MidiLearnState,
): { pluginId: string; paramId: string; trackId: string; normalizedValue: number } | null {
  const normalizedValue = value / 127;

  if (state.learningMode && state.activeTarget) {
    const existingIndex = state.mappings.findIndex(
      (m) =>
        m.pluginId === state.activeTarget!.pluginId &&
        m.paramId === state.activeTarget!.paramId &&
        m.trackId === state.activeTarget!.trackId,
    );

    if (existingIndex >= 0) {
      state.mappings[existingIndex] = {
        ...state.mappings[existingIndex],
        cc,
      };
    } else {
      state.mappings.push({
        cc,
        pluginId: state.activeTarget.pluginId,
        paramId: state.activeTarget.paramId,
        trackId: state.activeTarget.trackId,
      });
    }

    saveMappings(state.mappings);
    return null;
  }

  const mapping = state.mappings.find((m) => m.cc === cc);
  if (!mapping) return null;

  return {
    pluginId: mapping.pluginId,
    paramId: mapping.paramId,
    trackId: mapping.trackId,
    normalizedValue,
  };
}

export function startLearning(
  target: { pluginId: string; paramId: string; trackId: string },
  state: MidiLearnState,
): void {
  state.learningMode = true;
  state.activeTarget = target;
}

export function stopLearning(state: MidiLearnState): void {
  state.learningMode = false;
  state.activeTarget = null;
}

export function clearMappings(state: MidiLearnState): void {
  state.mappings = [];
  saveMappings([]);
}

export function saveMappings(mappings: MidiMapping[]): void {
  try {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(mappings));
  } catch {
    // Ignore storage errors
  }
}

export function loadMappings(): MidiMapping[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as MidiMapping[];
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

export function getMappingsForPlugin(
  state: MidiLearnState,
  trackId: string,
  pluginId: string,
): MidiMapping[] {
  return state.mappings.filter(
    (m) => m.trackId === trackId && m.pluginId === pluginId,
  );
}

export function isLearning(
  state: MidiLearnState,
  pluginId: string,
  paramId: string,
  trackId: string,
): boolean {
  return (
    state.learningMode &&
    state.activeTarget !== null &&
    state.activeTarget.pluginId === pluginId &&
    state.activeTarget.paramId === paramId &&
    state.activeTarget.trackId === trackId
  );
}

export function removeMapping(
  state: MidiLearnState,
  pluginId: string,
  paramId: string,
  trackId: string,
): void {
  const idx = state.mappings.findIndex(
    (m) =>
      m.pluginId === pluginId && m.paramId === paramId && m.trackId === trackId,
  );
  if (idx >= 0) {
    state.mappings.splice(idx, 1);
    saveMappings(state.mappings);
  }
}

// ---------------------------------------------------------------------------
// New MIDI Learn + MCU surface API (live mixer / transport control)
// ---------------------------------------------------------------------------

export interface MidiTarget {
  type: "trackVolume" | "trackPan" | "masterVolume" | "transport" | "pluginParam";
  trackId?: string;
  trackIndex?: number;
  paramId?: string;
  action?: "play" | "stop" | "togglePlay" | "record" | "loop" | "scrub";
}

export type MidiBindingKind = "cc" | "note";

export interface MidiBinding {
  cc: number;
  channel: number;
  kind: MidiBindingKind;
  target: MidiTarget;
}

export type MidiTargetHandler = (target: MidiTarget, value01: number) => void;

const STORAGE_KEY = "openband_midi_map";

let midiAccess: MIDIAccess | null = null;
let targetHandler: MidiTargetHandler | null = null;

export const midiMap = new Map<string, MidiBinding>();

function keyFor(kind: MidiBindingKind, channel: number, num: number): string {
  return `${kind}:${channel}:${num}`;
}

async function ensureAccess(): Promise<MIDIAccess | null> {
  if (midiAccess) return midiAccess;
  if (
    typeof navigator === "undefined" ||
    typeof navigator.requestMIDIAccess !== "function"
  ) {
    return null;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess();
    return midiAccess;
  } catch {
    return null;
  }
}

export async function requestMidiAccess(): Promise<MIDIAccess | null> {
  return ensureAccess();
}

export async function listMidiInputs(): Promise<{ id: string; name: string }[]> {
  const access = await ensureAccess();
  if (!access) return [];
  const list: { id: string; name: string }[] = [];
  access.inputs.forEach((input) => {
    const id = (input as unknown as { id?: string }).id ?? input.name ?? "";
    list.push({ id, name: input.name ?? "MIDI Input" });
  });
  return list;
}

function attachInput(
  input: MIDIInput,
  handler: (e: MIDIMessageEvent) => void,
): () => void {
  const prev = input.onmidimessage;
  const wrapper = (e: MIDIMessageEvent) => {
    handler(e);
    if (prev) prev.call(input, e);
  };
  input.onmidimessage = wrapper;
  return () => {
    if (input.onmidimessage === wrapper) input.onmidimessage = prev;
  };
}

export function learnCC(
  onCaptured: (cc: number, channel: number) => void,
): () => void {
  let cancelled = false;
  let cleanup: (() => void) | null = null;

  ensureAccess().then((access) => {
    if (!access || cancelled) return;
    const handler = (e: MIDIMessageEvent) => {
      const data = e.data;
      if (!data) return;
      const status = data[0];
      if ((status & 0xf0) === 0xb0) {
        onCaptured(data[1], status & 0x0f);
        cleanup?.();
      }
    };
    const restores = Array.from(access.inputs.values()).map((input) =>
      attachInput(input, handler),
    );
    cleanup = () => restores.forEach((r) => r());
    if (cancelled) cleanup();
  });

  return () => {
    cancelled = true;
    cleanup?.();
  };
}

export async function subscribeToInputs(
  onMessage: (data: Uint8Array | number[]) => void,
): Promise<() => void> {
  const access = await ensureAccess();
  if (!access) return () => {};

  const handler = (e: MIDIMessageEvent) => {
    if (e.data) onMessage(e.data);
  };
  const restores = Array.from(access.inputs.values()).map((input) =>
    attachInput(input, handler),
  );

  const prevState = access.onstatechange;
  access.onstatechange = (ev) => {
    if (prevState) prevState.call(access, ev);
    const next = ev.target as MIDIAccess;
    next.inputs.forEach((input) => attachInput(input, handler));
  };

  return () => {
    restores.forEach((r) => r());
    access.onstatechange = prevState;
  };
}

export function bindMidi(
  target: MidiTarget,
  cc: number,
  channel: number,
  kind: MidiBindingKind = "cc",
): void {
  const key = keyFor(kind, channel, cc);
  midiMap.set(key, { cc, channel, kind, target });
  saveMidiMap();
}

export function unbindMidi(key: string): void {
  midiMap.delete(key);
  saveMidiMap();
}

export function getBindings(): { key: string; binding: MidiBinding }[] {
  return Array.from(midiMap.entries()).map(([key, binding]) => ({
    key,
    binding,
  }));
}

export function setMidiTargetHandler(fn: MidiTargetHandler | null): void {
  targetHandler = fn;
}

export function applyMidiMessage(data: Uint8Array | number[]): void {
  const status = data[0];
  if (status === undefined) return;
  const channel = status & 0x0f;

  if ((status & 0xf0) === 0xb0) {
    const cc = data[1];
    const value = data[2] ?? 0;
    const binding = midiMap.get(keyFor("cc", channel, cc));
    if (binding && targetHandler) targetHandler(binding.target, value / 127);
  } else if ((status & 0xf0) === 0x90 && (data[2] ?? 0) > 0) {
    const note = data[1];
    const binding = midiMap.get(keyFor("note", channel, note));
    if (binding && targetHandler) targetHandler(binding.target, 1);
  }
}

export function loadMidiMap(): void {
  midiMap.clear();
  try {
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as [string, MidiBinding][];
    if (!Array.isArray(entries)) return;
    for (const [key, binding] of entries) {
      if (binding && typeof binding.cc === "number") {
        midiMap.set(key, binding);
      }
    }
  } catch {
    /* corrupt or unavailable storage — start fresh */
  }
}

export function saveMidiMap(): void {
  try {
    if (typeof localStorage === "undefined") return;
    const entries = Array.from(midiMap.entries());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* persistence unavailable — map stays in memory */
  }
}

export { applyMcuPreset };

loadMidiMap();
