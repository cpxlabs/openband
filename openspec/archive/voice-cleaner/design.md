# AI Voice Cleaner

## Design

- 20th plugin type (`voiceCleaner`) added to `PluginType` union and `PLUGIN_SPECS`
- Parameters: `threshold`, `highpass`, `reduction`, `mix`
- DSP: biquad highpass filter + noise gate with attack/release envelope + dry/wet mix
- Bridge stubs: `isVoiceCleanerAvailable`, `loadVoiceCleanerModel`, `unloadVoiceCleanerModel` (all return false/null)
- PluginEditor updated with `voiceCleaner` editor case
- `pluginChain.ts` updated with `voiceCleaner` case in `applyPluginGraph`
- Located: `src/lib/plugins/voiceCleaner.ts`, `src/lib/types.ts`, `src/lib/pluginChain.ts`, `src/components/PluginEditor.tsx`, `src/bridge/*`
- Test: `tests/voiceCleaner.test.ts` — spec exists, applyPluginChain works, dry/wet mix
