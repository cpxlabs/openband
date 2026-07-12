## 1. MIDI access + learn
- [ ] `src/lib/midiLearn.ts` — `requestMidiAccess()`, `listMidiInputs()`, `learnCC(onCaptured)`, module `midiMap` + `applyMidiMessage(data)`; persisted via `projectStore`/`localStorage` (bridge-aware).
- [ ] Graceful no-op when `navigator.requestMIDIAccess` is unavailable (native / unsupported); UI disables Learn.

## 2. Live dispatch
- [ ] `trackVolume`/`trackPan` → `PlaybackEngine.setTrackVolume/setTrackPan` (click-free).
- [ ] `masterVolume` → shared-context master gain.
- [ ] `transport` → studio transport callbacks (play/stop/seek/record/loop) via a `transportBridge`.
- [ ] `pluginParam` (v1 limited to autoPitch/global knobs) → `onParamChange` re-render path.

## 3. MCU preset
- [ ] `src/lib/mcu.ts` — `MCU_MAP` (faders 1–8 → tracks 0–7 volume, jog → scrub, buttons → transport) + `applyMcuPreset(map)`.
- [ ] Loading an MCU surface drives faders + transport without per-control learning.

## 4. UI
- [ ] `MidiLearnPanel` (new component): list inputs, Learn mode, show/remove bindings.
- [ ] Studio "MIDI" toggle + per-control "🎹" Learn button on mixer faders/pan, master, `OneKnob`, `PluginEditor` knobs.

## 5. Tests + verification
- [ ] Vitest (mock `navigator.requestMIDIAccess`): `learnCC` captures first CC; `applyMidiMessage` dispatches a known cc→volume to a fake `PlaybackEngine.setTrackVolume`; persisted map reloads.
- [ ] `npx tsc --noEmit` clean; `npx vitest run` green.
- [ ] Manual: controller fader moves track fader live; binding survives reload; MCU preset drives faders 1–8 + transport.

## Notes / dependencies
- Web-first; native path is a documented no-op (future Tauri/Electron could bridge real MIDI).
- Builds on `PlaybackEngine` (live graph) + `wire-modulation-matrix` (param→target pattern).
- No new dependency; Web MIDI types via `lib.dom` or a local `Midi` type shim.
