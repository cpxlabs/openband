# AI Automix

## Overview
OpenBand provides AI-assisted mixing: buffer analysis (`aiAutoMixAnalysis.ts`), genre-based auto-mix presets (`automix.ts`), a Markov chord assistant (`harmonicAssistant.ts`), and music-theory harmony helpers (`harmony.ts`). These power role-based mix suggestions, LUFS-calibrated gain/pan, EQ/compressor injection, and harmonic progression generation.

## Implementation Notes
`aiAutoMixAnalysis.ts` (`src/lib/aiAutoMixAnalysis.ts:67`) exports `analyzeBuffer(buffer, trackId, trackName)` returning `StemAnalysis` (RMS/peak/LUFS, spectral balance, transient density, stereo width) and `generateAutoMix(analyses)` returning `AutoMixResult` with per-role `AutoMixSuggestion[]`. `automix.ts` (`src/lib/automix.ts:355`) exports `autoMix(tracks, genre)` / `autoMixWithAnalysis` using `ROLE_PROFILES` + `PRESETS` keyed by genre (`AUTOMIX_GENRES`). `harmonicAssistant.ts` (`src/lib/harmonicAssistant.ts`) exports `suggestNextChords` (Markov), `chordsToMIDINotes`, and `analyzeChordContent`. `harmony.ts` (`src/lib/harmony.ts`) exports `SCALE_INTERVALS`, `PROGRESSION_PRESETS` (10), and `resolveProgression`.

## Requirements

### Requirement: Buffer Analysis
The system MUST analyze an `AudioBuffer` via `analyzeBuffer` (`src/lib/aiAutoMixAnalysis.ts:67`), computing RMS/peak (dB), integrated LUFS estimate, spectral balance (low/mid/high), transient density, stereo width, dynamic range, and crest factor.

#### Scenario: Analyze a synthetic buffer
- **Given** an `AudioBuffer` with known RMS/peak content
- **When** `analyzeBuffer(buffer, id, name)` is called
- **Then** the returned `StemAnalysis` has finite `rmsLevel`, `peakDb`, `lufs`
- **And** `spectralBalance` low+mid+high sums to ~1

#### Scenario: Role detection by name
- **Given** a buffer named "Kick"
- **When** `analyzeBuffer` assigns the role
- **Then** `analysis.role === "kick"`

### Requirement: Role-Based Mix Suggestions
The system MUST produce `AutoMixSuggestion`s per track via `generateAutoMix` (`src/lib/aiAutoMixAnalysis.ts:322`), with role-targeted volume, pan, EQ boosts, and compressor settings, plus a master target LUFS/peak suggestion.

#### Scenario: Suggest for a kick stem
- **Given** a `StemAnalysis` with role "kick"
- **When** `generateAutoMix([analysis])` resolves
- **Then** the suggestion targets `kick` with `volume` in [0,1] and a compressor config

### Requirement: Genre Auto-Mix Presets
The system MUST provide `autoMix(tracks, genre)` (`src/lib/automix.ts:355`) that classifies each `TrackDef` by name/spectral/transient features, then applies `ROLE_PROFILES` LUFS-calibrated volume/pan and injects EQ/compressor plugins. Supported genres are enumerated by `AUTOMIX_GENRES`.

#### Scenario: Classify and mix a kick
- **Given** a `TrackDef` named "Kick"
- **When** `autoMix([track], "rock")` is called
- **Then** the resulting track has a kick-style volume
- **And** `AUTOMIX_GENRES` includes `rock`

### Requirement: Harmonic Assistant (Markov + MIDI)
The system MUST provide `suggestNextChords` (`src/lib/harmonicAssistant.ts:70`) returning weighted Markov chord suggestions, and `chordsToMIDINotes` (`src/lib/harmonicAssistant.ts:118`) converting chord blocks + key signature into `MIDINote[]`.

#### Scenario: Suggest starter chords
- **Given** an empty progression in a major key
- **When** `suggestNextChords([])` is called
- **Then** it returns chord suggestions for the I degree

#### Scenario: Chords to MIDI notes
- **Given** a chord block progression in key "C"
- **When** `chordsToMIDINotes(blocks, "C", bpm)` is called
- **Then** the result is a non-empty `MIDINote[]` with ascending `start` times

### Requirement: Harmony Scales + Progression Presets
The system MUST provide `SCALE_INTERVALS` (`src/lib/harmony.ts:21`) for major/minor/pentatonic/blues scales and `PROGRESSION_PRESETS` (`src/lib/harmony.ts:31`) — exactly 10 presets — plus `resolveProgression` (`src/lib/harmony.ts:102`) returning MIDI pitch arrays per degree.

#### Scenario: Resolve a progression
- **Given** a `HarmonicDegrees[]` progression in key C major
- **When** `resolveProgression(progression, 60, "major")` is called
- **Then** it returns one pitch array per degree, each containing at least 3 notes

#### Scenario: Preset count
- **Given** `PROGRESSION_PRESETS`
- **When** its length is read
- **Then** it equals `10`

## Test Requirements (Vitest)
- [ ] `analyzeBuffer` returns finite rms/peak/lufs and normalized spectral balance
- [ ] `analyzeBuffer` detects role from track name ("Kick")
- [ ] `generateAutoMix` returns per-track suggestions with volume in [0,1]
- [ ] `autoMix` classifies a "Kick" track and adjusts its volume
- [ ] `AUTOMIX_GENRES` is a non-empty list including `rock`
- [ ] `suggestNextChords([])` returns I-degree suggestions
- [ ] `chordsToMIDINotes` returns non-empty `MIDINote[]`
- [ ] `PROGRESSION_PRESETS.length === 10`
- [ ] `resolveProgression` returns a pitch array per degree (>=3 notes)
