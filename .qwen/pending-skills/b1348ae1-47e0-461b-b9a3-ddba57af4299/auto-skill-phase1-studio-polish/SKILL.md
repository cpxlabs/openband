---
name: phase1-studio-polish
description: Phase 1 studio polish patterns — pan interpolation, track color picker, MiniPlayer draggable seek, stem-to-project workflow, and web audio DOM fix
source: auto-skill
extracted_at: '2026-07-03T16:44:44.897Z'
---

## Rule

Phase 1 polish features improve the core studio experience with minimal architecture changes. Each feature follows existing patterns.

### 1. Pan Interpolation (curve toggle)

AutomationLane already supports `curve: "linear" | "exponential"` for volume points. Enable the same for pan by adding `showCurveToggle` prop to the pan AutomationLane instance.

**How:** In `app/studio/[id].tsx`, add `showCurveToggle` to the pan AutomationLane. The interpolation math in AutomationLane.tsx handles exponential when `pt.curve === "exponential"`.

### 2. Track Color Picker

Create `TrackColorPicker.tsx` component with 12 preset color swatches + custom HTML5 `<input type="color">` on web.

**Colors:** bg-blue-500, bg-green-500, bg-purple-500, bg-red-500, bg-amber-500, bg-cyan-500, bg-pink-500, bg-indigo-500, bg-teal-500, bg-orange-500, bg-lime-500, bg-rose-500

**Integration:** Add color swatch button in sidebar track row → shows popover → on select calls `setTracks(tracks.map(t => t.id === trackId ? { ...t, color: newColor } : t))`.

### 3. MiniPlayer Draggable Seek

Add `onResponderGrant`, `onResponderMove`, `onResponderRelease` for native touch + `onMouseMove`/`onMouseUp` for web pointer drag on the progress bar.

**Key:** Calculate seek position from touch X relative to container width. Call `player.seekTo(ratio * duration)`. Set `pointerEvents: "none"` on inner fill to not intercept drag.

### 4. Stem-to-Project Workflow

After stem separation, "Add all to studio" creates a project with:
- 4 tracks: Drums, Bass, Vocals, Other
- Auto volumes: 80, 75, 85, 70
- Auto pan: center for first 3, ±10 for Other
- Dynamic project title from stem names

### 5. Web Audio DOM Fix

HTML5 `<audio>` element **must be appended to document.body** for reliable playback in all browsers. Without DOM attachment, `canplaythrough`/`loadeddata` events may never fire, causing indefinite hangs.

**Pattern:**
```ts
const audio = new Audio();
audio.style.display = "none";
document.body.appendChild(audio);
// ... setup listeners
// On cleanup: if (audio.parentNode) audio.parentNode.removeChild(audio);
```

Also add `error` event listener to catch load failures, and use Promise with reject on error instead of timeout fallback.

## Forbidden

- Timeout-based resolve for audio loading (use error rejection instead)
- AudioContext.ensureContext() for HTML5 Audio (not needed — `<audio>` is independent)
- Creating new Audio() without appending to DOM (unreliable on web)

## How to apply

When adding studio polish features: follow existing patterns, don't create new architecture, use `setTracks` for history-aware updates, and always append `<audio>` to DOM on web.
