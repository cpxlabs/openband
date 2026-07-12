### Architecture: Web MIDI → persisted CC map → live targets

#### 1. MIDI access layer — `src/lib/midiLearn.ts` (NEW)
- `requestMidiAccess(): Promise<MIDIAccess | null>` wrapping `navigator.requestMIDIAccess()`; returns `null` when unavailable (native / unsupported) so callers no-op gracefully.
- `listMidiInputs(): { id, name }[]` from `access.inputs`.
- `learnCC(onCaptured: (cc: number, channel: number) => void): () => void` — temporarily attaches an `onmidimessage` listener, captures the first CC (`status & 0xf0 === 0xb0`), calls `onCaptured`, and returns an unsubscribe.
- Module-level `midiMap: Map<string, MidiBinding>` where `MidiBinding = { cc: number; channel: number; target: MidiTarget }` and `MidiTarget = { type: "trackVolume"|"trackPan"|"masterVolume"|"transport"|"pluginParam"; trackId?: string; paramId?: string }`. Persisted via `projectStore`/`localStorage` (bridge-aware) so it survives reload.
- `applyMidiMessage(data: Uint8Array)` — parse `status`/`data1`(cc)/`data2`(value 0–127 → 0..1); look up `midiMap` by `cc+channel`; dispatch to the target (see §3).

#### 2. Live dispatch targets
- `trackVolume`/`trackPan` → `PlaybackEngine.setTrackVolume(trackId, v*100)` / `setTrackPan`. (PlaybackEngine already does click-free `setTargetAtTime`.)
- `masterVolume` → master gain on the shared context.
- `transport` → studio transport callbacks (`togglePlay`, `stopPlayback`, `seekRelative`, toggle record/loop) wired through a small `transportBridge`.
- `pluginParam` (v1 limited) → for `autoPitch`/global knobs, write via the same `onParamChange` path used by `OneKnob`/`PluginEditor` (re-renders stem on change).

#### 3. MCU preset — `src/lib/mcu.ts` (NEW)
- `MCU_MAP`: faders 1–8 → `trackVolume` for tracks[0..7]; jog wheel (pitch wheel / encoder) → `transport` scrub; buttons (0x90 note on) → play/stop/record/loop. `applyMcuPreset(map)` bulk-registers these bindings.
- Documented as best-effort; users can still override per-control via Learn.

#### 4. UI — Learn affordance
- A studio "MIDI" toggle (in Settings or studio toolbar) opens a small `MidiLearnPanel` (new component) listing inputs + a "Learn" mode.
- Bindable controls (track fader/pan in the mixer, master, `OneKnob`, `PluginEditor` knobs) get a small "🎹" Learn button → calls `learnCC` → persists the binding.
- Active bindings shown; allow remove.

#### 5. Reuse
- `PlaybackEngine` (live volume/pan setters), `modulationMatrix` (param→target mapping pattern via `paramToTarget`), `OneKnob`/`PluginEditor` (`modTarget`/`onParamChange`), `projectStore` (persistence), `useKeyboardShortcuts` (transport wiring pattern).
- Web MIDI is browser-only; native returns `null` and the UI disables Learn. No new dependency (Web MIDI is native browser API; `midi` types via `lib.dom` or a small local type).

### Sequence diagram (Learn)
```
User clicks Learn on fader → learnCC(cb)
User turns knob on controller → onmidimessage(status=0xB0, data1=cc, data2=val)
  → cb(cc, channel) → midiMap.set(key, {cc,channel,target}) → persist
Later: same cc arrives → applyMidiMessage → lookup → PlaybackEngine.setTrackVolume(...)
```
