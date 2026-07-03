---
name: phase2-feature-expansion
description: Phase 2 implementation patterns — MIDI Learn, cloud sync auto-push, video export, One Knob simplifiers, Vocal Verb + Shimmer (project)
source: auto-skill
extracted_at: '2026-07-03T17:40:00.154Z'
---

## MIDI Learn (`src/lib/midiLearn.ts` + `PluginEditor.tsx`)

**Pattern:** Map incoming MIDI CC messages to plugin parameters with a learning mode.

```ts
interface MidiMapping {
  cc: number;
  pluginId: string;
  paramId: string;
  trackId: string;
}
```

- `processMidiCC(cc, value, state)` — finds mapping, returns `{ pluginId, paramId, trackId, normalizedValue }`
- `startLearning(target, state)` — enables learning mode with target parameter
- `stopLearning(state)` — exits learning mode
- Persistence via localStorage: `saveMappings()` / `loadMappings()`
- Integration: `PluginEditor` header has "MIDI Learn" toggle, ParamRow shows pulsing dot when learning
- Uses `navigator.requestMIDIAccess()` for Web MIDI API

## Cloud Sync Auto-Push (`src/lib/cloudSync.ts`)

**Pattern:** Debounced auto-sync of local project state to Supabase Storage.

```ts
interface CloudSyncState {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pending: boolean;
  error: string | null;
}
```

- `useCloudSync(projectId)` hook watches `projectStore.onProjectSaved` callback
- 5-second debounce: each new local save clears and reschedules the timer
- Uploads JSON to Supabase Storage bucket "projects" at `{projectId}.json`
- `syncNow(projectId)` for immediate manual sync
- Studio shows "Salvo · syncing..." or "Salvo · <error>" in save label

## Video Export (`src/lib/videoExport.ts`)

**Pattern:** Canvas waveform + audio mixdown → MediaRecorder → WebM/MP4 for TikTok/Reels.

```ts
interface VideoExportOptions {
  width: number;    // 1080
  height: number;   // 1920 (vertical)
  title: string;
  color: string;
  format: "webm" | "mp4";
}
```

- `exportVideo(tracks, bpm, duration, options, onProgress)`:
  1. Renders audio mixdown via `OfflineAudioContext`
  2. Creates canvas with waveform visualization (mirrored, playhead, beat markers)
  3. Records canvas + audio via `MediaRecorder` API
  4. Returns `{ blobUrl, blob, duration }`
- Integrated in `BounceDialog.tsx` with mode toggle (audio/video)
- Video mode shows: format selector, waveform color picker (6 presets)

## One Knob Simplifiers (`src/components/OneKnob.tsx`)

**Pattern:** Single dial → multi-effect chain. 8 types, each maps EQ + comp + reverb combos.

| Type | Effect Chain |
|------|-------------|
| Warmth | Low shelf +2dB @ 200Hz + comp 2:1 |
| Presence | Peak +3dB @ 4kHz |
| Bass Boost | Low shelf +6dB @ 80Hz |
| Air | High shelf +3dB @ 12kHz |
| Room | Reverb mix 0-40%, decay 1.5s |
| Punch | Comp 4:1, attack 10ms, makeup +3dB |
| Lo-Fi | LP 4kHz + bitcrush + reverb 20% |
| Telephone | Bandpass 300Hz-3kHz |

## Vocal Verb + Shimmer (`src/lib/types.ts`)

**Pattern:** New reverb presets with extended parameters.

- **Vocal Verb**: decay 1.8s, pre-delay 20ms, low cut 200Hz, high cut 8kHz, mix 30%
- **Shimmer**: decay 4s, pitch shift +12 semitones, modulation 30%, low cut 300Hz, mix 50%

Added parameters: `shimmerPitch` (-12 to +12 st), `modulation` (0-100%).
