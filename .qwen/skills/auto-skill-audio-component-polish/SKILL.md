---
name: audio-component-polish
description: Common patterns for polishing React Native audio components — slider stale closures, ADSR timing fixes, keyboard event optimization
source: auto-skill
extracted_at: '2026-07-02T12:50:02.050Z'
---

## Synth/Slider stale closure fix

When building draggable sliders in React Native audio components, **never use `useState` for dragging state** in combination with `useCallback` — it causes the callback to be recreated on every drag event, breaking the gesture.

### Wrong (causes stale closure)
```tsx
const [dragging, setDragging] = useState(false);
const handleMove = useCallback((e) => {
  if (!dragging) return; // stale: captured at callback creation time
  // ...
}, [dragging, min, max, step, onChange]); // recreates on every drag toggle
```

### Correct (use ref)
```tsx
const draggingRef = useRef(false);
const handleMove = useCallback((e) => {
  if (!draggingRef.current) return; // always current
  // ...
}, [min, max, step, onChange]); // stable deps

const handlePressIn = useCallback((e) => {
  draggingRef.current = true;
}, []);

const handleRelease = useCallback(() => {
  draggingRef.current = false;
}, []);
```

Also add `onResponderTerminate={handleRelease}` to the Pressable to handle gesture cancellation.

## ADSR envelope timing fix

When previewing audio samples with ADSR envelopes, **clamp all envelope phases to the sample duration** to prevent negative time offsets:

```tsx
const duration = slot.data.duration;
const a = Math.min(adsr.attack / 1000, duration * 0.3);
const d = Math.min(adsr.decay / 1000, (duration - a) * 0.5);
const r = Math.min(adsr.release / 1000, duration * 0.3);

// Ensure release starts after sustain, never before attack+decay completes
const releaseStart = Math.max(now + a + d + 0.05, now + duration - r);
gainNode.gain.setValueAtTime(sustainLevel, releaseStart);
gainNode.gain.linearRampToValueAtTime(0, releaseStart + r);

// Always call source.stop() to clean up after release tail
source.stop(now + duration + r);
```

## Keyboard event listener optimization

When adding keyboard shortcuts to audio components, **inline the noteOn/noteOff logic** inside the event handlers rather than capturing them as dependencies — this prevents the effect from re-registering listeners on every render:

### Wrong (re-registers on every render)
```tsx
useEffect(() => {
  const handleKeyDown = (e) => noteOn(KEY_MAP[e.key]);
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [visible, noteOn, noteOff]); // noteOn/noteOff change every render
```

### Correct (inline logic, stable deps)
```tsx
useEffect(() => {
  if (!visible) return;
  const handleKeyDown = (e) => {
    // inline noteOn logic using refs
    if (!synthRef.current) return;
    const id = synthRef.current.noteOn(note, velocity);
    voiceIds.current.set(note, id);
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [visible]); // stable — only re-registers when visibility changes
```
