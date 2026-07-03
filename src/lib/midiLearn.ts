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

const STORAGE_KEY = "openband_midi_learn";

/**
 * Process an incoming MIDI CC message against the current learn state.
 *
 * In learning mode: binds the CC to the active target parameter.
 * Outside learning mode: looks up the CC and returns the mapped parameter change.
 */
export function processMidiCC(
  cc: number,
  value: number,
  state: MidiLearnState,
): { pluginId: string; paramId: string; trackId: string; normalizedValue: number } | null {
  const normalizedValue = value / 127;

  if (state.learningMode && state.activeTarget) {
    // Check if a mapping already exists for this exact target
    const existingIndex = state.mappings.findIndex(
      (m) =>
        m.pluginId === state.activeTarget!.pluginId &&
        m.paramId === state.activeTarget!.paramId &&
        m.trackId === state.activeTarget!.trackId,
    );

    if (existingIndex >= 0) {
      // Update existing mapping to new CC
      state.mappings[existingIndex] = {
        ...state.mappings[existingIndex],
        cc,
      };
    } else {
      // Create new mapping
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

  // Not in learning mode — look up the CC mapping
  const mapping = state.mappings.find((m) => m.cc === cc);
  if (!mapping) return null;

  return {
    pluginId: mapping.pluginId,
    paramId: mapping.paramId,
    trackId: mapping.trackId,
    normalizedValue,
  };
}

/**
 * Enter MIDI Learn mode for a specific plugin parameter.
 */
export function startLearning(
  target: { pluginId: string; paramId: string; trackId: string },
  state: MidiLearnState,
): void {
  state.learningMode = true;
  state.activeTarget = target;
}

/**
 * Exit MIDI Learn mode.
 */
export function stopLearning(state: MidiLearnState): void {
  state.learningMode = false;
  state.activeTarget = null;
}

/**
 * Remove all MIDI Learn mappings.
 */
export function clearMappings(state: MidiLearnState): void {
  state.mappings = [];
  saveMappings([]);
}

/**
 * Persist mappings to localStorage.
 */
export function saveMappings(mappings: MidiMapping[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load mappings from localStorage.
 */
export function loadMappings(): MidiMapping[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as MidiMapping[];
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Get mappings filtered by track and plugin.
 */
export function getMappingsForPlugin(
  state: MidiLearnState,
  trackId: string,
  pluginId: string,
): MidiMapping[] {
  return state.mappings.filter(
    (m) => m.trackId === trackId && m.pluginId === pluginId,
  );
}

/**
 * Check if a specific parameter is currently in learning mode.
 */
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

/**
 * Remove a single mapping by target.
 */
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
