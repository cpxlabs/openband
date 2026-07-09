# Design: Advanced MIDI (Milestone 3)

## 1. Interactive Piano Roll
- **State Updates**: Ensure `MIDINote` objects (`{ start, duration, note, velocity }`) are deeply updated when dragged.
- **Drag-to-Resize**: Add a small handle at the right edge of each note block in `PianoRoll.tsx`. Using React Native's `PanResponder` or gesture-handler, detect horizontal dragging to update `duration`.
- **Velocity**: Add a velocity lane or an interactive element (e.g., vertical drag or a separate modal) to adjust the `velocity` property (0-127).

## 2. Snap to Grid
- **UI Element**: Add a dropdown/selector in the Piano Roll header: `[Off, 1/4, 1/8, 1/16, 1/32]`.
- **Logic**: When dragging a note's start position or resizing its duration, round the value to the nearest multiple of the snap increment (e.g., 0.25 for a 1/16 note).

## 3. SoundFont Player
- **Package**: We will introduce a lightweight Web Audio SoundFont player (e.g., `soundfont-player` from npm, or a direct fetch of instrument buffers from a public SoundFont repository if we want to avoid massive bundles).
- **Integration**: Update `src/lib/midiSynth.ts` -> `playNote()` to check if an instrument buffer exists for the track's genre/instrument. If yes, play the sampled buffer. If no, fallback to the current oscillator method.
