---
name: studio-polish-features
description: Pattern for adding studio polish features — VU meters, pan automation lanes, and multi-band EQ display in OpenBand DAW (project)
source: auto-skill
extracted_at: '2026-07-03T16:28:43.659Z'
---

## Rule

When polishing the studio mixer, follow these patterns for VU meters, pan automation, and EQ display.

### VU Meters

**Component:** `src/components/VuMeter.tsx`

```tsx
interface VuMeterProps {
  level: number;      // 0-1 (mapped from dBFS)
  peakLevel?: number; // 0-1, optional peak hold
  testID?: string;
}
```

- 8px width, full height of parent container
- Three color zones: green (-30 to -6dB), yellow (-6 to -1dB), red (-1 to 0dB)
- Peak hold indicator (white line)
- Driven by `track.volume / 100` in sidebar, `getEffectiveVolume(track.id) / 100` in mixer

**Integration in studio:**

```tsx
// In track sidebar row:
<VuMeter level={track.volume / 100} />

// In mixer channel strip:
<VuMeter level={getEffectiveVolume(track.id) / 100} />
```

### Pan Automation Lane

**Pattern:** Parallel to volume automation, uses same `AutomationLane` component.

```tsx
// State (mirrors showAutomation for volume):
const [showPanAutomation, setShowPanAutomation] = useState<Record<string, boolean>>({});

// Toggle buttons (replace single "A" with "V" + "P"):
<Pressable onPress={() => setShowAutomation(prev => ({ ...prev, [track.id]: !prev[track.id] }))}>
  <Text>V</Text>
</Pressable>
<Pressable onPress={() => setShowPanAutomation(prev => ({ ...prev, [track.id]: !prev[track.id] }))}>
  <Text>P</Text>
</Pressable>

// Lane rendering (dynamic height based on visible lanes):
const laneCount = (showAuto ? 1 : 0) + (showPanAuto ? 1 : 0);
const trackHeight = baseH + laneCount * 26;

// Pan lane:
<AutomationLane
  points={track.automation.pan || []}
  onChange={(pts) => updateAutomation(track.id, "pan", pts)}
  color="#bf5af2"    // purple
  minValue={-100}
  maxValue={100}
  label="Pan"
/>
```

### Multi-Band EQ Display

**Component:** `src/components/VisualEQ.tsx`

Enhancements added:
1. **Frequency response curve** — 99-sample line graph from 20Hz to 20kHz
   - Blue (#5ac8fa) for positive gain, orange (#f97316) for negative
   - Filled area under curve for depth
2. **Band labels** — Low, Low-Mid, Mid, High-Mid, High at bottom
3. **Spectrum analyzer background** — HSL gradient bars with dynamic opacity
4. **Draggable bands** — touch/click to adjust gain, real-time tooltip

**Band frequency ranges:**

| Band | Range |
|------|-------|
| Low | 20-200Hz |
| Low-Mid | 200-800Hz |
| Mid | 800-3kHz |
| High-Mid | 3-8kHz |
| High | 8-20kHz |

### How to apply

Use subagents (`impl-dev`) for implementation. Each feature is independent and can be done in parallel:
- VU meter: new component + integration in two places (sidebar + mixer)
- Pan automation: state + toggle + lane in `app/studio/[id].tsx` only
- EQ display: enhance `VisualEQ.tsx` only, no other files
