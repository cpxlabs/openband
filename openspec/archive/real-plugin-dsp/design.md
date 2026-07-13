### Canonical contract
```ts
// src/lib/plugins/specs.ts
export interface PluginSpec {
  type: string;
  params: { id: string; min: number; max: number; default: number; unit: string }[];
}
export const PLUGIN_SPECS: Record<string, PluginSpec> = { /* 19 entries */ };
```

### DSP implementation pattern
Each plugin is a pure factory:
```ts
export function createPlugin(type: string, ctx: AudioContext, params: Record<string, number>) {
  // returns { input: AudioNode, output: AudioNode, setParam(id, v) }
}
```
- **EQ / filters** → `BiquadFilterNode` (peaking, low/high-shelf, notch).
- **Compressor / limiter** → `DynamicsCompressorNode` with correct `threshold`/`ratio`/`knee`; limiter uses `ratio: 20`.
- **Overdrive / distortion** → `WaveShaperNode` with tanh curve (reuse `pedalboardDsp.ts`).
- **Delay / chorus / tremolo** → worklet factories from `pedalboardDsp.ts`.
- **Reverb** → `ConvolverNode` with generated impulse.

`applyPluginChain()` maps each track/bus plugin to `createPlugin` and chains `input→output`.

### Testability
Replace the `lib9` mock-only assertion with `tests/plugins/dsp.test.ts` that:
- Feeds a sine at $f_0$ through an EQ notch at $f_0$.
- Asserts output RMS at $f_0$ drops by $> 3$ dB (FFT check).
- Feeds a $-0.5$ dBFS tone through limiter at ceiling $-1.0$ dB; asserts true peak $\leq -1.0$ dB.
