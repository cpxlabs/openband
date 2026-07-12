### Architecture decision: one context, one clock
The root cause of drift and silence is context fragmentation. We enforce a **single `AudioContext`** owned by the `UniversalAudioSystem` singleton.

```ts
// src/lib/universalAudio.ts (target shape)
class UniversalAudioSystem {
  private static _ctx: AudioContext | null = null;
  private blobRegistry = new Map<string, string>(); // trackId -> url
  static get ctx(): AudioContext { /* lazy, single instance */ }
  ensureContext(): void { /* resume on gesture, synchronous path */ }
  async renderMixdown(tracks, opts): Promise<string> { /* MIDI + url regions */ }
}
```

### Render path
- `renderMixdown(tracks, opts)` iterates tracks:
  - **MIDI track** → `midiSynth.renderTracksToUrl()` (existing).
  - **Audio-region track** → `fetch(url)` → `decodeAudioData` → `AudioBufferSourceNode`, with `timeStretch.ts`/`pitch` applied via a `playbackRate` + phase-vocoder node where set.
- All sources summed into one offline/live graph → single output blob URL.

### Transport clock
Transport position is derived **only** from `UniversalAudioSystem.ctx.currentTime`, never from a separate `<audio>` element. Define drift error:
$$e(t) = \left|t_{\text{ctx}} - t_{\text{audio}}\right|$$
With two independent clocks, $\frac{dt_{\text{ctx}}}{dt} \neq \frac{dt_{\text{audio}}}{dt}$, so $e(t)$ grows unbounded. With one shared context, $e(t) \to 0$ after start offset.

### Blob lifecycle
- On `renderMixdown`, register the produced URL in `blobRegistry` keyed by track/region id.
- On `stop()`, `unmount`, or re-render of the same key: `URL.revokeObjectURL(old)` before assigning new.
- A `useEffect` cleanup in `studio/[id].tsx` revokes all registered URLs on leave.

### Gesture rule
`togglePlay()` calls `ensureContext()` **synchronously** (no `await` before `ctx.resume()`) to satisfy browser autoplay policy.
