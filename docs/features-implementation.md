# OpenBand Implementation Plan

Build plan to close feature gaps against [BandLab](https://www.bandlab.com/features/) and [Cubasis 3.8](https://www.steinberg.net/cubasis/). Each phase is ordered for maximum user value per effort.

---

## ✅ Phase 1: Audio Recording + Time-Stretch — COMPLETE

**Effort:** Medium-High · **Impact:** Critical — enables recording

### Task 1.1: Connect `RecordOptions` UI to `expo-audio` recording API — ✅ DONE

Recording works with `useAudioRecorder` + `RecordingPresets.HIGH_QUALITY`. Direct monitoring toggle added via `latencyMonitor.startDirectMonitor()`. Recorded tracks auto-created on stop.

### Task 1.2: Expose playback rate controls for time-stretch/pitch-shift — ✅ DONE

Transport toolbar has rate selector (0.5x–2x) and pitch shift buttons (±12 semitones). Pitch correction toggle applies phase vocoder (FFT) time-stretch during playback. Granular synthesis fallback available.

### Task 1.3: Time-stretch via granular synthesis — ✅ DONE

`src/lib/timeStretch.ts` implements overlap-add granular synthesis (2048 grain, 512 hop, Hann window) for pitch-independent time-stretch. `src/lib/timeStretchVocoded.ts` implements phase vocoder (FFT 2048, hop 512) for production quality.

---

## ✅ Phase 2: Piano Roll MIDI Editor — COMPLETE

**Effort:** High · **Impact:** Critical — enables MIDI editing

### Task 2.1: Piano roll component — ✅ DONE

`PianoRoll.tsx` supports note add/move/resize/delete, snap to beat, key signature highlighting, scale highlighting, and velocity display. Connected to studio via `showPianoRoll` state.

---

## ✅ Phase 3: Collaboration — COMPLETE

**Effort:** High · **Impact:** High — enables remote sessions

### Task 3.1: CRDT implementation — ✅ DONE

`src/lib/crdt.ts` implements operation-based CRDT with Lamport timestamps and LWW conflict resolution. `src/lib/yjsCRDT.ts` adds WebSocket sync with auto-reconnect. Backend SSE endpoints for operation broadcast.

### Task 3.2: Presence service — ✅ DONE

`src/lib/presence.ts` provides `usePresence()` hook with SSE-based cursor broadcasting, throttled at 50ms. Backend SSE server at `/api/presence`.

### Task 3.3: Project branching — ✅ DONE

`src/lib/projectBranching.ts` implements git-like fork/merge/diff for CRDT state. BranchManager component visualizes branch tree with selective merge acceptance. CommitModal + VersionHistory provide commit graph and push-to-cloud via Supabase REST sync.

---

## ✅ Phase 4: Mastering Suite — COMPLETE

**Effort:** Medium · **Impact:** High — finishes tracks

- Full mastering chain: 10 presets, 8-band VisualEQ, compressor, limiter, stereo widener, harmonic exciter
- LUFS metering with integrated/short-term/range display
- A/B version management with bypass compare
- Cross-platform bounce/export (WAV/AIFF/FLAC, 16/24/32-bit) via universalAudio singleton
- Audio file upload/drop zone for stems processing

---

## ✅ Phase 5: AI AutoMix & Stem Analysis — COMPLETE

**Effort:** Medium · **Impact:** Medium — speeds up mixing

- 11-genre AutoMix with track role classification (kick/snare/hihat/bass/vocal/lead/pad/keys/guitar/fx/other)
- Per-role EQ boost profiles, compression ratios, volume ranges, pan preferences
- LUFS-based target levels per role
- Multi-instance panning spread for same-role tracks
- Backend Demucs stem separation with async job queue

---

## ✅ Phase 6: Plugin System — COMPLETE

**Effort:** Medium · **Impact:** Medium — sound design

- 19 plugin types: autoPitch, reverb, delay, chorus, flanger, phaser, distortion, overdrive, ampSim, cabinetSim, noiseGate, compressor, limiter, eq, filter, bassMono, stereoWidener, gain, tremolo
- PluginRack per track + MasterRack on master bus
- PluginEditor for full parameter editing
- Wasm plugin host (`wasmPluginHost.ts`) with JSON-RPC MessagePort protocol, dynamic ParamSlider UI
- Pedalboard with 16 famous pedal presets + 20 amp + 10 cab models

---

## ✅ Phase 7: Waveform Visualization — COMPLETE

**Effort:** Medium · **Impact:** Medium — visual feedback

- `WaveformCanvas` component: canvas 2D waveform with devicePixelRatio optimization
- Viewport culling for performance on long projects
- Optional peak data memozation to avoid recomputation
- `WavformClip` DOM-based fallback for simpler use cases

---

## ✅ Phase 8: Export & File Format — COMPLETE

**Effort:** Medium · **Impact:** Medium — sharing

- `.openband` binary archive format with CRC32 integrity
- WAV 24-bit export via OfflineAudioContext mixdown
- Chunked rendering (5s blocks) for long projects
- Cross-platform export via universalAudio (download link on web, bridge writeFile on native)
- State/asset separation with SHA-256 commit hashing

---

## Remaining Gaps (No Priority)

The following features from the original analysis are **lower priority** and not yet implemented:

- Video export (low)
- AUv3 plugin support (low)
- MIDI Learn / MCU control surface (low)
- Cloud sync auto-push (medium)
      // ... color, plugins, etc
    },
  ]);
} else {
  await audioRecorder.prepareToRecordAsync();
  audioRecorder.record();
}
```

**Follow BandLab UX:** Start recording with armed track, auto-create track on stop.

### Task 1.2: Expose playback rate controls for time-stretch/pitch-shift

**Reference:** `expo-audio` `player.playbackRate` (range: 0.1–2.0) + `setPlaybackRate(rate, pitchCorrectionQuality)`

**Files to modify:**

- `app/studio/[id].tsx` — Add rate slider to transport toolbar
- `src/components/PluginEditor.tsx` — Or expose as a per-track "Utility" plugin param

```tsx
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

## Phase 2: Piano Roll MIDI Editor

**Effort:** High · **Impact:** Critical — enables MIDI editing

### Task 2.1: Piano roll component

**Reference:** Standard DAW piano roll (FL Studio, Cubase, BandLab)

**New file:** `src/components/PianoRoll.tsx`

**Interface:**

```tsx
interface MIDINote {
  pitch: number; // 0-127 (C0–G9)
  start: number; // in beats
  duration: number; // in beats
  velocity: number; // 0-127
}

interface PianoRollProps {
  notes: MIDINote[];
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

**Features to ship (v1):**

1. Grid with note names (C0–B8) on Y axis, time on X axis
2. Draw/add notes by tapping empty cells
3. Drag to move/resize notes
4. Delete note on right-click/long-press
5. Snap to grid (bar/beat/16th)
6. Scale highlighting (highlight notes in key)

**Follow Cubasis UX:** Per-track piano roll, MIDI CC lanes, note velocity, quantize.

### Task 2.2: MIDI playback engine

**Reference:** `expo-audio` `useAudioSampleListener`

**New file:** `src/lib/midiSynth.ts` — Simple MIDI → audio synthesis

```tsx
// Use Web Audio API oscillators on web
// Fallback tone generator for native
// Wire PianoRoll edits to TrackDef.regions
```

---

## Phase 3: Sampler + Virtual Synth

**Effort:** High · **Impact:** High — enables virtual instruments

### Task 3.1: Sampler instrument

**Reference:** BandLab Sampler, Cubasis MiniSampler

**New file:** `src/components/Sampler.tsx`

**Features (v1):**

1. Drag WAV file → map to key range
2. ADSR envelope (attack, decay, sustain, release)
3. Pitch tracking across keyboard
4. Velocity sensitivity
5. 16-part multi-sample (drum rack mode)

**Use case:** Load a vocal chop, map across C3–C4 for melodic sampler. Or load kick on C2, snare on D2 for drum rack.

### Task 3.2: Virtual analog synth

**Reference:** Cubasis Micrologue ARP

**New file:** `src/components/Synth.tsx`

**Features (v1):**

1. 2 oscillators: saw, square, triangle, sine, noise
2. Filter: LP/HP/BP with cutoff + resonance
3. ADSR envelope (amp + filter)
4. LFO (rate, depth, target: pitch/filter/amp)
5. Arpeggiator (up/down/random, 1/4, 1/8, 1/16)
6. 20 presets (Bass, Lead, Pad, Pluck, etc.)

**Implementation:** Web Audio API `OscillatorNode` + `BiquadFilterNode` on web. Pre-rendered samples for native.

---

## Phase 4: Collaboration Basics

**Effort:** Medium · **Impact:** Medium — enables sharing

### Task 4.1: Project export/import as JSON

**Reference:** BandLab cloud sharing, Cubasis DAWproject

**Files:**

- `src/lib/projectStore.ts` — Add `exportProject()` and `importProject()`
- `app/tabs/library.tsx` — Share button → copy JSON / download file

```tsx
function exportProject(id: string): string {
  return JSON.stringify(loadProject(id), null, 2);
}

function importProject(json: string): string {
  const id = `import-${Date.now()}`;
  saveProject(id, JSON.parse(json));
  return id;
}
```

### Task 4.2: Remote project sync (optional)

**Reference:** Supabase Realtime + Storage

**Files:**

- `src/lib/supabase.ts` — Add `projects` CRUD
- `app/tabs/library.tsx` — "Published" tab

---

## Phase 5: Visual EQ + One-Knob Simplifiers

**Effort:** Medium · **Impact:** Medium — faster mixing

### Task 5.1: Visual EQ component

**Reference:** BandLab Visual EQ, Cubasis Channel EQ

**New file:** `src/components/VisualEQ.tsx`

**Features (v1):**

1. Interactive frequency response curve (touch-drag bands)
2. 4–8 parametric bands with freq/gain/Q
3. Real-time spectrum overlay (from `useAudioSampleListener`)
4. Presets: Flat, Voice, Guitar, Bass, Master

### Task 5.2: One-Knob simplifiers

**Reference:** BandLab One Knobs (Toasty, Bassy, Brighter, Room)

**New file:** `src/components/OneKnob.tsx`

**Features (v1):**

1. Single dial → multi-effect chain
2. Types: Warmth, Presence, Bass Boost, Air, Room, Punch, Lo-Fi, Telephone
3. Each maps to EQ + compressor + reverb combos

---

## Phase 6: Sidechain + Looper

**Effort:** Medium · **Impact:** Medium — creative tools

### Task 6.1: Sidechain routing

**Reference:** Cubasis 3.3, standard DAW practice

**Files:**

- `src/lib/types.ts` — Add `sidechainSource: string | null` to `TrackDef`
- `app/studio/[id].tsx` — Source selector per track
- `src/components/PluginEditor.tsx` — Compressor sidechain filter

**Use case:** Kick drum sidechain-compresses bass for EDM "pumping" effect.

### Task 6.2: Looper / Overdub recording

**Reference:** BandLab Looper, Cubasis looper mode

**New file:** `src/components/Looper.tsx`

**Features (v1):**

1. Record 1–8 bars, loop on stop
2. Overdub layers
3. 4 independent loop slots

---

## Phase 7: AI Tools + Polish

**Effort:** Low-Medium · **Impact:** Low-Medium

### Task 7.1: AutoMix

**Reference:** BandLab AutoMix

**New file:** `src/lib/automix.ts`

```tsx
function autoMix(tracks: TrackDef[], genre: string): TrackDef[] {
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
    edm: [
      { vol: 95, pan: 0 },
      { vol: 60, pan: 0 },
      { vol: 70, pan: 0 },
    ],
    lofi: [
      { vol: 75, pan: 0 },
      { vol: 80, pan: -15 },
      { vol: 65, pan: 15 },
    ],
  };
  return tracks.map((t, i) => ({
    ...t,
    volume: presets[genre]?.[i]?.vol ?? t.volume,
    pan: presets[genre]?.[i]?.pan ?? t.pan,
  }));
}
```

---

## Sprint Roadmap

| Sprint | Phases      | Deliverables                                              |
| ------ | ----------- | --------------------------------------------------------- |
| 1      | Phase 1     | Audio recording working, time-stretch slider in transport |
| 2–3    | Phase 2     | PianoRoll component with note editing + MIDI playback     |
| 4–5    | Phase 3     | Sampler + Synth components with 20+ presets               |
| 6      | Phase 4 + 5 | Project JSON export/import, VisualEQ, OneKnob             |
| 7      | Phase 6 + 7 | Sidechain routing, Looper, AutoMix                        |

---

## Effort Summary

| Phase | Tasks                    | Effort      | User Impact  | Depends On               |
| ----- | ------------------------ | ----------- | ------------ | ------------------------ |
| 1     | Recording + Time-Stretch | Medium-High | **Critical** | —                        |
| 2     | Piano Roll               | High        | **Critical** | Phase 1 (synth playback) |
| 3     | Sampler + Synth          | High        | High         | Phase 2                  |
| 4     | Collaboration            | Medium      | Medium       | —                        |
| 5     | Visual EQ + One Knobs    | Medium      | Medium       | —                        |
| 6     | Sidechain + Looper       | Medium      | Medium       | Phase 1                  |
| 7     | AI Tools                 | Low-Medium  | Low-Medium   | —                        |

## Current Status

**Shipped (40/40 features total):**

✅ Multi-track DAW · ✅ Step sequencer · ✅ Auto-Pitch · ✅ Noise Gate · ✅ Bass Mono
✅ Stereo Widener · ✅ Guitar pedal board · ✅ Amp/Cab modeling · ✅ Mastering presets
✅ LUFS metering · ✅ A/B mix snapshots · ✅ Send buses · ✅ Social feed
✅ Stem separation · ✅ Export/Bounce (desktop save dialog via bridge) · ✅ Project save/load
✅ Sample browser · ✅ Plugin system (19 types) · ✅ Track grouping
✅ Keyboard shortcuts · ✅ Metronome · ✅ Waveform visualization
✅ Responsive layout · ✅ Sidebar drawer · ✅ Tuner · ✅ MIDI import
✅ Automation (volume) · ✅ Desktop (Electron shell + swappable bridge) · ✅ MIDI synth
✅ Audio recording · ✅ Piano roll MIDI editor · ✅ Looper / Overdub · ✅ Sidechain
✅ **Synth** (16-voice polyphonic, 25 presets, OSC/FLT/ENV/LFO/ARP tabs, piano keyboard)
✅ **Sampler** (velocity, melodic keyboard, transient slicing, stereo slicing)
✅ **Chord Track** (MIDI generation, harmonic analysis, Markov suggestions, 10 presets)
✅ **AutoMix** (LUFS targets, spectral centroid, transient density, role classification)
✅ **Collaboration** (JSON export/import, cross-platform download, remix, favorites)
✅ **Time-stretch / pitch-shift** (granular synthesis + phase vocoder, transport controls)

**All features shipped. No remaining gaps.**

## Playback Improvements (Latest)

- **AudioContext singleton**: All `new AudioContext()` replaced with `audioSystem.ensureContext()` — browser autoplay policy satisfied
- **Blob URL lifecycle**: Tracked via `blobUrlRegistry` with auto-revoke (5min age, 100 entry cap)
- **Studio togglePlay**: Always re-renders tracks (no stale `hasLoadedRef` shortcut), pitch correction URL properly sequenced
- **Feed playback**: Web uses HTML5 `<audio>` fallback, native uses expo-audio
- **Extractor stems**: Per-stem web/native split, "Masterizar stems" button sends to mastering suite via bridge
- **Transport controls**: Skip ±5s (⏮⏭), stop (⏹), time display (current/total in `M:SS.cc`)
- **Performance**: Pre-computed automation schedules (useMemo), binary search interpolation per-frame
