# Piano Roll

## Overview
OpenBand provides a MIDI note editor (piano roll) for composing and editing note events on a track. The `PianoRoll` component (`src/components/PianoRoll.tsx`) renders an interactive grid of pitches over a time axis, supporting note creation, dragging, resizing, velocity editing, snap-to-grid, and key/scale highlighting. Notes conform to the `MIDINote` interface in `src/lib/types.ts:63` (`{ pitch, start, duration, velocity }`). There is currently no dedicated spec for the piano roll.

## Implementation Notes
`PianoRoll.tsx` is a `Modal` controlled by `visible`/`onClose`, receiving `notes: MIDINote[]`, `onChange: (notes) => void`, `numBars`, `bpm`, `keySignature`, `scale`, and `trackName` (`src/components/PianoRoll.tsx:18`). Notes are stored in beats; `totalBeats = numBars * 4` and `PX_PER_BEAT = 56` (`src/components/PianoRoll.tsx:49`). `snapValue` quantizes a beat position to `bar` (4), `beat` (1), or `16th` (0.25) (`src/components/PianoRoll.tsx:86`). `SCALE_NOTES` maps key/scale pairs to pitch-class sets, and `getScaleNotes` highlights in-scale keys (`src/components/PianoRoll.tsx:63`). Note creation/deletion/move/resize dispatch through `onChange`; `playNote`/`stopNote` from `src/lib/midiSynth.ts` audition keys.

## Requirements

### Requirement: Edit MIDI Notes
The system MUST allow creating, moving, and resizing MIDI notes, each carrying `pitch`, `start` (beats), `duration` (beats), and `velocity` (`MIDINote`, `src/lib/types.ts:63`).

#### Scenario: Create note on tap-hold
- **Given** the grid is visible with `snapMode` set
- **When** the user tap-holds an empty grid cell
- **Then** a new `MIDINote` is appended via `onChange` with snapped `start` and default `velocity: 100`
- **And** notes are re-sorted by `start` then descending `pitch`

#### Scenario: Drag note to new pitch/position
- **Given** a selected note
- **When** the user drags it
- **Then** `onChange` updates `pitch` and `start` (both snapped to the active grid)
- **And** `pitch` is clamped to `[0, 127]`

#### Scenario: Resize note length
- **Given** a selected note
- **When** the user drags its right edge
- **Then** `duration` updates via `onChange`, snapped and clamped to a minimum of `0.125` beats

### Requirement: Quantize / Snap to Grid
The system MUST quantize note positions and durations to a selectable grid resolution: bar, beat, or 1/16.

#### Scenario: Snap to 1/16
- **Given** `snapMode === "16th"`
- **When** `snapValue(2.13, "16th")` is evaluated
- **Then** it returns `2.25` (nearest 0.25 beat)

#### Scenario: Snap to bar
- **Given** `snapMode === "bar"`
- **When** `snapValue(6, "bar")` is evaluated
- **Then** it returns `4` (nearest 4-beat bar boundary)

### Requirement: Key and Scale Filtering
The system MUST visually filter/highlight keys according to the active `keySignature` and `scale`, using the `SCALE_NOTES` table.

#### Scenario: Highlight C major scale
- **Given** `keySignature === "C"` and `scale === "major"`
- **When** the keyboard renders
- **Then** only pitch classes `[0,2,4,5,7,9,11]` are highlighted as in-scale
- **And** other keys render in the default style

#### Scenario: Unknown key falls back
- **Given** an unsupported key/scale combination
- **When** `getScaleNotes` is called
- **Then** it returns the C major set as a fallback

### Requirement: Reflect to Track Region
The system MUST propagate all edits back to the owning track by calling `onChange` with the full updated `MIDINote[]` array, keeping `TrackDef.midiNotes` in sync.

#### Scenario: Edit propagates to track
- **Given** a track with `midiNotes` bound to the piano roll
- **When** a note is moved or deleted
- **Then** `onChange` receives the new array and the parent writes it to `track.midiNotes`
- **And** velocity changes from the velocity stepper also flow through `onChange`

### Requirement: Overlay Show/Hide
The system MUST render the piano roll as a dismissible modal controlled by `visible` and `onClose`.

#### Scenario: Close editor
- **Given** the piano roll modal is visible
- **When** the user taps "Close"
- **Then** `onClose` is invoked and the modal hides

## Test Requirements (Vitest)
- [ ] `snapValue` quantizes to bar/beat/16th correctly
- [ ] Note creation appends a `MIDINote` with snapped start and `velocity: 100`
- [ ] Dragging updates `pitch`/`start` snapped and clamps pitch to `[0,127]`
- [ ] Resize clamps minimum duration to `0.125`
- [ ] `getScaleNotes` highlights the correct pitch classes for a known key
- [ ] `getScaleNotes` falls back to C major for unknown keys
- [ ] `onChange` is invoked on every edit (move/resize/velocity/delete)
- [ ] `onClose` invoked on Close press
