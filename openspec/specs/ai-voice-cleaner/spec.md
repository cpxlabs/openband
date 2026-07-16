# AI Voice Cleaner

## Overview
OpenBand needs a speech-restoration plugin that removes recording artifacts from vocal takes: stationary background noise and room reverb. The AI Voice Cleaner is a **new 20th plugin type** (`voiceCleaner`) that slots into any `TrackDef`, send bus, or the master chain exactly like the existing 19 types (`src/lib/types.ts:94`). It runs two passes — a denoise pass and a dereverb pass — driven by a single `amount` control plus independent mix controls for each pass.

Because the ML inference that powers denoise/dereverb is computationally heavy and ships as a native library, the cleaner executes **local-only** on the desktop/Electron build through `OpenBandNative.runVoiceCleaner` (`src/bridge/interface.ts:20`). On web the plugin type is still present in the schema (so projects stay portable), but the UI is disabled and shows a "Desktop only" notice — mirroring the `const isWeb = Platform.OS === "web"` gate already used in `app/extractor.tsx:63`.

## Implementation Notes
- The type is added to the `PluginType` union at `src/lib/types.ts:94` as `"voiceCleaner"`.
- A new entry is added to `PLUGIN_SPECS` (`src/lib/types.ts:217`) declaring its param schema: `amount` (0–100 % master), `denoiseAmount` (0–100), `dereverbAmount` (0–100), `preserveFormants` (0–100), `noiseFloor` (-90–0 dBFS).
- `applyPluginChain` / `buildPluginGraph` (`src/lib/pluginChain.ts:89` and `:85`) are extended with a `voiceCleaner` case. On desktop the case awaits `OpenBandNative.runVoiceCleaner(buffer, params)`; on web it returns the buffer unchanged (pass-through) so the graph never breaks.
- The native inference follows the same local-only policy as the WASM instrument host (`src/lib/wasmPluginHost.ts`): no model is fetched from a server, nothing leaves the machine. The worklet-based DSP precedent is `src/lib/timeStretchVocoded.ts` (phase-vocoder AudioWorklet) and `src/lib/pedalboardDsp.ts` (guitar-pedal DSP), both of which run inside an `AudioWorkletProcessor`.
- `PluginEditor.tsx` renders the param schema automatically (per the audio-plugins spec), so no bespoke editor is required.

## Requirements

### Requirement: Voice Cleaner Plugin Type
The system MUST expose a 20th plugin type with `PluginType` key `"voiceCleaner"` and a `PluginTypeSpec` in `PLUGIN_SPECS` declaring at least `amount`, `denoiseAmount`, `dereverbAmount`, `preserveFormants`, and `noiseFloor`. It MUST be insertable, reorderable, bypassable, and automatable like the other 19 types.

#### Scenario: Insert voice cleaner into track chain
- **Given** a vocal track with an empty `plugins` array
- **When** a user selects "Add Plugin → Voice Cleaner"
- **Then** a `voiceCleaner` instance is appended to `track.plugins`
- **And** `buildPluginGraph` includes it in the enabled series

#### Scenario: Bypass without removal
- **Given** an active `voiceCleaner` plugin on a track
- **When** the user sets `enabled = false`
- **Then** audio routes around the plugin (pass-through)
- **And** the plugin remains in `track.plugins` for re-enable

### Requirement: Denoise Pass
The denoise pass MUST reduce stationary background noise (hiss, hum, fan noise, electrical buzz) from the processed buffer while preserving vocal formants so intelligibility and timbre are not damaged. Strength is controlled by `denoiseAmount`.

#### Scenario: Reduce stationary noise
- **Given** a vocal buffer mixed with -40 dBFS white noise
- **When** the `voiceCleaner` plugin processes it with `denoiseAmount = 80`
- **Then** the output stationary-noise component is attenuated versus the input
- **And** the harmonic formant structure of the voice is retained (not notched away)

#### Scenario: Zero denoise is a no-op for that pass
- **Given** a `voiceCleaner` with `denoiseAmount = 0` and `dereverbAmount = 0`
- **When** the plugin processes a clean vocal
- **Then** the denoise pass contributes no change to the signal

### Requirement: Dereverb Pass
The dereverb pass MUST attenuate room reverberation (estimated RT60 decay) in the processed buffer, tightening the vocal, with strength controlled by `dereverbAmount`. The `preserveFormants` param biases the estimator to keep direct-voice energy.

#### Scenario: Attenuate room reverberation
- **Given** a vocal recorded in a medium room (audible early-reflection tail)
- **When** the `voiceCleaner` plugin processes it with `dereverbAmount = 70`
- **Then** the output reverb tail energy (measured over the post-onset decay window) is lower than the input

#### Scenario: Formant preservation bias
- **Given** a `voiceCleaner` with `preserveFormants = 90`
- **When** the dereverb pass runs on a sibilant vocal
- **Then** the output preserves more direct-voice energy than the same pass at `preserveFormants = 0`

### Requirement: Local-Only Execution
The heavy inference MUST run exclusively through `OpenBandNative.runVoiceCleaner` on desktop/Electron. The native method takes an `AudioBuffer` (or encoded PCM) and the plugin params, and returns a cleaned buffer. On web the method is absent and the plugin MUST NOT attempt inference.

#### Scenario: Native execution on desktop
- **Given** the app running under Electron with the native bridge available
- **When** a `voiceCleaner` plugin processes a buffer
- **Then** `applyPluginChain` awaits `OpenBandNative.runVoiceCleaner(buffer, params)`

#### Scenario: Web disabled with notice
- **Given** the app running in a browser (`isWeb === true`, `app/extractor.tsx:63` pattern)
- **When** the user opens the Voice Cleaner slot
- **Then** the controls are disabled
- **And** a "Desktop only" notice is shown
- **And** `applyPluginChain` returns the buffer unchanged (pass-through)

### Requirement: SNR / RMS Quality Reporting
The cleaner MUST expose pure, deterministic helper functions that measure processing quality: `measureSNR(cleanRef, processed)` and `measureRMS(buffer)`. These functions take only numeric arrays and MUST run identically on web and desktop with no native dependency.

#### Scenario: SNR improves after cleaning
- **Given** a clean reference `clean`, a noisy signal `noisy = clean + noise`, and a cleaned output `cleaned = clean + noise * 0.3` (same length)
- **When** `measureSNR(clean, cleaned)` is compared to `measureSNR(clean, noisy)`
- **Then** the cleaned SNR is greater than or equal to the unprocessed SNR
- **And** `measureSNR(cleanRef, processed)` returns `Infinity` when `processed` equals `cleanRef` (no error), and `0` when `cleanRef` has no energy

#### Scenario: RMS is within unit range
- **Given** a normalized buffer in [-1, 1]
- **When** `measureRMS(buffer)` is called
- **Then** the returned value is in [0, 1]

### Requirement: Plugin Chain Integration
The `voiceCleaner` type MUST integrate into the existing chain builder so it participates in `getChainLatency` and serialization exactly like other types. Its native inference latency is non-zero and declared via `latencySamples`.

#### Scenario: Included in enabled chain latency
- **Given** an enabled chain `[EQ, voiceCleaner, Reverb]`
- **When** `getChainLatency(plugins)` is computed
- **Then** the result includes `latencySamples["voiceCleaner"]` plus the reverb latency
- **And** a disabled `voiceCleaner` is excluded from the sum

#### Scenario: Serializes and round-trips
- **Given** a `voiceCleaner` plugin with `denoiseAmount: 60`
- **When** `deserializePlugin(serializePlugin(plugin))` is called
- **Then** the result deep-equals the original plugin
- **And** any out-of-range param is clamped on deserialize

## Test Requirements (Vitest)
- [ ] `PLUGIN_SPECS["voiceCleaner"]` declares all required params with clamped ranges
- [ ] `buildPluginGraph()` includes an enabled `voiceCleaner`; excludes a disabled one
- [x] `measureSNR` increases (or holds) after a denoise-only pass on synthetic noisy data — **runs on web**
- [x] `measureRMS` returns a value in [0, 1] for a normalized buffer — **runs on web**
- [ ] `getChainLatency` sums `latencySamples["voiceCleaner"]` for enabled plugins only — **runs on web**
- [ ] `serializePlugin` / `deserializePlugin` round-trip deep-equals for `voiceCleaner` — **runs on web**
- [ ] `applyPluginChain` with `voiceCleaner` on web returns the buffer unchanged (pass-through) — **runs on web**
- [ ] `applyPluginChain` with `voiceCleaner` on desktop awaits `OpenBandNative.runVoiceCleaner` — **INTEGRATION, skip on web**
- [ ] UI renders disabled controls + "Desktop only" notice when `isWeb` — **INTEGRATION, skip on web**
