### Title
Replace 19 stub plugin types with correct Web Audio DSP + canonical param ids

### Problem
`src/lib/pluginChain.ts` `applyPluginChain()` references 19 track/bus plugin types, but most are stubs. `tests/lib9.test.ts` only asserts "output differs from input" using a mock `OfflineAudioContext`, so incorrect stubs pass. There is no canonical `PLUGIN_SPECS` table, causing param-id mismatches between `PluginEditor.tsx`, `OneKnob.tsx`, and the DSP layer.

### Why
Plugins are the creative core of a DAW. Stubbed DSP means users hear no real EQ/compression/distortion — the product is a shell. Correctness also unblocks `wire-modulation-matrix` (needs stable param ids to modulate).

### Scope
- Define `PLUGIN_SPECS` (canonical param ids, ranges, defaults, units).
- Implement real Web Audio node graphs (or AudioWorklets) for all 19 types.
- **In scope:** DSP correctness, param-id contract, audible tests.
- **Out of scope:** UI redesign of `PluginRack` (reuse existing), modulation application (see `wire-modulation-matrix`).

### Success metric
Each of the 19 plugins, when fed a known signal, produces a measurable, correct transform (e.g., EQ notch attenuates at the set frequency by $> 3$ dB; limiter ceilings at $-1.0$ dBTP).
