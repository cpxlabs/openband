---
name: synth-engine-wiring
description: Pattern for wiring a polyphonic audio engine to a React Native component with interactive controls, cross-platform sliders, and proper voice lifecycle management
source: auto-skill
extracted_at: '2026-07-01T20:34:56.947Z'
---

# Synth Engine Wiring Pattern

## When to Use
- Adding interactive controls to an audio component (synth, sampler, effect)
- Connecting an existing headless audio engine to a React Native UI
- Building cross-platform sliders/knobs that work on web + native

## Key Files

| File | Role |
|------|------|
| `src/lib/subtractiveSynth.ts` | Polyphonic synth engine with 16-voice management, noteOn/noteOff |
| `src/components/Synth.tsx` | UI component with tabs (OSC/Filter/Env/LFO/ARP) + piano keyboard |
| `src/components/OneKnob.tsx` | Reusable drag-based knob component (vertical drag) |

## Architecture

```
┌─────────────────────────────────────────────┐
│  Synth.tsx (UI Component)                    │
│  - Tab state (osc/filter/env/lfo/arp)       │
│  - activeNotes: Set<number>                 │
│  - voiceIds: Map<note, voiceId>             │
│  - config: SubtractiveSynthConfig           │
│  - synthRef: SubtractiveSynth               │
│                                              │
│  noteOn(note) ──→ engine.noteOn(note, vel)  │
│  noteOff(note) ─→ engine.noteOff(voiceId)   │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  subtractiveSynth.ts (Engine)                │
│  - audioCtx: AudioContext (singleton)        │
│  - voices: Map<voiceId, ActiveVoice>         │
│  - MAX_VOICES = 16                          │
│  - noteOn/noteOff with ADSR scheduling       │
│  - LFO modulation (pitch/filter/amp)         │
└─────────────────────────────────────────────┘
```

## Voice Lifecycle Pattern

```typescript
const synthRef = useRef<SubtractiveSynth | null>(null);
const voiceIds = useRef<Map<number, string>>(new Map());

// Note on - prevent duplicate notes
const noteOn = useCallback((note: number) => {
  if (!synthRef.current) return;
  if (voiceIds.current.has(note)) return; // Prevent duplicate
  const id = synthRef.current.noteOn(note, 100);
  voiceIds.current.set(note, id);
  setActiveNotes((prev) => new Set(prev).add(note));
}, []);

// Note off - track cleanup
const noteOff = useCallback((note: number) => {
  const id = voiceIds.current.get(note);
  if (id && synthRef.current) {
    synthRef.current.noteOff(id);
    voiceIds.current.delete(note);
  }
  setActiveNotes((prev) => {
    const next = new Set(prev);
    next.delete(note);
    return next;
  });
}, []);

// Cleanup on unmount
useEffect(() => {
  return () => {
    synthRef.current?.dispose();
    disposeSubtractiveSynthAudio();
  };
}, []);
```

## Cross-Platform Slider Pattern

**DO NOT** use HTML `<input type="range">` — it breaks on React Native (iOS/Android).

Use Pressable with responder system:

```typescript
function SynthSlider({ label, value, min, max, step, onChange }) {
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startValue = useRef(0);
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  const handlePressIn = useCallback((e) => {
    startX.current = e.nativeEvent.pageX;
    startValue.current = value;
    setDragging(true);
  }, [value]);

  const handleMove = useCallback((e) => {
    if (!dragging) return;
    const dx = e.nativeEvent.pageX - startX.current;
    const range = max - min;
    const delta = (dx / 150) * range; // 150px = full range
    const stepped = min + Math.round((startValue.current + delta - min) / step) * step;
    onChange(Math.max(min, Math.min(max, stepped)));
  }, [dragging, min, max, step, onChange]);

  const handleRelease = useCallback(() => setDragging(false), []);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onStartShouldSetResponder={() => true}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
    >
      <View style={{ width: `${pct}%` }} />
    </Pressable>
  );
}
```

## Config Sync Pattern

When updating engine config from UI state, use a single `useEffect`:

```typescript
const [config, setConfig] = useState<SubtractiveSynthConfig>({ ...DEFAULT_SYNTH_CONFIG });

// Single source of truth - engine follows React state
useEffect(() => {
  synthRef.current?.setConfig(config);
}, [config]);

// Update via partial config
const updateConfig = useCallback((partial: Partial<SubtractiveSynthConfig>) => {
  setConfig((prev) => ({ ...prev, ...partial }));
}, []);

// DON'T call synthRef.current.setConfig() separately - the useEffect handles it
```

## Piano Keyboard Pattern

Hoist key computations to module scope (not per-render):

```typescript
const WHITE_KEYS = PIANO_KEYS.filter((k) => !k.isBlack);
const BLACK_KEYS = PIANO_KEYS.filter((k) => k.isBlack);
const WHITE_WIDTH = 100 / WHITE_KEYS.length;

// Black keys position absolutely over white keys
function PianoKey({ note, isBlack, ... }) {
  if (isBlack) {
    const prevWhiteIdx = WHITE_KEYS.findIndex((k) => k.note === note - 1);
    const leftPos = (prevWhiteIdx + 0.65) * WHITE_WIDTH;
    return <Pressable style={{ left: `${leftPos}%`, width: `${WHITE_WIDTH * 0.6}%`, zIndex: 1 }} />;
  }
  return <Pressable className="flex-1" />;
}
```

## Keyboard Shortcuts Pattern

```typescript
const KEY_MAP: Record<string, number> = {
  a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66,
  g: 67, y: 68, h: 69, u: 70, j: 71, k: 72,
};

useEffect(() => {
  if (!visible) return;
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const note = KEY_MAP[e.key.toLowerCase()];
    if (note !== undefined) noteOn(note);
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    const note = KEY_MAP[e.key.toLowerCase()];
    if (note !== undefined) noteOff(note);
  };
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  };
}, [visible, noteOn, noteOff]);
```

## Arpeggiator Pattern

Sync to project BPM with proper cleanup:

```typescript
const arpInterval = useRef<ReturnType<typeof setInterval> | null>(null);

const stopArp = useCallback(() => {
  if (arpInterval.current) {
    clearInterval(arpInterval.current);
    arpInterval.current = null;
  }
}, []);

const startArp = useCallback(() => {
  stopArp();
  const divisions = rate === "1/4" ? 1 : rate === "1/8" ? 2 : 4;
  const intervalMs = (60 / bpm / divisions) * 1000;

  arpInterval.current = setInterval(() => {
    // Release previous note, play next
    for (const [note] of voiceIds.current) noteOff(note);
    noteOn(nextNote);
  }, intervalMs);
}, [bpm, rate, noteOn, noteOff, stopArp]);

// Restart when BPM or rate changes
useEffect(() => {
  if (arpConfig.enabled) startArp();
  else stopArp();
  return () => stopArp();
}, [arpConfig.enabled, rate, bpm, startArp, stopArp]);
```

## Common Pitfalls

1. **HTML `<input>` on native** — `<input type="range">` crashes or is non-interactive on React Native. Always use Pressable + responder system.

2. **Duplicate noteOn** — Without checking `voiceIds.has(note)`, pressing the same key rapidly creates leaking voices.

3. **Redundant engine calls** — Don't call `synthRef.current.setConfig()` AND `setConfig()` — the useEffect will double-apply.

4. **Per-render array filtering** — `PIANO_KEYS.filter()` inside PianoKey runs 25x per render. Hoist to module scope.

5. **EnvelopeVisual sustain math** — Use consistent units: `sPct = 0.3 / total * 100` not `30 / total * 100`.

6. **AudioContext cleanup** — Always call `dispose()` and `disposeSubtractiveSynthAudio()` on unmount to prevent memory leaks.

## Test Updates

When replacing static UI with interactive controls:
- Update test assertions from old text labels (e.g., "Play C4") to new elements (e.g., "C3" piano key label)
- Update preset count if presets changed
- Test tab visibility ("OSC", "FLT", "ENV")
