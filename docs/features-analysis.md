# OpenBand Feature Analysis

Current feature inventory against [BandLab](https://www.bandlab.com/features) (web/mobile DAW, 100M+ creators) and [Cubasis 3.8](https://www.steinberg.net/cubasis/) (mobile DAW, iOS/Android) to identify gaps, prioritize roadmap, and guide implementation.

**Last updated:** June 22, 2026

---

## Feature Inventory

| #   | Feature                           | OpenBand                                         | BandLab Free  | BandLab Pro/Max           | Cubasis 3.8                            | Priority | Notes                                                                                                                                        |
| --- | --------------------------------- | ------------------------------------------------ | ------------- | ------------------------- | -------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Multi-track DAW                   | ✅                                               | ✅            | ✅                        | ✅                                     | —        | All three support multi-track                                                                                                                |
| 2   | **Audio recording**               | ✅                                               | ✅            | ✅                        | ✅                                     | —        | Uses `expo-audio` `useAudioRecorder`                                                                                                         |
| 3   | **MIDI import**                   | ✅                                               | ✅            | ✅                        | ✅                                     | —        | Uses `parseMidi()` + `midiToTrackRegions()`                                                                                                  |
| 4   | **MIDI editor (piano roll)**      | ✅                                               | ✅            | ✅                        | ✅                                     | —        | PianoRoll component with note add/move/resize/delete, snap, scale highlighting                                                               |
| 5   | **Virtual instruments**           | ❌                                               | ✅ Sampler    | ✅                        | ✅ Micrologue, MicroSonic, MiniSampler | **High** | BandLab: Sampler + synth; Cubasis: Micrologue ARP, MicroSonic (1100+ sounds), MiniSampler                                                    |
| 6   | **Drum machine / Step sequencer** | ✅ CodeSampler                                   | ✅ Beat Maker | ✅                        | ❌                                     | —        | OpenBand's CodeSampler is token-based; BandLab's Beat Maker is grid-based                                                                    |
| 7   | **Auto-Pitch / Vocal Tuner**      | ✅ autoPitch plugin                              | ⚠️ basic      | ✅ 18 AutoPitch effects   | ✅ Waves Tune Real-Time (IAP)          | —        | OpenBand: 6 presets; BandLab Pro: 18 effects; Cubasis: 3rd-party IAP                                                                         |
| 8   | **Noise Gate**                    | ✅ noiseGate plugin                              | ⚠️            | ✅                        | ✅                                     | —        | OpenBand: 5 presets                                                                                                                          |
| 9   | **Bass Mono**                     | ✅ bassMono plugin                               | ❌            | ❌                        | ❌                                     | Low      | Unique to OpenBand                                                                                                                           |
| 10  | **Stereo Widener**                | ✅ stereoWidener plugin                          | ❌            | ❌                        | ✅                                     | Low      | Cubasis via Master Strip                                                                                                                     |
| 11  | **Sampler / Slicing**             | ⚠️ Sample Browser                                | ✅ Sampler    | ✅                        | ✅ MiniSampler                         | **High** | OpenBand can browse/add samples but no slicing/warping                                                                                       |
| 12  | **Chord track / helper**          | ❌                                               | ❌            | ❌                        | ✅                                     | Medium   | Cubasis: chord track with progression tools                                                                                                  |
| 13  | **Collaboration / sharing**       | ❌                                               | ✅            | ✅                        | ❌                                     | **High** | BandLab: invite collaborators, cloud sync, comments; Cubasis: DAWproject export                                                              |
| 14  | **Looper / Overdub**              | ✅                                               | ✅            | ✅                        | ✅                                     | —        | Looper component with record, loop, overdub layers, 4 independent slots                                                                      |
| 15  | **Time-stretch / pitch-shift**    | ❌                                               | ✅            | ✅                        | ✅                                     | Medium   | `player.playbackRate` available in `expo-audio` but not exposed in UI                                                                        |
| 16  | **Automation**                    | ✅ Volume lanes                                  | ✅            | ✅                        | ✅                                     | —        | OpenBand: volume only; BandLab: volume + pan + effects; Cubasis: full                                                                        |
| 17  | **Plugin system**                 | ✅ 19 types                                      | ✅ limited    | ✅ 9+ effects             | ✅ AUv3 (iOS)                          | —        | See plugin table below                                                                                                                       |
| 18  | **Guitar pedal board**            | ✅ 16 pedal presets                              | ❌            | ❌                        | ✅ Amp Rack                            | —        | OpenBand: famous pedals; Cubasis 3.8: Amp Rack with amp sim                                                                                  |
| 19  | **Amp + Cab modeling**            | ✅ 20 amps, 10 cabs                              | ❌            | ❌                        | ⚠️ Amp Rack                            | —        | OpenBand: more amp models; Cubasis: newer amp sim in 3.8                                                                                     |
| 20  | **Mastering presets**             | ✅ 10 chains                                     | ✅ 4 presets  | ✅ 8 presets + EQ         | ✅ Master Strip Suite                  | —        | BandLab: intensity slider + Mastering EQ (Max); Cubasis: 4 processors                                                                        |
| 21  | **LUFS metering**                 | ✅ LufsMeter                                     | ❌            | ❌                        | ✅                                     | —        | Cubasis: Master Strip includes loudness meter                                                                                                |
| 22  | **A/B mix snapshots**             | ✅ MixManager                                    | ❌            | ❌                        | ✅                                     | —        | Cubasis: mixer snapshot save/load                                                                                                            |
| 23  | **Send buses**                    | ✅ up to 20                                      | ✅            | ✅                        | ✅                                     | —        | All three support sends                                                                                                                      |
| 24  | **Social feed**                   | ✅ Feed + Moments                                | ✅            | ✅                        | ❌                                     | —        | BandLab: 100M+ creator community                                                                                                             |
| 25  | **Stem separation**               | ✅ 4 stems                                       | ✅ 4 stems    | ✅                        | ❌                                     | —        | Both use AI; BandLab: "Splitter"; OpenBand: Demucs backend                                                                                   |
| 26  | **Export / Bounce**               | ✅ BounceDialog (desktop save dialog via bridge) | ✅            | ✅                        | ✅ WAV, AIFF, MP3                      | —        | BandLab: audio + video export; Cubasis: mixdown to MP3 since 3.6. OpenBand desktop: native save dialog via `OpenBandNative.showSaveDialog()` |
| 27  | **Project save/load**             | ✅ localStorage auto-save                        | ✅ cloud sync | ✅                        | ✅                                     | —        | OpenBand: local only; BandLab: cloud; Cubasis: local + DAWproject                                                                            |
| 28  | **Sample browser**                | ✅ SampleBrowser                                 | ✅ Loop Lib   | ✅                        | ✅ MediaBay                            | —        | Cubasis 3.0: redesigned MediaBay                                                                                                             |
| 29  | **Track grouping**                | ✅ TrackGroupManager                             | ✅            | ✅                        | ✅ Group Tracks                        | —        | All three support group/bus tracks                                                                                                           |
| 30  | **Video export**                  | ❌                                               | ❌            | ❌                        | ⚠️                                     | Low      | BandLab: video export for TikTok/IG; Cubasis: mixdown only                                                                                   |
| 31  | **AI tools**                      | ❌                                               | ❌            | ✅ AutoMix, Voice Cleaner | ❌                                     | Medium   | BandLab Pro: AI mixing/mastering; OpenBand: none                                                                                             |
| 32  | **Keyboard shortcuts**            | ✅ play/record/undo/redo/save                    | ✅            | ✅                        | ✅                                     | —        | Cubasis 3.2: keyboard shortcut support                                                                                                       |
| 33  | **Responsive layout**             | ✅ mobile/tablet/desktop                         | ✅            | ✅                        | ⚠️                                     | —        | Cubasis 3.0: UI scale presets; 3.8: portrait mode + windowing                                                                                |
| 34  | **Sidebar drawer nav**            | ✅ persistent/overlay                            | ✅            | ✅                        | ✅                                     | —        |                                                                                                                                              |
| 35  | **Tuner**                         | ✅ chromatic tuner                               | ✅            | ✅                        | ✅                                     | —        | Cubasis 3.8: built-in tuner                                                                                                                  |
| 36  | **Metronome / Click**             | ✅ Metronome                                     | ✅            | ✅                        | ✅                                     | —        | OpenBand: BPM, time sig, count-in                                                                                                            |
| 37  | **Waveform visualization**        | ✅ WaveformClip                                  | ✅            | ✅                        | ✅                                     | —        |                                                                                                                                              |
| 38  | **Audio unit / AUv3**             | ❌                                               | ❌            | ❌                        | ✅ iOS only                            | Low      | Cubasis: 3rd-party plugin support                                                                                                            |
| 39  | **Sidechain**                     | ✅                                               | ❌            | ❌                        | ✅                                     | —        | Per-track sidechain source selector, compressor sidechain filter                                                                             |
| 40  | **MIDI Learn / MCU**              | ❌                                               | ❌            | ❌                        | ✅                                     | Low      | Cubasis 3.3: MIDI Learn + Mackie Control/HUI                                                                                                 |

**Key:** ✅ = Shipped | ⚠️ = Partial / In progress | ❌ = Not implemented

---

## Detailed References

### BandLab ([blog.bandlab.com](https://blog.bandlab.com/))

**Free tier** (all users):

- Multi-track audio/MIDI DAW, Mix Editor, 4-stem Splitter
- Sampler, Beat Maker (step sequencer), Looper
- 4 Mastering presets (Universal, Fire, Clarity, Tape)
- Social feed, comments, sharing, 100M+ creator community
- Cloud sync (unlimited projects)

**Pro/Max tier** ($):

- AI tools: AutoMix (genre-based volume/pan), Voice Cleaner, FX Preset Generator (text → FX chain)
- 9 effects: Visual EQ, One Knobs (8 types), Vocal Verb, Shimmer, Bit, Clean Limiter, Gater, Shaper, Multi-Band Comp
- 18 AutoPitch effects (Essentials, Hip Hop, Hyperpop, Sci-Fi)
- 4 bonus Mastering presets (Natural, Cinematic, Spatial, Punch) + 11-step intensity slider
- Mastering EQ (Max tier)
- Video export with audio (TikTok/IG)

### Cubasis 3.8 ([steinberg.net/cubasis](https://www.steinberg.net/cubasis/) / [Sound On Sound review](https://www.soundonsound.com/reviews/steinberg-cubasis-38))

**Built-in instruments:**

- Micrologue (virtual analog synth with ARP)
- MicroSonic (1100+ pro sounds), MiniSampler
- Iconica Sketch (34 orchestral instruments, 140 articulations)
- LoFi Piano (vintage mic recordings — since 3.6)

**Built-in effects:**

- Amp Rack (guitar amp sim + effects — since 3.8)
- Master Strip Suite (EQ, Comp, Limiter, Ducker, Loudness Meter)
- 75+ effects presets (since 3.0)
- 64 I/O audio channels

**DAW features:**

- Tempo + signature track (since 3.7)
- MIDI Learn + Mackie Control/HUI (since 3.3)
- Sidechain support (since 3.3)
- Keyboard shortcut + mouse support (since 3.2)
- DAWproject import/export (since 3.7.5)
- Mixdown to MP3 + AIFF (since 3.6.5)
- Portrait mode + windowing support (since 3.8)
- Audio Unit (AUv3) support (iOS)
- Waves Tune Real-Time pitch correction (IAP)

---

## Plugin Comparison

| Category             | OpenBand  | BandLab                | Cubasis         |
| -------------------- | --------- | ---------------------- | --------------- |
| EQ                   | ✅ 8-band | ✅ Visual EQ           | ✅ Channel EQ   |
| Compressor           | ✅        | ⚠️ One Knob            | ✅              |
| Limiter              | ✅        | ✅ Clean Limiter       | ✅ Master Strip |
| Distortion           | ✅        | —                      | ✅ Amp Rack     |
| Reverb               | ✅        | ✅ Vocal Verb, Shimmer | ✅              |
| Delay                | ✅        | —                      | ✅              |
| Filter               | ✅        | —                      | ✅              |
| Modulation           | ✅        | —                      | ✅              |
| Utility              | ✅        | —                      | —               |
| Multiband Compressor | ✅        | ✅ Multi-Band Comp     | ✅              |
| Stereo Imager        | ✅        | —                      | ✅              |
| DeEsser              | ✅        | —                      | ✅              |
| Tape Saturator       | ✅        | —                      | —               |
| True Peak Limiter    | ✅        | —                      | ✅              |
| Noise Gate           | ✅        | —                      | ✅              |
| Auto-Pitch           | ✅        | ✅ 18 types            | ⚠️ Waves IAP    |
| Bass Mono            | ✅        | —                      | —               |
| Stereo Widener       | ✅        | —                      | ✅              |
| One Knob simplifiers | ❌        | ✅ 8 types             | ❌              |
| Visual EQ            | ❌        | ✅                     | ❌              |
| Vocal Verb           | ❌        | ✅                     | ❌              |
| Gater / Shaper       | ❌        | ✅                     | ❌              |
| Amp Rack             | ❌        | ❌                     | ✅              |
| **Total**            | **19**    | ~12                    | ~15+AUv3        |

---

## Responsive Breakpoints

| Breakpoint | Width      | Tab Bar     | Sidebar                 | Content Padding | Channel Width | Track Height |
| ---------- | ---------- | ----------- | ----------------------- | --------------- | ------------- | ------------ |
| Mobile     | <480px     | Bottom tabs | Hamburger overlay       | 12px            | 96px          | 80px         |
| Tablet     | 480–1023px | Bottom tabs | Hamburger overlay       | 20px            | 112px         | 80px         |
| Desktop    | ≥1024px    | Hidden      | Persistent left (180px) | 32px            | 136px         | 104px        |

---

## Test Suite (39 tests)

| File                       | Tests | What it covers                                                                                         |
| -------------------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| `tests/responsive.test.ts` | 15    | Breakpoints (mobile/tablet/desktop), contentPadding, channelWidth, tracksSidebarWidth, toolbarFontSize |
| `tests/types.test.ts`      | 13    | TrackDef, MixSnapshot, SendBus, Plugin union (19 types), TrackAmpChain structure                       |
| `tests/presets.test.ts`    | 11    | Pedal count (16), Amp count (20), Cab count (10), brand distribution, type coverage                    |

```bash
npm test        # Run all 39 tests
npx tsc --noEmit # TypeScript check (must pass before build)
```

---

## Build Plan: Close Feature Gaps

Legend: `[H]` = High priority, `[M]` = Medium, `[L]` = Low. Each phase is ordered for maximum user value per effort.

### Phase 1: Audio Recording + Time-Stretch (Effort: Medium-High)

These two features unlock the most basic music production workflows currently missing.

#### Task 1.1: Connect `RecordOptions` UI to `expo-audio` recording API

**Reference:** [expo-audio Recording docs](https://docs.expo.dev/versions/v56.0.0/sdk/audio/#recording-sounds)

**Files to modify:**

- `app/studio/[id].tsx` — Wire `toggleRecording()` to call `audioRecorder.prepareToRecordAsync()` + `record()`
- `src/components/RecordOptions.tsx` — Already takes settings; ensure quality/sampleRate presets map to `RecordingPresets`
- `src/lib/types.ts` — `RecordSettings` already defined; may need `recordingUri` field

**Implementation sketch:**

```tsx
// In studio/[id].tsx
const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
const recorderState = useAudioRecorderState(audioRecorder);

// On record button:
if (isRecording) {
  await audioRecorder.stop();
  // Create new track from recording URI
  setTracks([
    ...tracks,
    {
      id: `rec-${Date.now()}`,
      name: "Recording",
      regions: [
        {
          id: `r-${Date.now()}`,
          start: 0,
          duration: recorderState.durationMillis / 1000,
        },
      ],
      // ...
    },
  ]);
} else {
  await audioRecorder.prepareToRecordAsync();
  audioRecorder.record();
}
```

**Follow BandLab UX:** Start recording with armed track, auto-create track on stop.

#### Task 1.2: Expose playback rate controls for time-stretch/pitch-shift

**Reference:** `expo-audio` `player.playbackRate` (range: 0.1–2.0) + `setPlaybackRate(rate, pitchCorrectionQuality)`

**Files to modify:**

- `app/studio/[id].tsx` — Add rate slider to transport toolbar
- `src/components/PluginEditor.tsx` — Or expose as a per-track "Utility" plugin param

```tsx
// Example rate slider in transport
<View className="flex-row items-center gap-1">
  <Text className="text-gray-500 text-[9px]">0.5x</Text>
  <Slider
    value={playbackRate}
    onValueChange={(v) => {
      player.playbackRate = v;
    }}
    min={0.1}
    max={2.0}
  />
  <Text className="text-gray-500 text-[9px]">2x</Text>
</View>
```

**Follow Cubasis UX:** Rate control per project, pitch correction quality option.

---

### Phase 2: Piano Roll MIDI Editor (Effort: High)

Cubasis and BandLab both have full piano roll editors. This is the **highest-impact missing feature**.

#### Task 2.1: Piano roll component

**Reference:** Standard DAW piano roll (FL Studio, Cubase, BandLab)

**New file:** `src/components/PianoRoll.tsx`

**Interface:**

```tsx
interface PianoRollProps {
  notes: MIDINote[]; // { pitch: 0-127, start: number, duration: number, velocity: 0-127 }
  onChange: (notes: MIDINote[]) => void;
  snap: "bar" | "beat" | "16th";
  numBars: number;
  bpm: number;
  keySignature: string;
  scale: string;
  visible: boolean;
  onClose: () => void;
}
```

**Features to ship:**

1. Grid with note names (C0–B8) on Y axis, time on X axis
2. Draw/add notes by tapping empty cells
3. Drag to move/resize notes
4. Delete note on right-click/long-press
5. Snap to grid (bar/beat/16th)
6. Scale highlighting (highlight notes in key)

**Follow Cubasis UX:** Per-track piano roll, MIDI CC lanes, note velocity, quantize.

#### Task 2.2: MIDI playback engine

**Reference:** `expo-audio` `useAudioPlayer` + `useAudioSampleListener`

**Files:**

- `src/lib/midiSynth.ts` — Simple MIDI → audio synthesis (use Web Audio API oscillators on web, or fallback tone generator)
- `app/studio/[id].tsx` — Wire PianoRoll edits to track regions

```tsx
// MIDI → regions conversion (already have midiToTrackRegions)
// Need: PianoRoll edits → update TrackDef.regions
```

---

### Phase 3: Virtual Instruments + Sampler (Effort: High)

#### Task 3.1: Sampler instrument

**Reference:** BandLab Sampler, Cubasis MiniSampler

**New file:** `src/components/Sampler.tsx`

**Features:**

1. Drag WAV file → map to key range
2. ADSR envelope (attack, decay, sustain, release)
3. Pitch tracking across keyboard
4. Velocity sensitivity
5. 16-part multi-sample (kick, snare, hi-hat, etc. for drums)

**Use Case:** Load a vocal chop, map it across C3–C4 for a melodic sampler instrument. Or load a kick sample on C2, snare on D2 for drum rack.

#### Task 3.2: Virtual analog synth (Micrologue-style)

**Reference:** Cubasis Micrologue ARP

**New file:** `src/components/Synth.tsx`

**Features:**

1. Oscillators: saw, square, triangle, sine, noise (2 oscillators)
2. Filter: low-pass, high-pass, band-pass with cutoff + resonance
3. ADSR envelope (amp + filter)
4. LFO (rate, depth, target: pitch/filter/amp)
5. Arpeggiator (up/down/random, 1/4, 1/8, 1/16)
6. 20 presets (Bass, Lead, Pad, Pluck, etc.)

**Implementation:** Use Web Audio API `OscillatorNode` + `BiquadFilterNode` on web. For native, use `expo-audio` `AudioPlayer` with pre-rendered synth samples.

---

### Phase 4: Collaboration Basics (Effort: Medium)

#### Task 4.1: Project export/import as JSON

**Reference:** BandLab cloud sharing, Cubasis DAWproject

**Files:**

- `src/lib/projectStore.ts` — Add `exportProject()` and `importProject()` methods
- `app/(tabs)/library.tsx` — Share button → copy JSON to clipboard / download file

```tsx
function exportProject(id: string): string {
  const data = loadProject(id);
  return JSON.stringify(data, null, 2);
}

function importProject(json: string): string {
  const data = JSON.parse(json);
  const id = `import-${Date.now()}`;
  saveProject(id, data);
  return id;
}
```

#### Task 4.2: Remote project sync (optional)

**Reference:** Supabase Realtime + Storage

**Files:**

- `src/lib/supabase.ts` — Add `projects` CRUD operations
- `app/(tabs)/library.tsx` — "Published" tab showing community projects

---

### Phase 5: Visual EQ + One-Knob Simplifiers (Effort: Medium)

BandLab's Visual EQ and One Knob effects are popular because they're fast and visual.

#### Task 5.1: Visual EQ component

**Reference:** BandLab Visual EQ, Cubasis Channel EQ

**New file:** `src/components/VisualEQ.tsx`

**Features:**

1. Interactive frequency response curve (touch-drag bands)
2. 4–8 parametric bands with freq/gain/Q
3. Real-time spectrum overlay (from `useAudioSampleListener`)
4. Presets: Flat, Voice, Guitar, Bass, Master

#### Task 5.2: One Knob simplifiers

**Reference:** BandLab One Knobs (Toasty, Bassy, Brighter, Room, etc.)

**New file:** `src/components/OneKnob.tsx`

**Features:**

1. Single dial controls a multi-effect chain
2. Types: Warmth, Presence, Bass Boost, Air, Room, Punch, Lo-Fi, Telephone
3. Each maps to combinations of EQ + compressor + reverb params

---

### Phase 6: Sidechain + Looper (Effort: Medium)

#### Task 6.1: Sidechain routing

**Reference:** Cubasis 3.3 sidechain, standard DAW practice

**Files:**

- `src/lib/types.ts` — Add `sidechainSource: string | null` to `TrackDef`
- `app/studio/[id].tsx` — Sidechain source selector per track
- `src/components/PluginEditor.tsx` — Compressor sidechain filter

**Typical use case:** Kick drum sidechain-compresses bass track for "pumping" EDM effect.

#### Task 6.2: Looper / Overdub recording

**Reference:** BandLab Looper, Cubasis looper recording mode

**New file:** `src/components/Looper.tsx`

**Features:**

1. Record 1–8 bars
2. Loop immediately on stop
3. Overdub layers
4. 4 independent loop slots

---

### Phase 7: AI Tools + Polish (Effort: Low-Medium)

#### Task 7.1: AutoMix

**Reference:** BandLab AutoMix (genre-based volume/pan)

**New file:** `src/lib/automix.ts`

```tsx
function autoMix(tracks: TrackDef[], genre: string): TrackDef[] {
  // Genre-based presets for volume + pan
  const presets: Record<string, { vol: number; pan: number }[]> = {
    rock: [
      { vol: 85, pan: 0 },
      { vol: 70, pan: -30 },
      { vol: 80, pan: 0 },
    ],
    hiphop: [
      { vol: 90, pan: 0 },
      { vol: 65, pan: 0 },
      { vol: 75, pan: 0 },
    ],
    // ...
  };
  return tracks.map((t, i) => ({
    ...t,
    volume: presets[genre]?.[i]?.vol ?? t.volume,
    pan: presets[genre]?.[i]?.pan ?? t.pan,
  }));
}
```

---

## Effort Summary

| Phase | Tasks                    | Effort      | User Impact                         | Depends On               |
| ----- | ------------------------ | ----------- | ----------------------------------- | ------------------------ |
| 1     | Recording + Time-Stretch | Medium-High | **Critical** — enables recording    | —                        |
| 2     | Piano Roll               | High        | **Critical** — enables MIDI editing | Phase 1 (synth playback) |
| 3     | Sampler + Synth          | High        | High — enables virtual instruments  | Phase 2                  |
| 4     | Collaboration            | Medium      | Medium — sharing                    | —                        |
| 5     | Visual EQ + One Knobs    | Medium      | Medium — faster mixing              | —                        |
| 6     | Sidechain + Looper       | Medium      | Medium — creative tools             | Phase 1                  |
| 7     | AI Tools                 | Low-Medium  | Low-Medium — nice-to-have           | —                        |

**Recommended sprint order:**

```
Sprint 1: Phase 1 (Recording + Time-Stretch) → immediate workflow unlock
Sprint 2-3: Phase 2 (Piano Roll) → biggest feature gap closed
Sprint 4-5: Phase 3 (Sampler + Synth) → virtual instrument foundation
Sprint 6: Phase 4 (Collaboration) + Phase 5 (Visual EQ)
Sprint 7: Phase 6 (Sidechain + Looper) + Phase 7 (AI Tools)
```

---

## Reference Links

- BandLab Features: https://www.bandlab.com/features
- BandLab Blog (effects): https://blog.bandlab.com/bandlab-effects/
- BandLab Blog (mastering): https://blog.bandlab.com/bandlab-mastering-preset-intensity-controls/
- BandLab Membership: https://blog.bandlab.com/bandlab-membership-pro-max/
- Cubasis 3.8: https://www.steinberg.net/cubasis/
- Cubasis Version History: https://www.steinberg.help/r/cubasis/3.8/en/cubasis/topics/version_history_x.html
- Cubasis Sound On Sound review: https://www.soundonsound.com/reviews/steinberg-cubasis-38
- Expo SDK 56 Audio: https://docs.expo.dev/versions/v56.0.0/sdk/audio/
