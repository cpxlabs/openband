# Tuner

## Overview
OpenBand includes a chromatic tuner overlay for tuning instruments (guitar and bass). The `Tuner` component (`src/components/Tuner.tsx`) is a modal that detects the nearest note and cents offset from an input frequency, displays it against a reference tuning, and supports switching between guitar and bass reference sets. There is currently no dedicated spec for the tuner.

## Implementation Notes
`Tuner.tsx` renders a `Modal` controlled by `visible`/`onClose` (`src/components/Tuner.tsx:63`). It defines `GUITAR_STANDARD` and `BASS_STANDARD` reference tunings (`src/components/Tuner.tsx:10`), an `ALL_NOTES` table of 12 chromatic notes with base frequencies (`src/components/Tuner.tsx:26`), and `noteNameFromFreq(freq)` which converts a frequency to `{ name, octave, cents }` using A4 = 440 Hz as the reference (`src/components/Tuner.tsx:41`). The component currently simulates an input frequency on a `setInterval` tick for demonstration; the displayed note, frequency, and cents bar update from `noteNameFromFreq(simFreq)`. In-tune is defined as `|cents| <= 5` (`src/components/Tuner.tsx:103`).

## Requirements

### Requirement: Chromatic Note Display
The system MUST display the detected note name, octave, and frequency, derived from the input signal frequency via `noteNameFromFreq`.

#### Scenario: Detect nearest note
- **Given** an input frequency of `440 Hz`
- **When** `noteNameFromFreq(440)` is evaluated
- **Then** it returns `{ name: "A", octave: 4, cents: 0 }`

#### Scenario: Detect off-pitch note
- **Given** an input frequency of `446 Hz`
- **When** `noteNameFromFreq(446)` is evaluated
- **Then** it returns a note near A4 with a positive cents offset

### Requirement: Cents Offset and In-Tune Indicator
The system MUST compute the cents deviation between the input frequency and the target note frequency, and flag in-tune when the absolute offset is within a threshold (±5 cents).

#### Scenario: In-tune threshold
- **Given** `|cents| <= 5`
- **When** the tuner renders
- **Then** the note and indicator are shown in the "in-tune" style (`isInTune === true`)
- **And** the label reads "✓ Afinado"

#### Scenario: Sharp indicator
- **Given** `cents > 5`
- **When** the tuner renders
- **Then** the offset bar and label reflect a sharp (♯) condition

### Requirement: Reference Tuning Display
The system MUST display the reference tuning notes and their frequencies, and allow toggling between guitar and bass reference sets.

#### Scenario: Switch instrument reference
- **Given** the tuner is open
- **When** the user taps "Baixo"
- **Then** `instrument` becomes `"bass"` and the reference row shows `BASS_STANDARD` (E1, A1, D2, G2)
- **And** the active string highlight matches against the bass tuning

### Requirement: Overlay Show/Hide
The system MUST render the tuner as a dismissible overlay controlled by `visible` and `onClose`.

#### Scenario: Open and close
- **Given** `visible === false`
- **When** `visible` is set to `true`
- **Then** the `Modal` becomes visible
- **And** tapping the close control or the backdrop invokes `onClose`

#### Scenario: Reset on hide
- **Given** the tuner is visible with a simulated frequency
- **When** `visible` becomes `false`
- **Then** the simulated frequency and active-string state reset to neutral

## Test Requirements (Vitest)
- [ ] `noteNameFromFreq(440)` returns A4 with 0 cents
- [ ] `noteNameFromFreq` maps frequencies across all 12 chromatic notes
- [ ] A frequency within ±5 cents of a target is reported in-tune
- [ ] A sharp frequency yields a positive cents value
- [ ] `noteNameFromFreq(0)` returns a neutral placeholder note
- [ ] Toggling instrument swaps the reference tuning set
- [ ] `onClose` is invoked on backdrop press and close control
