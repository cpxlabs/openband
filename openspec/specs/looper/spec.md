# Looper

## Overview
OpenBand provides a live looper for recording and overdubbing audio loops synced to the transport BPM. The `Looper` component (`src/components/Looper.tsx`) is a modal with multiple loop slots, each recording for a selectable number of bars. Completed loops are committed to a track region via `onCommitLoop`. There is currently no dedicated spec for the looper.

## Implementation Notes
`Looper.tsx` renders a `Modal` controlled by `visible`/`onClose`, receiving `bpm` and `onCommitLoop: (slot, bars) => void` (`src/components/Looper.tsx:12`). It maintains 4 `LoopSlot` objects (`{ id, bars, recording, hasContent, layers }`) with `SLOT_COLORS` and `BAR_OPTIONS = [1, 2, 4, 8]` (`src/components/Looper.tsx:20`). `toggleRecord(slotId)` starts/stops a slot; on stop it calls `onCommitLoop(slotId, bars)` and increments `layers` (`src/components/Looper.tsx:41`). `beatDuration` is derived as `60 / bpm` (`src/components/Looper.tsx:81`). Recording length is quantized to the chosen bar count; `clearSlot` resets content/layers.

## Requirements

### Requirement: Record Loop from Input
The system MUST allow the user to arm and record a loop into a selected slot, capturing input for the slot's configured bar length.

#### Scenario: Start recording
- **Given** a loop slot with `recording: false`
- **When** the user taps "Record"
- **Then** the slot's `recording` becomes `true`
- **And** the slot is marked the `activeSlot`

#### Scenario: Stop and commit
- **Given** a slot is recording
- **When** the user taps "Stop"
- **Then** `onCommitLoop(slotId, bars)` is invoked
- **And** the slot's `hasContent` becomes `true` and `layers` increments by 1

### Requirement: Bar-Length Selection
The system MUST let the user choose the loop length in bars from `BAR_OPTIONS` (1, 2, 4, 8) per slot, with length derived from the transport BPM.

#### Scenario: Select 4 bars
- **Given** a loop slot
- **When** the user taps the "4" bar option
- **Then** `slot.bars` is set to `4`
- **And** the displayed beat duration uses `60 / bpm` for timing context

### Requirement: Overdub Layers
The system MUST support overdubbing, where recording again on a slot with content adds a new layer rather than clearing it.

#### Scenario: Overdub existing loop
- **Given** a slot with `hasContent: true` and `layers: 1`
- **When** the user taps "Overdub"
- **Then** recording starts on the same slot
- **And** on stop `layers` becomes `2` while `hasContent` remains `true`

### Requirement: Clear Slot
The system MUST allow a recorded slot to be cleared, removing its content and layers.

#### Scenario: Clear content
- **Given** a slot with `hasContent: true`
- **When** the user taps "Clear"
- **Then** `hasContent` and `layers` reset to `false`/`0` and `recording` is `false`
- **And** if it was the `activeSlot`, `activeSlot` clears

### Requirement: Commit Loop to Region
The system MUST commit a finished loop to a track region by calling `onCommitLoop(slot, bars)` with the slot id and bar count.

#### Scenario: Commit callback payload
- **Given** a slot recorded for `2` bars
- **When** recording stops
- **Then** `onCommitLoop` is called with `(slotId, 2)`
- **And** the parent creates/updates a `TrackRegion` matching the loop length (`bars * 4` beats)

### Requirement: Overlay Show/Hide
The system MUST render the looper as a dismissible overlay controlled by `visible` and `onClose`.

#### Scenario: Close looper
- **Given** the looper modal is visible
- **When** the user taps "Close"
- **Then** `onClose` is invoked and the modal hides

## Test Requirements (Vitest)
- [ ] Starting record sets `recording: true` and `activeSlot`
- [ ] Stopping a fresh slot calls `onCommitLoop` and increments `layers`
- [ ] Overdub on a content slot keeps `hasContent` true and increments `layers`
- [ ] Bar selection updates `slot.bars` from `BAR_OPTIONS`
- [ ] `clearSlot` resets content/layers/recording
- [ ] `beatDuration` equals `60 / bpm`
- [ ] `onClose` invoked on Close press
