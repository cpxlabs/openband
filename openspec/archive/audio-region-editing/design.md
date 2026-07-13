### Architecture: region model + timeline interactions + crossfade

`TrackRegion` already exists (`src/lib/types.ts`): `{ id, start, duration, url, ... }`. Regions are rendered in `renderTrackStem` (midiSynth.ts) by decoding `url` and `source.start(region.start, 0, region.duration)`. Editing mutates `track.regions`; the playback `PlaybackEngine` reads `track.regions` via `renderTrackStem`, so edits become audible on the next re-render (hash changes → stem re-renders). Persist via `projectStore.saveProject`.

### 1. Region edit model (pure helpers)
`src/lib/regionEdit.ts`:
- `trimRegion(region, edge: "start"|"end", deltaSec, sourceDuration)` → new `{start, duration}` clamped; track an internal `offset`/`length` so the waveform crop maps to the source.
- `splitRegion(region, atSec)` → `[left, right]` sharing `url` with split `offset`/`length`.
- `moveRegion(region, deltaSec)` → new `start` (no earlier than 0).
- `crossfadeRegions(a, b, fadeSec)` → returns gain-ramp metadata applied at render.

### 2. Timeline interactions (Studio)
- Reuse `WaveformCanvas` / `WaveformClip` for region rendering; add draggable **edge handles** (trim) and **body drag** (move) with beat-snap.
- "Split at playhead" button (and shortcut) calls `splitRegion` on the region under the cursor.
- Edits update `tracks` state through `useHistory` (undo/redo) and persist.

### 3. Crossfade + stretch rendering
- In `renderTrackStem` (midiSynth.ts), when scheduling a region's `AudioBufferSourceNode`, apply an **equal-power crossfade** against any overlapping neighbor in the same track: ramp the source gain up/down over `fadeSec` at overlap boundaries (use `gain.setValueAtTime`/`linearRampToValueAtTime`).
- If a region's rendered `duration` ≠ source length, call `timeStretch(buffer, sourceLen/duration)` (from `src/lib/timeStretch.ts`) before scheduling — keeps pitch stable.

### 4. Reuse
- `TrackRegion`, `TrackDef.regions` (types.ts)
- `renderTrackStem` (midiSynth.ts) — region scheduling point
- `PlaybackEngine` (reads regions via stem re-render on hash change)
- `timeStretch` (src/lib/timeStretch.ts)
- `WaveformCanvas` / `WaveformClip` (src/components)
- `useHistory` (undo/redo), `projectStore` (persistence)

### Notes
- Non-destructive: source `url` audio is never rewritten; only `start/duration/offset/length` metadata changes.
- Web-first; native `expo-audio` path may show edits after re-render.
