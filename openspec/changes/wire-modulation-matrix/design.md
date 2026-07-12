### Render-time integration
During `renderMixdown()`, after building each plugin node from `PLUGIN_SPECS`:
```ts
const mods = computeModulation(matrix, trackId, targetParamId, time);
node.setParam(targetParamId, base + mods); // mods in param-native units
```
For offline render, sample `computeModulation` at the block rate; for live, use an `OscillatorNode`/`ConstantSourceNode` → `AudioParam` connection where the source is an LFO, and set-value curves for env/macro.

### UI binding
`OneKnob.tsx` "mod" affordance writes a route into `matrix.routes[]` (source, target, amount). `PluginEditor.tsx` lists active routes per param.

### Prerequisite
Requires `real-plugin-dsp` param ids to be stable — do this change **after** or **concurrently with** `real-plugin-dsp`.
