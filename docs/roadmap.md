# OpenBand Roadmap

**Last updated:** July 3, 2026

---

## ✅ Shipped (43 features)

### Core DAW
- ✅ Multi-track DAW with responsive layout (mobile/tablet/desktop)
- ✅ Audio recording (expo-audio, high quality preset)
- ✅ MIDI import + MIDI synth (Web Audio API)
- ✅ Piano roll MIDI editor (note add/move/resize/delete, snap, scale)
- ✅ Time-stretch / pitch-shift (±12 semitones, phase vocoder + granular)
- ✅ Automation lanes (volume + pan, linear/exponential curves)
- ✅ VU meters per track (green/yellow/red zones, peak hold)
- ✅ Waveform visualization (Canvas 2D with viewport culling)
- ✅ Track grouping (shared volume/mute)
- ✅ Sidechain routing (per-track source selector)
- ✅ Looper / overdub (4 independent slots)

### Instruments
- ✅ Synth (16-voice polyphonic, 25 presets, OSC/FLT/ENV/LFO/ARP)
- ✅ Sampler (velocity, melodic keyboard, transient slicing, stereo slicing)
- ✅ Chord track (10 presets, Markov suggestions, MIDI generation)
- ✅ CodeSampler (token-based beat sequencer)

### Effects & Processing
- ✅ Plugin system (19 types: EQ, comp, limiter, reverb, delay, etc.)
- ✅ Guitar pedalboard (16 famous pedals, 20 amps, 10 cabs)
- ✅ Mastering suite (10 presets, VisualEQ, LUFS meter, A/B versions)
- ✅ AutoMix (11 genres, role classification, LUFS targets)
- ✅ Multi-band EQ display (20Hz-20kHz curve, draggable bands, spectrum analyzer)

### Collaboration & Sharing
- ✅ CRDT + SSE collaboration (real-time sync, project branching)
- ✅ Social feed (posts, likes, remix, favorites)
- ✅ Project export/import (JSON, cross-platform download)
- ✅ Commit/push-to-cloud (version history, selective merge)

### Platform
- ✅ Web (Expo Router, HTML5 Audio fallback)
- ✅ Desktop (Electron with swappable bridge)
- ✅ Android (EAS build, APK)
- ✅ MiniPlayer (persistent transport controls, shared state)

---

## 🎯 Phase 1: Stabilize & Polish (Work on these first)

These are the highest-impact items that improve the core experience.

### 1.1 Pan interpolation in automation
**Files:** `src/components/AutomationLane.tsx`, `app/studio/[id].tsx`
**What:** Add interpolation modes (linear, exponential, logarithmic) for pan automation, matching volume automation.
**Effort:** Low

### 1.2 Track color picker
**Files:** `app/studio/[id].tsx`, `src/components/`
**What:** Per-track color picker (12 presets + custom) replacing the hardcoded `bg-*` colors.
**Effort:** Low

### 1.3 Undo/redo for automation edits
**Files:** `app/studio/[id].tsx`, `src/lib/history.ts`
**What:** Include automation point changes in the undo/redo history graph.
**Effort:** Medium

### 1.4 MiniPlayer seek interaction
**Files:** `src/components/MiniPlayer.tsx`
**What:** Make progress bar draggable for seeking (currently click-to-seek is broken on web).
**Effort:** Low

### 1.5 Stem-to-project workflow
**Files:** `app/extractor.tsx`, `app/studio/[id].tsx`
**What:** After stem separation, auto-create a project with 4 tracks (drums/bass/vocals/other) and open in studio.
**Effort:** Medium

---

## 🚀 Phase 2: Feature Expansion (After Phase 1)

These add new capabilities that users frequently request.

### 2.1 MIDI Learn
**Files:** `src/components/PluginEditor.tsx`, `src/lib/midiSynth.ts`
**What:** Map hardware MIDI controller knobs/faders to plugin parameters. Learning mode + persistent mapping.
**Effort:** High

### 2.2 Cloud sync (auto-push)
**Files:** `src/lib/projectStore.ts`, `src/lib/supabase.ts`
**What:** Auto-sync local projects to Supabase Storage on save. Conflict resolution via CRDT timestamps.
**Effort:** High

### 2.3 Video export
**Files:** `src/components/BounceDialog.tsx`, `src/lib/universalAudio.ts`
**What:** Export project as video (MP4) with waveform visualization + audio for TikTok/Reels.
**Effort:** High

### 2.4 One Knob simplifiers
**Files:** `src/components/OneKnob.tsx`
**What:** Single-dial effects (Warmth, Presence, Bass Boost, Air, Room, Punch, Lo-Fi, Telephone) that map to multi-effect chains.
**Effort:** Medium

### 2.5 Vocal Verb + Shimmer
**Files:** `src/lib/types.ts`, `src/components/PluginEditor.tsx`
**What:** Two new reverb types matching BandLab's signature effects.
**Effort:** Medium

---

## 🔮 Phase 3: Advanced (Long-term)

These are ambitious features that require significant architecture.

### 3.1 Audio Units (AUv3) support
**What:** Load third-party iOS audio unit plugins in Cubasis-style plugin rack.
**Effort:** Very High

### 3.2 AI Voice Cleaner
**What:** Remove background noise/reverb from vocal tracks using AI model.
**Effort:** High

### 3.3 FX Preset Generator (text → chain)
**What:** Type "warm vintage vocal" → AI generates a plugin chain with settings.
**Effort:** High

### 3.4 MCU Control Surface
**What:** Mackie Control Universal protocol for hardware mixer control.
**Effort:** High

### 3.5 Multi-user real-time collaboration
**What:** WebSocket-based live session with multiple cursors, shared playback, chat.
**Effort:** Very High

---

## Effort Summary

| Phase | Items | Total Effort | User Impact |
|-------|-------|-------------|-------------|
| 1 | 5 items | Low-Medium | **High** — polish core workflow |
| 2 | 5 items | Medium-High | **High** — new capabilities |
| 3 | 5 items | High-Very High | **Medium** — advanced features |

---

## What NOT to work on

These are explicitly deferred per user decisions:

- ❌ Online collaboration (deferred — offline-first is the focus)
- ❌ Backend route TypeScript errors (pre-existing, don't block deployment)
- ❌ `any` types in test files (acceptable in test context)
