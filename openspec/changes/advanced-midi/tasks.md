# Tasks: Advanced MIDI

- [ ] Add `velocity` property to `MIDINote` interface in `src/lib/types.ts` (if missing).
- [ ] Implement `PanResponder` for note resizing in `src/components/PianoRoll.tsx`.
- [ ] Add Snap-to-Grid selector in `PianoRoll.tsx` and integrate rounding logic in drag events.
- [ ] Evaluate and install a SoundFont engine (`soundfont-player` or similar) via `npm install`.
- [ ] Refactor `src/lib/midiSynth.ts` to preload and map instrument names to SoundFont instruments.
- [ ] Add unit tests for grid snapping and note resizing logic.
- [ ] Verify everything passes `tsc`, `vitest`, and `npm run build`.
