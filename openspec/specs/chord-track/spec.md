# Chord Track

## Overview
OpenBand provides a **chord progression helper** that lets a user build a bar-timed chord sequence, apply built-in progression presets, request Markov-based next-chord suggestions, and render the sequence to MIDI notes for playback. The UI lives in `src/components/ChordTrack.tsx` (a horizontal, key-aware chord lane with preset and suggestion panels). Chord math is split across `src/lib/harmony.ts` (scales, degree resolution, key helpers), `src/lib/harmonicAssistant.ts` (weighted Markov suggestions, degree→MIDI voicing, chord analysis), and `src/lib/chordTrackState.ts` (region model, symbol-based progression presets, voicing, chord→MIDI, transition matrix).

## Implementation Notes
The `ChordTrack` component operates on `ChordBlock[]` (`{ id, degree, quality, beats }`) and is degree/scale relative: chord names resolve against the current `keySignature` via `keyToRootNote` and `SCALE_INTERVALS` (`src/lib/harmony.ts`). Progression presets shown in the component come from `PROGRESSION_PRESETS` in `src/lib/harmony.ts` (10 presets keyed by scale degree + `ChordQuality`), while `src/lib/chordTrackState.ts` carries a parallel, absolute-root region model (`ChordRegion`) plus its own `PROGRESSION_PRESETS` (10 presets in beats). Two chord→MIDI paths exist: `chordsToMIDINotes` (`src/lib/harmonicAssistant.ts`, degree-relative, key-aware) and `chordsToMIDI` (`src/lib/chordTrackState.ts`, region-based, absolute root). Next-chord suggestions use the weighted `MAJOR_MARKOV` / `MINOR_MARKOV` tables via `suggestNextChords` (`src/lib/harmonicAssistant.ts`) and the preset-derived transition matrix via `suggestNextChord` / `suggestNextChordSymbol` (`src/lib/chordTrackState.ts`). Neither `chordTrackState.ts` nor `harmony.ts` had a prior spec (the instruments spec covers Synth/Sampler/CodeSampler, not ChordTrack).

## Requirements

### Requirement: Apply Progression Preset
The system MUST let a user apply a named progression preset that populates the chord lane with bar-timed chord blocks/regions for the current key. Presets are declared in `PROGRESSION_PRESETS` (`src/lib/harmony.ts` as scale-degree + quality, and `src/lib/chordTrackState.ts` as absolute root + beats). Applying a preset MUST fill up to the available bars (`numBars * 4` beats) and replace the existing sequence.

#### Scenario: Fill chord lane from preset
- **Given** an empty chord lane with `numBars = 4` (16 beats) in key `C`
- **When** the user selects the "Pop Clássico" preset (`id: 'pop-classic'`)
- **Then** `applyPreset` builds `ChordBlock[]` from `preset.degrees`, repeating until the total beats reach `numBars * 4`
- **And** `onChange` is called with the new sequence and the preset panel closes

#### Scenario: Preset never overflows available bars
- **Given** a preset whose repeated length would exceed `numBars * 4`
- **When** the preset is applied
- **Then** the last chord's `beats` is truncated so the summed beats do not exceed the total

### Requirement: Markov Chord Suggestion
The system MUST suggest likely next chords from the recent chord context using weighted Markov tables. `suggestNextChords(recent, isMinor, maxSuggestions)` (`src/lib/harmonicAssistant.ts`) MUST return up to `maxSuggestions` `ChordSuggestion` entries (`degree`, `quality`, `probability`, roman-numeral `label`), selecting the table by `isMinor`. `src/lib/chordTrackState.ts` MUST also expose a preset-derived transition matrix via `buildChordTransitionMatrix` and `suggestNextChordSymbol`.

#### Scenario: Suggest from last chord
- **Given** a progression ending on degree `0` quality `maj` in a major key
- **When** `suggestNextChords(recent, false, 4)` is called
- **Then** the result draws from `MAJOR_MARKOV["0:maj"]` mapped to `ChordSuggestion` objects
- **And** each suggestion carries a `probability` (weight) and a roman-numeral `label`

#### Scenario: Empty context returns starters
- **Given** an empty progression
- **When** `suggestNextChords([], true, 3)` is called
- **Then** starter suggestions from `MINOR_MARKOV["0:min"]` are returned (up to 3)

### Requirement: Chord to MIDI Conversion
The system MUST convert the chord sequence to `MIDINote[]` for playback. `chordsToMIDINotes(chords, keySignature, bpm, octave, velocity)` (`src/lib/harmonicAssistant.ts`) MUST resolve each block's degree against the key scale, build a voicing per `ChordQuality`, and place notes at `beat * (60/bpm)` seconds with duration `beats * (60/bpm)`. `chordsToMIDI(regions, bpm, velocity)` (`src/lib/chordTrackState.ts`) MUST render `ChordRegion[]` using `buildVoicing(root, quality, inversion)`.

#### Scenario: Render blocks to timed notes
- **Given** a two-block sequence in key `C` at `120` bpm
- **When** `chordsToMIDINotes` is called
- **Then** it returns one `MIDINote` per voicing pitch with `start`/`duration` in seconds derived from `beats`
- **And** the second block starts after the first block's beats

#### Scenario: Voicing reflects quality and inversion
- **Given** a `ChordRegion` with `quality: "maj7"` and `inversion: 1`
- **When** `chordsToMIDI` calls `buildVoicing`
- **Then** the voicing contains the `maj7` intervals `[0,4,7,11]` offset from root
- **And** the lowest note is raised an octave for the requested inversion

### Requirement: Key & Scale Aware Naming
Chord blocks are degree-relative and MUST resolve to concrete note names and pitches from the current key. `keyToRootNote` and `getDefaultScaleType` (`src/lib/harmony.ts`) determine the tonic and scale; minor keys (`key.includes("m")`) use `natural_minor` intervals, major keys use `major`. Displayed chord names and rendered MIDI MUST reflect the selected `keySignature`.

#### Scenario: Same degree, different key
- **Given** a chord block at degree `0`, quality `maj`
- **When** the `keySignature` changes from `C` to `G`
- **Then** the resolved root note and displayed chord name change from `C` to `G`
- **And** `chordsToMIDINotes` places pitches relative to the new tonic

## Test Requirements (Vitest)
- [ ] `PROGRESSION_PRESETS` (harmony.ts) contains 10 presets, each with non-empty `degrees`
- [ ] `PROGRESSION_PRESETS` (chordTrackState.ts) contains 10 presets, each with non-empty `chords`
- [ ] `applyPreset`-style fill never exceeds `numBars * 4` total beats
- [ ] `suggestNextChords([], false, 4)` returns starter suggestions with `probability` and `label`
- [ ] `suggestNextChords(recent, true, n)` selects `MINOR_MARKOV` and returns at most `n` entries
- [ ] `buildChordTransitionMatrix` produces a non-empty matrix; `suggestNextChordSymbol` returns a known symbol
- [ ] `chordsToMIDINotes` returns notes with `start`/`duration` scaled by `60/bpm`
- [ ] `chordsToMIDI` returns one note per voicing pitch per region
- [ ] `buildVoicing` reflects the `CHORD_INTERVALS` for each `ChordQuality` and applies inversion
- [ ] Changing `keySignature` changes resolved roots via `keyToRootNote` / `getScale`
