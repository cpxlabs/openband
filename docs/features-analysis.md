# BandLab & Cubasis Feature Analysis

This doc compares OpenBand against BandLab (web/mobile DAW) and Cubasis (Cubase for Android/iOS) to identify gaps and prioritize roadmap.

---

## Feature Matrix

| Feature | OpenBand | BandLab | Cubasis | Priority |
|---------|----------|---------|---------|----------|
| Multi-track DAW | ✅ | ✅ | ✅ | — |
| Audio recording | ⚠️ (UI only) | ✅ | ✅ | Medium |
| MIDI import | ✅ (new) | ✅ | ✅ | — |
| MIDI editor (piano roll) | ❌ | ✅ | ✅ | High |
| Virtual instruments | ❌ | ✅ (synth, sampler) | ✅ (Micrologue, MicroSonic) | High |
| Drum machine / Step sequencer | ❌ | ✅ (Beat Maker) | ❌ | High |
| Auto-Pitch / Vocal Tuner | ❌ | ✅ | ❌ | Medium |
| Noise Gate | ❌ | ✅ | ✅ | Medium |
| Sampler / Slicing | ❌ | ✅ (Sampler) | ✅ | Medium |
| Chord track / helper | ❌ | ❌ | ✅ | Medium |
| Collaboration / sharing | ❌ | ✅ | ❌ | High |
| Mix matching | ❌ | ✅ | ❌ | Low |
| Time-stretch / pitch-shift | ❌ | ✅ | ✅ | Medium |
| Automation (full) | ✅ (basic) | ✅ | ✅ | — |
| Plugin system | ✅ (14 types) | ✅ (limited) | ✅ (AUv3) | — |
| Mastering presets | ✅ (10) | ✅ (LANDR) | ❌ | — |
| Social feed | ✅ | ✅ | ❌ | — |
| Stem separation | ✅ | ✅ | ❌ | — |
| Export / Bounce | ✅ (WAV) | ✅ | ✅ (WAV, AIFF) | — |
| Project save/load | ✅ (local) | ✅ (cloud) | ✅ | — |
| Sample browser | ✅ | ✅ (Loop Lib) | ✅ | — |
| Keyboard shortcuts | ✅ | ✅ | ❌ | — |

## Implementation Plan (Ralph Loop)

### Phase 1: Noise Gate + Auto-Pitch Plugins
- Add 2 new plugin types to `types.ts`
- Add UI editors to `PluginEditor.tsx`
- Specs with presets

### Phase 2: Drum Machine / Step Sequencer
- Grid-based 16-step drum pattern editor
- 8 pads/sounds per pattern
- Export to track regions

### Phase 3: Chord Track
- Chord progression bar editor
- Common chord library
- Visual chord indicators on timeline

### Phase 4: Collaboration Basics
- Share project as JSON export
- Import shared projects
- Credit tracking system

---

## Reference Links

- [BandLab Features](https://www.bandlab.com/features)
- [Cubasis 3](https://www.steinberg.net/cubasis/)
- [Expo SDK 56 Audio](https://docs.expo.dev/versions/v56.0.0/sdk/audio/)
