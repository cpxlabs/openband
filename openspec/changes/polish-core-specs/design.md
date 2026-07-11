# Design — Polish Core Specs

## File / Requirement Mapping

| New Requirement | File Touched | Symbols |
|---|---|---|
| Default Preset Per Type | `src/lib/types.ts` | `PLUGIN_SPECS` (add `"Default"` preset per type) |
| Plugin Preset Serialization | `src/lib/plugins/presetSerial.ts` (new) | `serializePlugin`, `deserializePlugin` (re-use `clampParam`, `applyPluginPreset`) |
| Per-Plugin A/B Compare | `src/lib/types.ts`, `src/components/PluginEditor.tsx` | `Plugin.stateA`, `Plugin.stateB`, `Plugin.activeSlot` |
| Reported Latency | `src/lib/types.ts`, `src/lib/pluginChain.ts` | `latencySamples` map per type, `getChainLatency(plugins)` |
| Chain Validation | `src/lib/mastering.ts` | `validateMasteringChain(chain)` |
| Preset fixes (10) | `src/lib/mastering.ts` | drop trailing `limiter` in presets #4, #6, #9 |
| Project Starter | `src/lib/projectStarter.ts` (new) | `setupProjectStarter(config)`, `startFromScratch` |

## Behavior Details

### `serializePlugin` / `deserializePlugin`
- `serializePlugin(plugin)` → `JSON.stringify({ type, params, enabled, order, id })`.
- `deserializePlugin(json)` → `JSON.parse`, rebuild `Plugin` with `applyPluginPreset(type, parsed.params)` so each value is clamped to schema.
- Round-trip must be deep-equal (color is optional and may be dropped).

### `latencySamples`
- Non-zero for: `reverb`, `delay`, `multibandCompressor`, `truePeakLimiter`, `limiter`, `tapeSaturator`, `stereoImager`, `deesser`, `modulation`, `noiseGate`.
- Zero for: `eq`, `filter`, `utility`, `distortion`, `bassMono`, `stereoWidener`, `autoPitch`, `clipper`.
- `getChainLatency(plugins)` sums `latencySamples[p.type]` for `plugin.enabled` only.

### `validateMasteringChain`
- Walk from the tail: if the last two nodes are both limiter-type (`limiter`/`truePeakLimiter`), return `{ valid: false, error }`.
- Else `{ valid: true }`.

### `setupProjectStarter`
- Signature: `setupProjectStarter(config: { name, genre, mood?, bpm, numBars?, timeSignature?, key?, scratch? })`.
- Clamp `bpm` to `genre.bpmRange`, `numBars` to `1..64`.
- If `scratch`, return `{ ...meta, tracks: [] }`.
- Else call `generateTracksForGenre(genre, bpm, key, mood, numBars, timeSignature)` and return `{ id, name, bpm, numBars, timeSignature, key, mood, genre, tracks }`.
