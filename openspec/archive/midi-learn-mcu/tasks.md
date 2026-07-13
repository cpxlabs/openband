## 1. MIDI access + learn
- [x] `src/lib/midiLearn.ts` — `requestMidiAccess()` (guarded, null on native), `listMidiInputs()`, `learnCC(onCaptured)` (wraps `onmidimessage`, restores previous handler so live dispatch survives), `midiMap` + `bindMidi`/`unbindMidi`/`getBindings`, `saveMidiMap`/`loadMidiMap` (localStorage `openband_midi_map`, loaded at import), `setMidiTargetHandler`, `applyMidiMessage` (parses CC 0xB0 + note-on 0x90).
- [x] Graceful no-op when `navigator.requestMIDIAccess` unavailable; UI shows "MIDI not available".

## 2. Live dispatch
- [x] `trackVolume`/`trackPan` → `PlaybackEngine.setTrackVolume/setTrackPan` (click-free).
- [x] `masterVolume` → `PlaybackEngine.setMasterVolume` (added, click-free).
- [x] `transport` → studio callbacks (togglePlay/stopPlayback/seekRelative/record/loop/scrub); loop uses `isLooping()`.
- [ ] `pluginParam` — best-effort only (`console.info` + legacy per-plugin `processMidiCC` API retained); full live-DSP CC binding deferred.

## 3. MCU preset
- [x] `src/lib/mcu.ts` — `MCU_MAP` (faders 0–7 → trackVolume trackIndex 0–7, master fader 8, jog 60, transport notes 86/91/92/95) + `applyMcuPreset`.

## 4. UI
- [x] `src/components/MidiLearnPanel.tsx` — input picker, target-type selector, track/action chips, Learn button, bindings list + remove, Apply MCU Preset; exported from `components/index.ts`.
- [x] Studio 🎹 toolbar button opens the panel; dispatch wired via `setMidiTargetHandler`.

## 5. Tests + verification
- [x] `tests/midiLearn.test.ts` (5): learnCC captures first CC; bound CC dispatches value01; unbound ignored; bind/unbind + localStorage round-trip; MCU bulk-bind.
- [x] `npx tsc --noEmit` clean; `npx vitest run` green (1015 tests); `test:legacy` 24/24.

## Notes
- Web-first; native is a documented no-op.
- Builds on `PlaybackEngine` (live graph) + `wire-modulation-matrix` (`paramToTarget` pattern).
- `learnCC`/`subscribeToInputs` wrap (not overwrite) `onmidimessage` and restore the previous handler on cleanup — fixes the regression where Learn would break live dispatch.
