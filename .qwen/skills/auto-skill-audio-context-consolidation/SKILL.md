---
name: audio-context-consolidation
description: Pattern for consolidating multiple AudioContext instances into a single shared context managed by universalAudio.ts
source: auto-skill
extracted_at: '2026-07-02T09:15:00.000Z'
---

# AudioContext Consolidation Pattern

## Problem

Multiple modules each create their own `AudioContext`:
- `midiSynth.ts`, `clockManager.ts`, `midiScheduler.ts`, `previewEngine.ts`, `subtractiveSynth.ts`, `latencyMonitor.ts`

Browsers limit concurrent `AudioContext` instances (typically 6). Unmanaged creation leads to resource leaks, conflicting audio graphs, and hitting browser limits.

## Architecture

`universalAudio.ts` is the **single source of truth** for the shared `AudioContext`. All other modules call `getSharedAudioContext()` instead of creating their own.

```
┌─────────────────────────────────────────────┐
│  universalAudio.ts                           │
│  - audioSystem.initialize()                  │
│  - getSharedAudioContext() → AudioContext    │
│  - ensureSharedAudioContext() → Promise      │
│  - disposeAllAudio() → teardown              │
│  - audioCtx getter (read-only)               │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────┼──────────┬──────────┬──────────┐
    ▼          ▼          ▼          ▼          ▼
 midiSynth  clockMgr   midiSched  preview   subtractive
```

## Implementation Pattern

### Step 1: Add exports to universalAudio.ts

```typescript
export function getSharedAudioContext(): AudioContext | null {
  return audioSystem.audioCtx;
}

export async function ensureSharedAudioContext(): Promise<AudioContext | null> {
  return audioSystem.ensureContext();
}

export function disposeAllAudio(): void {
  audioSystem.dispose();
}
```

### Step 2: Update each module to use shared context

**Before (each module creates its own):**
```typescript
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

export function disposeModule(): void {
  if (audioCtx) { audioCtx.close(); audioCtx = null; }
}
```

**After (uses shared context):**
```typescript
import { getSharedAudioContext } from "./universalAudio";

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  return getSharedAudioContext();
}

export function disposeModule(): void {
  // AudioContext lifecycle now managed by universalAudio.dispose()
}
```

### Step 3: Root layout teardown

```typescript
// app/_layout.tsx
import { audioSystem, disposeAllAudio } from "../src/lib/universalAudio";

useEffect(() => {
  if (Platform.OS === "web") {
    const initAudio = () => { audioSystem.initialize().catch(() => {}); };
    document.addEventListener("pointerdown", initAudio, { once: true });
    document.addEventListener("keydown", initAudio, { once: true });
    return () => {
      document.removeEventListener("pointerdown", initAudio);
      document.removeEventListener("keydown", initAudio);
      disposeAllAudio();
    };
  } else {
    audioSystem.initialize();
    return () => disposeAllAudio();
  };
}, []);
```

## Module-Specific Notes

| Module | Notes |
|--------|-------|
| `midiSynth.ts` | Remove module-level `audioCtx` variable; disposeAudioContext stops notes but no longer closes context |
| `clockManager.ts` | Remove `sharedAudioContext`; getAudioContext returns shared |
| `midiScheduler.ts` | Remove module-level `audioCtx`; disposeMidiScheduler stops all but no longer closes context |
| `previewEngine.ts` | Remove `previewAudioCtx`; getPreviewContext uses shared; disposePreviewEngine no longer closes context |
| `subtractiveSynth.ts` | Remove module-level `audioCtx`; disposeSubtractiveSynthAudio stops voices but no longer closes context |
| `latencyMonitor.ts` | Replace `sharedCtx` with local `monitorCtx` variable that calls shared getter |

## Test Updates

Tests that mock `AudioContext` constructor must now initialize the shared audio system:

```typescript
it("playNote creates oscillator and returns id", async () => {
  const { audioSystem } = await import("../src/lib/universalAudio");
  await audioSystem.initialize();
  const { playNote } = await import("../src/lib/midiSynth");
  const id = playNote(60, 100, "sine", 8000, 0);
  expect(id).toBeTruthy();
});
```

## Common Pitfalls

1. **Module-level `let audioCtx` becomes unused** — Remove it entirely after switching to `getSharedAudioContext()`, otherwise TS reports "assigned but never read".

2. **Dispose functions still close context** — After consolidation, individual dispose functions should only stop their own resources (oscillators, listeners), not close the shared AudioContext.

3. **`ensureSharedAudioContext` returns null on native** — Always guard with `Platform.OS !== "web"` checks before calling.

4. **PreviewEngine's generateThumbnail** — This function previously created+closed its own AudioContext. Remove the `ctx.close()` call since it now uses the shared context.

5. **latencyMonitor's sharedCtx → monitorCtx** — latencyMonitor needs its own local variable for the monitoring-specific connection chain, but the AudioContext itself comes from the shared getter.
