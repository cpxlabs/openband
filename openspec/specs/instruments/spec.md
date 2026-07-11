# Instruments

## Overview
OpenBand ships four instrument engines that generate or trigger audio inside the
DAW: a polyphonic subtractive **Synth**, a sample-based **Sampler** with transient
slicing, a **ChordTrack** helper with Markov-based suggestions, and **CodeSampler**,
a token-based beat sequencer. All four produce `TrackRegion` data consumable by the
transport and plugin chain.

## Implementation Notes
- **Synth engine:** `src/lib/subtractiveSynth.ts` (`createSubtractiveSynth`, `DEFAULT_SYNTH_CONFIG`, `SUBTRACTIVE_PRESETS` at `:289`), consumed by `src/components/Synth.tsx` (plus `src/lib/synth/junoEngine.ts` and `src/lib/synth/tritonEngine.ts`).
- **Sampler:** `src/components/Sampler.tsx`.
- **ChordTrack:** `src/components/ChordTrack.tsx` + logic in `src/lib/chordTrackState.ts` (`PROGRESSION_PRESETS` at `:50`, `chordsToMIDI` at `:73`, `suggestNextChord` Markov at `:91`).
- **CodeSampler:** `src/components/CodeSampler.tsx`.

## Requirements

### Requirement: Synth Engine
The system MUST provide a 16-voice polyphonic subtractive synth with 25 presets,
exposing OSC (2×), FLT, ENV (amp + filter), LFO, and ARP sections.

| Section | Params | File |
|---------|--------|------|
| OSC | `type` (saw/square/tri/sine/noise), `detune`, `mix` | `src/lib/subtractiveSynth.ts` |
| FLT | `type` (LP/HP/BP), `cutoff`, `resonance` | `src/lib/subtractiveSynth.ts` |
| ENV | `attack`, `decay`, `sustain`, `release` (amp + filter) | `src/lib/subtractiveSynth.ts` |
| LFO | `rate`, `depth`, `target` (pitch/filter/amp) | `src/lib/subtractiveSynth.ts` |
| ARP | `mode` (up/down/random), `div` (1/4,1/8,1/16) | `src/lib/subtractiveSynth.ts` |

#### Scenario: Voice limit respects 16 polyphony
- **Given** 20 simultaneous note-ons
- **When** the 17th note triggers
- **Then** the oldest voice is stolen
- **And** active voice count never exceeds 16

#### Scenario: Load preset
- **Given** 25 factory presets
- **When** user selects "Preset → Warm Pad"
- **Then** all synth params are set from the preset map
- **And** `presets.length === 25`

#### Scenario: ARP generates note sequence
- **Given** a held chord [C4, E4, G4] with ARP mode "up", div "1/8"
- **When** transport plays
- **Then** output cycles C4→E4→G4 at eighth-note rate

### Requirement: Sampler Instrument
The system MUST provide a sample-based instrument with velocity sensitivity,
melodic keyboard mapping, transient slicing (energy-based), and stereo slicing.

#### Scenario: Map sample to key range
- **Given** a vocal chop WAV loaded
- **When** user maps it to C3–C4
- **Then** playing any key in range plays the sample pitched to that note
- **And** velocity scales amplitude

#### Scenario: Transient slice mode
- **Given** a drum loop with threshold control
- **When** user enables Slice mode
- **Then** transients are detected via energy-based detection
- **And** up to 16 pads map to detected slices

#### Scenario: Stereo slicing preserves L/R
- **Given** a stereo loop
- **When** sliced
- **Then** each slice retains original stereo image (no forced mono)

### Requirement: ChordTrack
The system MUST provide a chord helper with 10 progression presets, a harmonic
Markov chain for suggestions, and chord-to-MIDI conversion.

#### Scenario: Apply progression preset
- **Given** 10 presets (e.g. "Pop I–V–vi–IV")
- **When** user applies preset
- **Then** ChordTrack regions populate with the progression
- **And** `presets.length === 10`

#### Scenario: Markov suggestion
- **Given** current chord = Cmaj
- **When** user requests "next chord"
- **Then** suggestion comes from trained transition matrix
- **And** output is a valid chord symbol

#### Scenario: Chord to MIDI
- **Given** chord "Cm7"
- **When** converted to MIDI
- **Then** notes [C3, Eb3, G3, Bb3] are produced as `MIDINote[]`

### Requirement: CodeSampler (Token Sequencer)
The system MUST provide a token-based beat sequencer where patterns are described
as text tokens mapped to 16 pads.

#### Scenario: Parse token pattern
- **Given** token string "K..S..H....K..."
- **When** parsed
- **Then** 16 pad triggers map to kick/snare/hat positions
- **And** invalid tokens are ignored with a warning

#### Scenario: Play sequence
- **Given** a valid 16-step pattern
- **When** transport plays at BPM 120
- **Then** steps trigger at $125$ ms intervals ($60/120/16 \times 1000$)

## Test Requirements (Vitest)
- [ ] Synth: voice count ≤ 16 under stress; 25 presets valid
- [ ] Sampler: transient detection yields 1–16 slices; stereo image retained
- [ ] ChordTrack: 10 presets; Markov output valid; Cm7 → 4 notes
- [ ] CodeSampler: token parse maps 16 steps; invalid token warning
