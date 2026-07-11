# Design: Web Player Studio Audio Playback Overhaul

## Architecture Overview

```
┌─────────────────────────┐   togglePlay / seekRelative / stopPlayback
│  Studio (app/studio/[id])│──────────────────────────────┐
└─────────────────────────┘                               │
            │ render request (tracks, buses, bpm, mood)     ▼
   ┌────────────────────────────────────────────────────────────┐
   │  UniversalAudioSystem (src/lib/universalAudio.ts)             │
   │   • ensureContext()  → single shared AudioContext (output)   │
   │   • renderMixdown(tracks, {bpm, mood, buses})                │
   │        - MIDI notes  → midiSynth voices                      │
   │        - audio regions (url) → decoded + scheduled           │
   │        - returns { buffer, hash }                            │
   │   • cache: Map<contentHash, { url, blob, buffer }>           │
   │   • blobUrlRegistry: tracked URLs + createTrackedBlob()      │
   └────────────────────────────────────────────────────────────┘
            │ blob URL                                      ▲
            ▼                                               │ HTMLAudioElement
   ┌──────────────────────┐   play/pause/seek           (useWebAudioPlayer)
   │ useWebAudioPlayer     │──────────────────────────────┘
   │  (src/hooks/...)       │
   └──────────────────────┘
            │ currentTime (single source of truth for clock)
            ▼
   ┌──────────────────────┐  onClockTick → currentBeat
   │ clockManager          │  reads HTMLAudioElement.currentTime
   └──────────────────────┘
```

## Key Changes

### 1. Unified render entry point
Replace direct `renderTracksToUrl()` calls in `togglePlay` and `rerenderAfterMuteSolo` with `audioSystem.renderMixdown(tracks, { bpm, mood, buses })`.

- `renderMixdown` already exists (`src/lib/universalAudio.ts:202-212`) and supports `region.url` (audio regions) via `renderMixdownWeb` (`:214-260`). Extend it to also mix MIDI-note tracks by delegating to `midiSynth` voice rendering, so a single call handles both track types.
- Return type becomes `{ buffer: AudioBuffer; hash: string }` where `hash` is a stable content hash of `tracks + buses + bpm + mood + pitchCorrected + playbackRate`.

### 2. Render cache
- Add `renderCache: Map<string, { url: string; blob: Blob; buffer: AudioBuffer }>` inside `UniversalAudioSystem`.
- `renderMixdown` checks the cache by `hash` first; on hit, returns the stored URL without re-rendering.
- `rerenderAfterMuteSolo` uses the same `hash` (mute/solo are not part of the hash key, since they are applied as gain at playback time or via a lightweight gain re-render) → cache hit → no full re-render, playhead preserved.
- Cache entries are registered via `createTrackedBlob` so they participate in the existing 15-minute / 100-entry eviction.

### 3. Real pitch shift
- Add `applyPitchAndRate(buffer, semitones, playbackRate)` in `src/lib/universalAudio.ts` (or `midiSynth`):
  - If `semitones !== 0`: call `pitchShift(buffer, semitones)` (existing `src/lib/timeStretchVocoded.ts` / `pitchShift` in `midiSynth.ts`).
  - If `playbackRate !== 1`: apply time-stretch (`timeStretch`) so tempo changes without changing pitch; alternatively keep `playbackRate` on the element when `semitones` already compensates.
- Remove the silent `pitchShiftSemitones` cosmetic usage; wire it into the render hash so the cache key reflects pitch.
- Keep `webAudio.setPlaybackRate` only when pitch is *not* pre-applied (i.e., when using element-level stretch).

### 4. Blob lifecycle hygiene
- `UniversalAudioSystem.revokeTrackedBlob(url)` becomes the single revoke path.
- `togglePlay`: before swapping `currentUrlRef.current`, call `audioSystem.revokeTrackedBlob(currentUrlRef.current)` instead of bare `URL.revokeObjectURL`.
- Pitch-corrected URL: register via `audioSystem.createTrackedBlob(blob)` so it is tracked + auto-evicted.
- `generatePreviewUrl` (`src/lib/constants.ts`): on Feed unmount, revoke all cached preview URLs (subscribe to an unmount/teardown hook or call a `clearPreviewUrlCache()` from `app/tabs/index.tsx` cleanup).

### 5. Clock sync
- `clockManager.startClock(intervalMs, getAudioTime)` — pass a getter that returns the **actual playback element's currentTime** (`webAudio.currentTime` on web, `player.currentTime` native) instead of `audioSystem._audioCtx.currentTime`.
- Studio passes `() => (isWeb ? webAudio.currentTime : player.currentTime)` so `currentBeat` matches audible playback.
- `clockManager.ts:34-37` changes from `getSharedAudioContext().currentTime` to the injected getter.

### 6. Autoplay consolidation
- In `togglePlay`, call `webAudio.unlock()` then `await audioSystem.ensureContext()` **synchronously at the top, before any async render work** (already partially done; make `ensureContext` failure the single source of `autoplayBlocked`).
- Wrap the single `replace`+`play` (web) / `replace`+`play` (native) in one try/catch that sets `autoplayBlocked` once.

## API Signatures (proposed)

```ts
// src/lib/universalAudio.ts
interface RenderResult { buffer: AudioBuffer; hash: string; url: string }
interface RenderOptions { bpm: number; mood?: Mood; buses?: BusDef[]; semitones?: number; playbackRate?: number }

class UniversalAudioSystem {
  ensureContext(): Promise<AudioContext | null>
  renderMixdown(tracks: TrackDef[], opts: RenderOptions): Promise<RenderResult>
  revokeTrackedBlob(url: string): void
  createTrackedBlob(blob: Blob, type?: string): string
  markBlobActive(url: string): void
  clearRenderCache(): void          // teardown helper
}

// src/lib/constants.ts
function generatePreviewUrl(id: string, duration: number): Promise<string>
function clearPreviewUrlCache(): void   // revoke all cached preview URLs

// src/lib/clockManager.ts
function startClock(intervalMs: number, getAudioTime: () => number): void
```

## Component / File Mappings

| Concern | File | Change |
|---|---|---|
| Transport (togglePlay, seekRelative, stopPlayback, rerenderAfterMuteSolo) | `app/studio/[id].tsx` | use `renderMixdown`; route revokes through `audioSystem`; preserve playhead |
| Web audio wrapper | `src/hooks/useWebAudioPlayer.ts` | expose `currentTime`; keep `unlock`/`ensureContext` |
| Audio engine | `src/lib/universalAudio.ts` | add render cache, pitch/rate apply, `clearRenderCache` |
| MIDI render | `src/lib/midiSynth.ts` | export a `renderTracksToBuffer(tracks, opts)` used by `renderMixdown` |
| Beat clock | `src/lib/clockManager.ts` | accept `getAudioTime` getter |
| Feed playback | `app/tabs/index.tsx` | call `clearPreviewUrlCache()` on unmount |
| Preview synth | `src/lib/constants.ts` | add `clearPreviewUrlCache` |

### 7. Plugin effects DSP coverage (`applyPluginChain`)

Add a new `applyPluginChain(buffer, plugins, sampleRate)` function in `src/lib/mastering.ts` (or a new `src/lib/pluginChain.ts`) that applies **all 19 PluginType values** to an AudioBuffer:

| PluginType | DSP approach | Status |
|---|---|---|
| eq | BiquadFilter (existing) | ✅ in `applyMasteringChain` |
| compressor | DynamicsCompressor (existing) | ✅ |
| limiter | WaveShaper + Gain (existing) | ✅ |
| truePeakLimiter | WaveShaper + Gain (existing) | ✅ |
| multibandCompressor | 3-band split + comp (existing) | ✅ |
| stereoImager | MS matrix + width Gain (existing) | ✅ |
| tapeSaturator | WaveShaper (tanh curve, existing) | ✅ |
| deesser | Notch BiquadFilter (existing) | ✅ |
| distortion | WaveShaper (hard-clip / soft-clip curve, new) | 🔧 new |
| reverb | Convolver with generated IR (decay + diffuse noise) | 🔧 new |
| delay | DelayNode (feedback, mix) | 🔧 new |
| filter | BiquadFilter (configurable type/freq/Q) | 🔧 new |
| modulation | LFO + Gain (chorus/flanger via variable delay stub) | 🔧 new |
| utility | Gain + phase invert | 🔧 new |
| noiseGate | DynamicsCompressor (inverse) or Gain envelope | 🔧 new |
| autoPitch | `pitchShift` + `snapToScale` (see §8) | 🔧 new |
| bassMono | ChannelMerger (L+R summed to mono below freq) | 🔧 new |
| stereoWidener | MS matrix + width Gain (like stereoImager but params) | 🔧 new |
| clipper | WaveShaper (hard-clip at ceiling) | 🔧 new |

```ts
// src/lib/pluginChain.ts
export function applyPluginChain(
  buffer: AudioBuffer,
  plugins: Plugin[],
  sampleRate: number,
): Promise<AudioBuffer>

// src/lib/mastering.ts
// applyMasteringChain stays for mastering-specific chains,
// but calls applyPluginChain internally for full coverage.
```

**Per-track integration:** `renderTracksToUrl` / `renderMixdown` will call `applyPluginChain` with `track.plugins` for each track before mixing down, so plugin settings become audible.

### 8. Recording → region → playback path

```
┌─────────────┐   capture   ┌──────────┐   store as   ┌─────────────┐
│ RecordOptions│ ─────────→ │Audio file│ ───────────→ │projectStore  │
│ (useAudio   │            │(temp)    │   region.url  │(track.regions)│
│  Recorder)   │            └──────────┘              └──────────────┘
                                                             │
                                                             ▼
┌──────────────┐   play     ┌────────────────────┐   render │
│ Studio       │ ←──────────│renderMixdown        │ ←────────┘
│ transport    │   blob URL │(handles region.url)  │
└──────────────┘            └────────────────────┘
```

- Recording stores audio as a temporary file → `createTrackedBlob(blob)` tracked URL → added as `Region { id, url, startBeat, duration }` to the active track.
- `projectStore.saveProject(tracks)` persists the region URL.
- `renderMixdown` iterates `track.regions`, decodes each `region.url` via `audioSystem.decodeAudioData`, schedules them at `startBeat`, mixes with MIDI notes.
- Tests: mock `AudioRecorder` with known WAV data, simulate capture → region creation → `renderMixdown` call → assert output buffer is non-silent and matches expected duration.

### 9. Autotune / pitch correction (`snapToScale`)

Add a `snapToScale(frequency, key, scale)` utility:

```ts
// src/lib/pluginChain.ts (or src/lib/autotune.ts)
type ScaleType = "major" | "minor" | "chromatic" | "pentatonicMajor" | "pentatonicMinor";

function snapToScale(
  frequency: number,     // detected pitch in Hz
  key: number,           // 0=C, 1=C#, ... 11=B
  scale: ScaleType,
): { midiNote: number; frequency: number; correction: number } // correction in semitones
```

- Convert `frequency` to MIDI note number (`12 * log2(f / 440) + 69`).
- Calculate `note % 12` to find pitch class.
- Find nearest pitch class in `key + scaleIntervals`.
- Return the corrected MIDI note + frequency + semitone correction.
- `autoPitch` plugin in `applyPluginChain`: apply `pitchShift(buffer, correction)` scaled by `params.amount`, then wet/dry mix with `params.mix`.

```ts
// autoPitch processing inside applyPluginChain
const correction = snapToScale(detectedFreq, key, scale).correction;
const shifted = pitchShift(buffer, correction * (amount / 100));
// wet = shifted * mix + dry * (1 - mix)
```

- Tests: assert `snapToScale(440, 0, "major")` returns correction 0 (A4 is in C major). `snapToScale(445, 0, "major")` returns correction to nearest C-major note. `snapToScale(440, 2, "minor")` (D minor) returns correction 0.

### 10. Loop markers

**Data model** (in `ProjectData` / `src/lib/types.ts`):

```ts
interface LoopMarker {
  id: string;
  startBeat: number;
  endBeat: number;
  color: string;
  label?: string;
}

interface ProjectData {
  // ... existing fields
  loopMarkers: LoopMarker[];
  activeLoopMarkerId: string | null;  // null = play full project
}
```

**Behavior:**
- **Default:** When no loop markers exist, one default marker spans the full project (`startBeat = 0`, `endBeat = totalBeats`). A `+` button in the transport bar adds a new marker (`startBeat = currentBeat - 4`, `endBeat = currentBeat + 4`).
- **Active marker:** `activeLoopMarkerId` selects which marker is active. Only the active loop marker's range is rendered/played.
- **Playback loop:** When `activeLoopMarkerId` is set, the transport loops within `startBeat → endBeat`. When playhead reaches `endBeat`, it resets to `startBeat`.
- **Render constraint:** `renderMixdown` accepts `{ loopStart?: number; loopEnd?: number }` in `RenderOptions`. When set, only that portion of the timeline is rendered.
- **UI:** Loop markers appear as horizontal bars on the timeline. Dragging edges resizes. Tapping selects/deselects. The `+` icon opens a new marker. Colors distinguish overlapping markers.

**Transport integration:**
- `togglePlay` checks `activeLoopMarkerId`, reads `startBeat`/`endBeat` from `loopMarkers`, computes `loopDurationBeats = endBeat - startBeat`, passes to `renderMixdown` as `loopStart`/`loopEnd`.
- During real-time playback, `clockManager` emitts tick at `currentBeat`; when `currentBeat >= endBeat`, transport seeks to `startBeat`.
- When `activeLoopMarkerId` is `null` (no active marker), play full project from 0.

**Tests:**
- `renderMixdown` with `loopStart`/`loopEnd` produces a buffer shorter than full-project render.
- Loop markers constrain transport seek: when playhead reaches `endBeat`, next tick resets to `startBeat`.
- Default marker spans full project.
- `+` button adds a new marker at current position.
- Multiple markers can exist; only the active one constrains playback.

## API Signatures (proposed)

```ts
// src/lib/universalAudio.ts
interface RenderResult { buffer: AudioBuffer; hash: string; url: string }
interface RenderOptions {
  bpm: number;
  mood?: Mood;
  buses?: BusDef[];
  semitones?: number;
  playbackRate?: number;
  loopStart?: number;    // NEW
  loopEnd?: number;      // NEW
}

// src/lib/pluginChain.ts (NEW)
function applyPluginChain(buffer: AudioBuffer, plugins: Plugin[], sampleRate: number): Promise<AudioBuffer>
function snapToScale(frequency: number, key: number, scale: ScaleType): { midiNote: number; frequency: number; correction: number }

// src/lib/types.ts (NEW types)
type ScaleType = "major" | "minor" | "chromatic" | "pentatonicMajor" | "pentatonicMinor";
interface LoopMarker { id: string; startBeat: number; endBeat: number; color: string; label?: string }
```

## Edge Cases
- Project with only audio regions → `renderMixdown` still produces audio (no MIDI needed).
- `renderMixdown` returns `null` only if there are zero tracks and zero regions → studio shows "Nada para reproduzir".
- Cache hash must include `playbackRate`/`semitones` so a different rate re-renders (or uses element stretch consistently).
- Native path (expo-audio) keeps `player.replace`/`player.play` but routes blob revokes through `audioSystem`.
- `applyPluginChain` with empty `plugins` array returns input buffer unchanged.
- `snapToScale` with `scale = "chromatic"` always returns correction 0 (all notes are in chromatic scale).
- Loop markers with `startBeat >= endBeat` are ignored (render full project).
- Recording temp files are revoked via `createTrackedBlob` and participate in 15-min eviction.
