# Audio DSP

## Overview
OpenBand ships a real-time DSP toolkit built on Web Audio nodes and AudioWorklets: a dual-oscillator subtractive synthesizer (`subtractiveSynth.ts`), guitar-pedal DSP factories (`pedalboardDsp.ts`), a phase-vocoder / WSOLA time-stretch engine (`timeStretchVocoded.ts`), a granular pitch-independent time-stretch (`timeStretch.ts`), and onset detection + slicing (`transientDetection.ts`).

## Implementation Notes
`subtractiveSynth.ts` (`src/lib/subtractiveSynth.ts:267`) exposes `createSubtractiveSynth(config)` returning an object with `noteOn/noteOff/stopAll/setConfig/getConfig/dispose`. It hard-caps polyphony at `MAX_VOICES = 16` (`src/lib/subtractiveSynth.ts:71`) and ships `SUBTRACTIVE_PRESETS` (`src/lib/subtractiveSynth.ts:289`). `pedalboardDsp.ts` (`src/lib/pedalboardDsp.ts`) registers a `tanh` overdrive `AudioWorkletNode` and provides `createOverdriveFactory`, `createDelayNode`, `createChorusNode`, `createTremoloNode` node factories. `timeStretchVocoded.ts` (`src/lib/timeStretchVocoded.ts:187`) provides `phaseVocoderStretch` and `wsolaTimeStretch` plus `createTimeStretchNode`. `timeStretch.ts` (`src/lib/timeStretch.ts`) provides `pitchShift` and `timeStretch` via granular overlap-add. `transientDetection.ts` (`src/lib/transientDetection.ts`) provides `detectTransients` and `sliceAudioBuffer`.

## Requirements

### Requirement: Subtractive Synthesizer (Dual Osc / Filter / ADSR / LFO)
The system MUST provide a subtractive synth voice with two detunable oscillators, a biquad filter with frequency envelope, independent amp + filter ADSR envelopes, and an LFO routable to pitch/filter/amp, configured via `SubtractiveSynthConfig` (`src/lib/subtractiveSynth.ts:36`).

#### Scenario: Create synth with default config
- **Given** `createSubtractiveSynth()` with no overrides
- **When** `getConfig()` is read
- **Then** it equals `DEFAULT_SYNTH_CONFIG`
- **And** `noteOn` / `noteOff` / `dispose` are callable without throwing

#### Scenario: Voice cap enforcement
- **Given** the synth module
- **When** `MAX_VOICES` is inspected
- **Then** its value is `16`, and triggering more than 16 live notes steals the oldest voice

### Requirement: Subtractive Synth Presets
The system MUST ship `SUBTRACTIVE_PRESETS` (`src/lib/subtractiveSynth.ts:289`) — a record of at least 25 named `Partial<SubtractiveSynthConfig>` presets covering basses, leads, pads, and keys.

#### Scenario: Preset count
- **Given** `SUBTRACTIVE_PRESETS`
- **When** its entries are counted
- **Then** `Object.keys(SUBTRACTIVE_PRESETS).length === 25`

### Requirement: Pedal DSP Worklet Factories
The system MUST provide pedal DSP node factories: a `tanh` overdrive `AudioWorkletNode` (`createPedalboardNode` / `createOverdriveFactory`), plus `createDelayNode` (feedback delay), `createChorusNode` (LFO-modulated delay), and `createTremoloNode` (LFO-modulated gain).

#### Scenario: Build overdrive via factory
- **Given** an `AudioContext`
- **When** `createOverdriveFactory(drive, level)` is called and invoked with the context
- **Then** it returns an `AudioWorkletNode` named `pedalboard-processor`

#### Scenario: Build delay/chorus/tremolo
- **Given** an `AudioContext`
- **When** `createDelayNode`, `createChorusNode`, `createTremoloNode` are called
- **Then** each returns a connected `AudioNode` (delay/feedback, LFO→delay, LFO→gain)

### Requirement: Phase-Vocoder / WSOLA Time-Stretch
The system MUST provide `phaseVocoderStretch` (`src/lib/timeStretchVocoded.ts:187`) and `wsolaTimeStretch` (`src/lib/timeStretchVocoded.ts:278`) that resample an `AudioBuffer` to a new duration while preserving channel count, plus `createTimeStretchNode` (`src/lib/timeStretchVocoded.ts:347`) returning an `AudioWorkletNode`.

#### Scenario: Phase-vocoder preserves channels
- **Given** a 2-channel `AudioBuffer` and `timeStretchRatio = 1.5`
- **When** `phaseVocoderStretch(buffer, 1.5)` resolves
- **Then** the output `AudioBuffer` has the same `numberOfChannels` and a shorter length

#### Scenario: WSOLA identity at ratio 1
- **Given** an `AudioBuffer`
- **When** `wsolaTimeStretch(buffer, 1)` is called
- **Then** the same buffer instance is returned unchanged

### Requirement: Granular Pitch-Independent Time-Stretch
The system MUST provide `timeStretch` (`src/lib/timeStretch.ts:60`) and `pitchShift` (`src/lib/timeStretch.ts:1`) that change duration / transposition via granular overlap-add without altering the other dimension.

#### Scenario: Time-stretch returns resampled buffer
- **Given** an `AudioBuffer` and `rate = 2`
- **When** `timeStretch(buffer, 2)` resolves
- **Then** the output length is approximately half the input length

### Requirement: Transient Detection + Slicing
The system MUST provide `detectTransients` (`src/lib/transientDetection.ts:7`) returning onset `Transient[]` (time/energy/index), and `sliceAudioBuffer` (`src/lib/transientDetection.ts:69`) splitting an `AudioBuffer` at sample positions while preserving channel count.

#### Scenario: Detect onsets in an energetic buffer
- **Given** a synthetic `AudioBuffer` with periodic amplitude bursts
- **When** `detectTransients(buffer)` is called
- **Then** it returns a `Transient[]` with entries whose `time` increases monotonically

#### Scenario: Slice preserves channel count
- **Given** a 2-channel `AudioBuffer` and slice points
- **When** `sliceAudioBuffer(buffer, points)` is called
- **Then** every returned slice has `numberOfChannels === 2`

## Test Requirements (Vitest)
- [ ] `MAX_VOICES === 16`
- [ ] `SUBTRACTIVE_PRESETS` has 25 entries
- [ ] `createSubtractiveSynth()` exposes noteOn/noteOff/getConfig/dispose
- [ ] `createOverdriveFactory` returns a function producing an `AudioWorkletNode`
- [ ] `createDelayNode` / `createChorusNode` / `createTremoloNode` return `AudioNode`s
- [ ] `phaseVocoderStretch` output keeps channel count
- [ ] `wsolaTimeStretch(buffer, 1)` returns the same buffer
- [ ] `timeStretch(buffer, 2)` returns a buffer of ~half length
- [ ] `detectTransients` returns a `Transient[]`
- [ ] `sliceAudioBuffer` preserves `numberOfChannels`
