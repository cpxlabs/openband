# Mastering Plugins

## Overview
OpenBand's mastering stage is a dedicated post-mix bus applying chain-ordered processing: 10 preset chains, VisualEQ, LUFS metering, true-peak limiting, multiband compression, and A/B snapshot comparison (`MixManager`). Mastering operates on the summed mix before final bounce/export.

## Implementation Notes
The 10 mastering chains, their preset params, and the offline-render DSP live in `src/lib/mastering.ts` (`MASTERING_CHAIN_PRESETS` at `src/lib/mastering.ts:10`, `buildMasteringChain(preset)` at `:114`, `applyMasteringChain(...)` at `:130`). The UI-facing builder/defs are in `src/lib/masteringSuite.ts` (`buildMasteringChain()` at `:83`, `MASTERING_PLUGIN_DEFS` at `:33`). Components: `src/components/LufsMeter.tsx`, `src/components/VisualEQ.tsx`, `src/components/MixManager.tsx`, `src/components/MasteringSuite.tsx`. The real K-weighting + true-peak DSP lives in `src/lib/lufs.ts` (`measureLUFS`, `kWeight`, `truePeak`, gated loudness). `LufsMeter` consumes `measureLUFS` from a real master `AnalyserNode` (wired in `MasteringSuite.tsx` via `audioSystem`), with the `Math.random()`/`Math.sin()` simulation retained only as a fallback when no analyser is supplied. This satisfies the silence `−70` floor and the `−14 dBFS` 1 kHz tone `−14.0 ± 0.5 LUFS` scenarios (verified by `tests/lufs.test.ts`).

## Requirements

### Requirement: Master Chain Architecture
The system MUST provide a `masterChain: Plugin[]` applied to the summed output of all tracks after faders and pans.

#### Scenario: Apply mastering preset
- **Given** a mixed project with an empty master chain
- **When** user selects "Mastering → Master Rápido"
- **Then** `masterChain` is populated via `buildMasteringChain(preset)`
- **And** LUFS meter begins reporting post-master loudness

#### Scenario: Empty master chain passes through
- **Given** `masterChain = []`
- **When** audio reaches master bus
- **Then** signal passes unprocessed to output

### Requirement: Mastering Preset Chains (10)
The system MUST ship 10 named mastering chains (`MASTERING_CHAIN_PRESETS`) each mapping to an ordered `Plugin[]` with preset params: `Master Rápido`, `Master Completo`, `Rádio / Podcast`, `Loudness Maximizer`, `Acústico Natural`, `EDM Club`, `Vintage Warm`, `Modern Clean`, `Lo-Fi Vibe`, `Broadcast Ready`.

#### Scenario: List presets
- **Given** the mastering suite is initialized
- **When** user opens the master section
- **Then** all 10 preset names appear in the picker
- **And** selecting one replaces the current `masterChain`

### Requirement: VisualEQ
The system MUST render an interactive frequency-response curve (20 Hz–20 kHz) with draggable bands and a live spectrum overlay from `useAudioSampleListener`.

#### Scenario: Drag EQ band
- **Given** VisualEQ with draggable bands on master
- **When** user drags the 1 kHz band to `+6 dB`
- **Then** the curve updates in real-time
- **And** the underlying EQ plugin `gain` param is updated

#### Scenario: Spectrum overlay
- **Given** audio is playing through master
- **When** VisualEQ is open
- **Then** a live FFT spectrum is drawn behind the curve
- **And** updates at ≥ 30 fps

### Requirement: LUFS Metering
The system MUST compute Integrated LUFS, Short-Term LUFS, and True-Peak dBTP using K-weighting + sliding gated window, exposed via `LufsMeter` component.

#### Scenario: Measure silence
- **Given** no audio on master
- **When** LUFS meter runs for 3s
- **Then** Integrated LUFS reads `−∞` or `−70.0` floor
- **And** True-Peak reads `−∞`

#### Scenario: Measure tone
- **Given** a −14 dBFS 1 kHz tone on master
- **When** meter stabilizes
- **Then** Integrated LUFS ≈ `−14.0 ± 0.5`

### Requirement: A/B Snapshot Comparison (MixManager)
The system MUST allow saving up to 4 mix/master snapshots and instant A/B/X switching without audio glitch.

#### Scenario: Save snapshot A
- **Given** a tuned master chain
- **When** user clicks "Save A"
- **Then** current `masterChain` + track faders are deep-cloned into slot A

#### Scenario: Switch A→B
- **Given** snapshots A and B exist
- **When** user clicks "B"
- **Then** all mix/master params swap to B's state
- **And** playback continues without restart

### Requirement: True Peak Limiter on Master
The system MUST include a true-peak aware limiter as the final node in the default mastering chain to prevent inter-sample clipping on bounce.

#### Scenario: Bounce safety
- **Given** a master chain ending in `truePeakLimiter` at `−1.0 dBTP`
- **When** project is bounced to WAV
- **Then** no sample exceeds `−1.0 dBFS` true-peak

### Requirement: Chain Validation (no duplicate terminal limiter)
The system MUST reject any mastering chain whose final node ordering contains more than one limiter-type node (`type === 'limiter' || type === 'truePeakLimiter'`) terminating the chain. The system MUST provide `validateMasteringChain(chain: Plugin[]): { valid: boolean; error?: string }` returning `valid: false` with a descriptive `error` when the chain ends with a trailing `limiter` followed by `truePeakLimiter` (or any pairing of two terminal limiters).

> NOTE: Current `MASTERING_CHAIN_PRESETS` #4 (`Loudness Maximizer`), #6 (`EDM Club`), and #9 (`Lo-Fi Vibe`) DO end with `limiter` → `truePeakLimiter`. The spec rejects such chains, so these three presets MUST be updated to end with a single `truePeakLimiter` only (drop the trailing `limiter` node). This is an implementation target, not current behavior.

#### Scenario: Reject double terminal limiter
- **Given** a chain `[EQ, Limiter, TruePeakLimiter]`
- **When** `validateMasteringChain` is invoked
- **Then** `{ valid: false, error }` is returned

#### Scenario: Accept single terminal limiter
- **Given** a chain `[EQ, Compressor, TruePeakLimiter]`
- **When** `validateMasteringChain` is invoked
- **Then** `{ valid: true }` is returned

## Test Requirements (Vitest)
- [ ] All 10 mastering presets produce a valid `Plugin[]` via `buildMasteringChain`
- [ ] `validateMasteringChain` rejects chains with >1 terminal limiter (`limiter`+`truePeakLimiter`)
- [ ] The 3 affected presets (`Loudness Maximizer`, `EDM Club`, `Lo-Fi Vibe`) now end with a single `truePeakLimiter`
- [ ] LUFS meter returns `−70` floor on silence
- [ ] LUFS on −14 dBFS tone within ±0.5 LUFS
- [ ] MixManager stores/recalls 4 snapshots identically (deep equal)
- [ ] VisualEQ band drag updates underlying EQ param
- [ ] Bounce through master chain never exceeds ceiling
