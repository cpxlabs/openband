### Title
MIDI Learn + Mackie Control Universal (MCU) surface support

### Problem
OpenBand has no external-controller story. Competitors (Cubasis 3.8, BandLab Studio Max) ship MIDI Learn + MCU fader/transport surfaces; OpenBand can render a project but cannot be driven by a MIDI keyboard, pad, or control surface. `src/lib/modulationMatrix.ts` already supports LFO/env/macro modulation of params, but there is no path for **incoming MIDI CC** to move a fader, knob, or plugin param, and no MCU mapping for a control surface.

### Why
Pro users expect to mix on a physical surface and map knobs to parameters. It is one of the four next-product pillars (`openspec/changes/next-product-design`) and a frequent "is this a real DAW?" check. The playback graph is now live (`PlaybackEngine`, single shared context), so incoming CC can drive mixer node values in real time — the architecture finally supports it.

### Scope
- **MIDI access**: `navigator.requestMIDIAccess()` with graceful fallback (no-op on native/web-without-MIDI).
- **MIDI Learn**: a "Learn" affordance on any bindable control (track fader, pan, master, transport, plugin knob). Enter learn mode → user moves a CC → bind `cc+channel` → target, persisted.
- **Live apply**: incoming CC values drive mixer/transport live via `PlaybackEngine` (volume/pan) and transport callbacks; plugin-param binding v1 covers the `autoPitch`/global knobs, deeper per-plugin live param binding is a follow-up.
- **MCU preset**: a default mapping for Mackie Control Universal surfaces (faders 1–8 → tracks 1–8 volume, jog wheel → scrub, transport buttons → play/stop/record/loop).

**In scope:** Web MIDI plumbing, learn UI, persisted map, live mixer/transport binding, MCU preset.
**Out of scope:** audio/MIDI *output* (no MIDI Thru), MPE/polyphonic expr., per-plugin full live-DSP CC binding (v1 maps mixer + global + a few plugin params).

### Success metric
On web with a MIDI controller: enabling Learn on a track fader, turning a knob, then moving that knob moves the fader in real time; the binding survives reload; loading an MCU surface drives faders 1–8 and transport without per-control learning.
