# Proposal: Advanced MIDI & Piano Roll (Milestone 3)

## Context
Currently, OpenBand supports generating and playing MIDI tracks with a basic `PianoRoll` editor. However, the editor is rudimentary. To provide a true DAW-like experience, we need to allow users to drag-to-resize notes, adjust velocity, and snap notes to a grid (e.g., 1/4, 1/8, 1/16). Furthermore, the current MIDI synth (`midiSynth.ts`) relies on simple Web Audio oscillators. We want to integrate a SoundFont parser to provide realistic instrument sounds.

## High-Level Objectives
1. **Interactive Piano Roll**: Overhaul the `PianoRoll.tsx` component to support precise drag-to-resize for note durations and velocity adjustments.
2. **Snap to Grid**: Introduce a global or local snap-to-grid setting (1/4, 1/8, 1/16, etc.) to ensure notes are musically aligned.
3. **SoundFont Integration**: Upgrade `midiSynth.ts` to utilize a lightweight SoundFont parser (e.g., `soundfont-player` or a custom parser for `.sf2` files) so instruments like pianos and guitars sound real, rather than synthesized.
