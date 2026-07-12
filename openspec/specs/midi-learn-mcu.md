# Spec: MIDI Learn + Mackie Control Universal (MCU)

## Requirements

- **R1 — MIDI access.** The app can request Web MIDI access (`navigator.requestMIDIAccess`) and enumerate inputs. On platforms without Web MIDI, the feature degrades to a no-op and the UI disables Learn (web-first; native is a future bridge).
- **R2 — MIDI Learn.** Any bindable control (track volume/pan fader, master volume, transport, global/autoPitch plugin knob) exposes a "Learn" affordance. Entering Learn and moving a CC binds `cc + channel` → that control and persists the binding.
- **R3 — Live apply.** Incoming CC values drive their target in real time: track volume/pan via `PlaybackEngine.setTrackVolume/setTrackPan`, master volume via the shared-context master gain, transport via studio transport callbacks.
- **R4 — Persistence.** The CC→target map survives reload (via `projectStore`/`localStorage`, bridge-aware).
- **R5 — MCU preset.** A default Mackie Control Universal mapping (faders 1–8 → tracks 1–8 volume, jog wheel → scrub, transport buttons → play/stop/record/loop) can be applied without per-control learning.
- **R6 — Testability.** `learnCC` and `applyMidiMessage` are pure-ish and unit-testable with a mocked `navigator.requestMIDIAccess`.

## Out of scope

- MIDI *output* / Thru.
- MPE / polyphonic expression.
- Full per-plugin live-DSP CC binding (v1: mixer + master + transport + limited plugin params).
