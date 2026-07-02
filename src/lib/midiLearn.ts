import { useState, useCallback } from "react";

export interface MIDILearnMapping {
  ccNumber: number;
  trackId: string;
  pluginId: string;
  paramKey: string;
  label: string;
}

const STORAGE_KEY = "openband_midi_learn";

/**
 * MIDI Learn manager — maps incoming MIDI CC messages to plugin parameters.
 * Persists mappings to localStorage.
 */
export class MIDILearnManager {
  private mappings: Map<string, MIDILearnMapping> = new Map();
  private ccToMapping: Map<number, MIDILearnMapping> = new Map();
  private learningMode: { trackId: string; pluginId: string; paramKey: string; label: string } | null = null;

  constructor() {
    this.loadFromStorage();
  }

  /** Enter learning mode for a specific parameter. Next CC message will be mapped to it. */
  startLearning(trackId: string, pluginId: string, paramKey: string, label: string): void {
    this.learningMode = { trackId, pluginId, paramKey, label };
  }

  /** Cancel learning mode without saving. */
  cancelLearning(): void {
    this.learningMode = null;
  }

  /**
   * Process an incoming MIDI CC message.
   * If in learning mode, creates a mapping. Otherwise, returns the mapped parameter change.
   */
  processCC(ccNumber: number, value: number): { trackId: string; pluginId: string; paramKey: string; normalizedValue: number } | null {
    if (this.learningMode) {
      // Create new mapping
      const mapping: MIDILearnMapping = {
        ccNumber,
        trackId: this.learningMode.trackId,
        pluginId: this.learningMode.pluginId,
        paramKey: this.learningMode.paramKey,
        label: this.learningMode.label,
      };
      const key = `${mapping.trackId}:${mapping.pluginId}:${mapping.paramKey}`;
      this.mappings.set(key, mapping);
      this.ccToMapping.set(ccNumber, mapping);
      this.learningMode = null;
      this.saveToStorage();
      return null;
    }

    const mapping = this.ccToMapping.get(ccNumber);
    if (!mapping) return null;

    return {
      trackId: mapping.trackId,
      pluginId: mapping.pluginId,
      paramKey: mapping.paramKey,
      normalizedValue: value / 127,
    };
  }

  /** Get all mappings for a track. */
  getMappingsForTrack(trackId: string): MIDILearnMapping[] {
    return [...this.mappings.values()].filter((m) => m.trackId === trackId);
  }

  /** Get all mappings for a plugin. */
  getMappingsForPlugin(trackId: string, pluginId: string): MIDILearnMapping[] {
    return [...this.mappings.values()].filter((m) => m.trackId === trackId && m.pluginId === pluginId);
  }

  /** Remove a mapping. */
  removeMapping(trackId: string, pluginId: string, paramKey: string): void {
    const key = `${trackId}:${pluginId}:${paramKey}`;
    const mapping = this.mappings.get(key);
    if (mapping) {
      this.ccToMapping.delete(mapping.ccNumber);
      this.mappings.delete(key);
      this.saveToStorage();
    }
  }

  /** Clear all mappings. */
  clearAll(): void {
    this.mappings.clear();
    this.ccToMapping.clear();
    this.saveToStorage();
  }

  /** Check if a parameter is in learning mode. */
  isLearning(trackId: string, pluginId: string, paramKey: string): boolean {
    return (
      this.learningMode !== null &&
      this.learningMode.trackId === trackId &&
      this.learningMode.pluginId === pluginId &&
      this.learningMode.paramKey === paramKey
    );
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as MIDILearnMapping[];
        for (const mapping of data) {
          const key = `${mapping.trackId}:${mapping.pluginId}:${mapping.paramKey}`;
          this.mappings.set(key, mapping);
          this.ccToMapping.set(mapping.ccNumber, mapping);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  private saveToStorage(): void {
    try {
      const data = [...this.mappings.values()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }
}

/** Singleton instance */
const midiLearn = new MIDILearnManager();

/**
 * Hook for MIDI Learn in plugin editors.
 * Returns learning state and handler functions.
 */
export function useMIDILearn(trackId: string, pluginId: string) {
  const [learningParam, setLearningParam] = useState<string | null>(null);
  const [mappings, setMappings] = useState(() => midiLearn.getMappingsForPlugin(trackId, pluginId));

  const startLearning = useCallback((paramKey: string, label: string) => {
    midiLearn.startLearning(trackId, pluginId, paramKey, label);
    setLearningParam(paramKey);
  }, [trackId, pluginId]);

  const cancelLearning = useCallback(() => {
    midiLearn.cancelLearning();
    setLearningParam(null);
  }, []);

  const removeMapping = useCallback((paramKey: string) => {
    midiLearn.removeMapping(trackId, pluginId, paramKey);
    setMappings(midiLearn.getMappingsForPlugin(trackId, pluginId));
  }, [trackId, pluginId]);

  return {
    mappings,
    learningParam,
    startLearning,
    cancelLearning,
    removeMapping,
    clearAll: useCallback(() => {
      midiLearn.clearAll();
      setMappings([]);
    }, []),
  };
}

export { midiLearn };
