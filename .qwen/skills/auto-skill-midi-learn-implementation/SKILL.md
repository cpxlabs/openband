---
name: midi-learn-implementation
description: Pattern for implementing MIDI Learn in DAW applications — CC-to-parameter mapping, learning mode, persistence, and React hooks
source: auto-skill
extracted_at: '2026-07-02T13:05:00.000Z'
---

## MIDI Learn Implementation Pattern

When adding MIDI Learn to a DAW, you need to map incoming MIDI CC (Control Change) messages to specific plugin parameters. This pattern provides a complete implementation with persistence and React integration.

### Core Manager Class

```typescript
export class MIDILearnManager {
  private mappings: Map<string, MIDILearnMapping> = new Map();
  private ccToMapping: Map<number, MIDILearnMapping> = new Map();
  private learningMode: { trackId: string; pluginId: string; paramKey: string; label: string } | null = null;

  // Enter learning mode for a specific parameter
  startLearning(trackId: string, pluginId: string, paramKey: string, label: string): void {
    this.learningMode = { trackId, pluginId, paramKey, label };
  }

  // Process incoming CC — creates mapping if learning, returns param change if mapped
  processCC(ccNumber: number, value: number): { trackId: string; pluginId: string; paramKey: string; normalizedValue: number } | null {
    if (this.learningMode) {
      // Create new mapping and persist
      const mapping = { ccNumber, ...this.learningMode };
      const key = `${mapping.trackId}:${mapping.pluginId}:${mapping.paramKey}`;
      this.mappings.set(key, mapping);
      this.ccToMapping.set(ccNumber, mapping);
      this.learningMode = null;
      this.saveToStorage();
      return null;
    }
    const mapping = this.ccToMapping.get(ccNumber);
    return mapping ? { ...mapping, normalizedValue: value / 127 } : null;
  }
}
```

### Key Design Decisions

1. **Dual index**: Map by `trackId:pluginId:paramKey` for lookup, AND by `ccNumber` for fast CC processing
2. **Learning mode is singular**: Only one parameter can be in learning mode at a time (matches hardware behavior)
3. **Normalize CC values**: MIDI CC is 0-127, convert to 0-1 for plugin parameters
4. **Persist to localStorage**: Mappings survive page reloads

### React Hook Integration

```typescript
export function useMIDILearn(trackId: string, pluginId: string) {
  const [learningParam, setLearningParam] = useState<string | null>(null);
  const [mappings, setMappings] = useState(() => midiLearn.getMappingsForPlugin(trackId, pluginId));

  const startLearning = useCallback((paramKey: string, label: string) => {
    midiLearn.startLearning(trackId, pluginId, paramKey, label);
    setLearningParam(paramKey);
  }, [trackId, pluginId]);

  return { mappings, learningParam, startLearning, /* ... */ };
}
```

### Usage in Plugin Editor

```tsx
const { mappings, learningParam, startLearning } = useMIDILearn(trackId, plugin.id);

// For each parameter knob/slider:
const isLearning = learningParam === param.key;
const mapping = mappings.find(m => m.paramKey === param.key);

<Pressable onLongPress={() => startLearning(param.key, param.label)}>
  {mapping && <Badge text={`CC ${mapping.ccNumber}`} />}
  {isLearning && <Badge text="● LEARNING" variant="active" />}
</Pressable>
```

### Storage Format

```json
[
  {
    "ccNumber": 74,
    "trackId": "track-1",
    "pluginId": "plugin-reverb-1",
    "paramKey": "mix",
    "label": "Mix"
  }
]
```

### Integration with MIDI Input

Wire the manager into your MIDI input handler:

```typescript
function onMIDIMessage(event: MIDIMessageEvent) {
  const [status, ccNumber, value] = event.data;
  if (status === 0xB0) { // CC message
    const result = midiLearn.processCC(ccNumber, value);
    if (result) {
      // Apply to plugin parameter
      updatePluginParam(result.trackId, result.pluginId, result.paramKey, result.normalizedValue);
    }
  }
}
```
