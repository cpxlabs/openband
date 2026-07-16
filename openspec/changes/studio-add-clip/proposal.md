# Proposal: Studio "Add Clip" Action

## Context
The `studio-daw` spec lists "Add clip appends valid `TrackRegion`" as a
requirement, but currently regions are only created via the **record flow**
(`toggleRecording`). There is no standalone "Add clip" action to drop an empty /
placeholder region onto a track independent of recording. This change adds that
action so users can build arrangements by placing clips directly.

This closes the last PARTIAL item in `docs/pending-implementations.md`
(Studio DAW → "Standalone 'Add clip' action").

## Problem Description
- `app/studio/[id].tsx` has `handleAddTrack` / `handleAddMidiTrack` /
  `handleAddSample` (all create tracks), and `toggleRecording` (appends a
  recorded region), but no `handleAddClip` that appends a `TrackRegion` to an
  existing selected track.
- A user wanting an empty placeholder clip (to later fill, or to extend the
  timeline) must record silence or import audio — no first-class way.

## Objectives
1. Add `handleAddClip` that appends a valid `TrackRegion` to the **selected**
   track at the end of its current regions (or at `start: 0` if it has none),
   with a sensible default duration (one bar = `60 / initialBpm * numBars`, or a
   fixed default of 4 seconds when not computable).
2. If no track is selected, `handleAddClip` creates a new audio track containing
   one clip (so the action is always usable), then selects it — consistent with
   how `handleAddTrack` already behaves.
3. Expose the action via a toolbar button (near the existing Track/Audio/MIDI
   buttons) and a command-palette command `clip.add` (keybinding optional).

## Non-Goals
- No audio is generated for the placeholder clip (it has no `url`); playback will
  simply be silent for that region, same as an empty region today. This matches
  the spec's "appends valid `TrackRegion`" (valid = well-formed shape).
- Not replacing the record flow.

## Approach
- `handleAddClip` (in `app/studio/[id].tsx`, near `handleAddTrack`):
  - `const target = tracks.find((t) => t.id === selectedTrackId) ?? null;`
  - If `target`: compute `start = max(end of last region, 0)`; append
    `{ id: "region-" + Date.now(), start, duration: defaultDuration }`.
  - Else: create a new audio track (reuse `handleAddTrack`'s track shape) with
    one region at `start: 0`, `duration: defaultDuration`, and select it.
  - Use `setTracks` and (if applicable) `setSelectedTrackId`.
  - `defaultDuration = numBars && initialBpm ? (60 / initialBpm) * numBars : 4`
    (use the existing `numBars`/`initialBpm` values available in the component
    scope; fall back to 4s).
- Toolbar: add a `Pressable` with `onPress={handleAddClip}` after the Import
  button, labeled "+ Clip" (icon `▦` or `＋`).
- Command: `registerCommand("clip.add", "Add Clip", "...", "Clip", handleAddClip, "Ctrl+Shift+C")` (optional binding; registration only, like the others).
- Tests: add a vitest test in `tests/studio.test.tsx` asserting that
  `handleAddClip` (or the button) appends a region to the selected track and
  that with no selection it creates a track with one region. Since the Studio
  component is heavy, prefer testing the pure append logic. If the component is
  hard to drive, add a focused test that renders `<Studio />` and clicks the
  "+ Clip" button (mirroring the existing transport-control tests), asserting a
  new region exists on the selected track.

## Test Requirements (add to `studio-daw/spec.md`)
- [x] "Add clip" appends a valid `TrackRegion` to the selected track at the end of existing regions.
- [x] "Add clip" with no selected track creates a new track containing one region and selects it.

## Verification
1. `npx tsc --noEmit`
2. `cd backend && npx tsc --noEmit`
3. `npx vitest run tests/studio.test.tsx`
4. `npx vitest run` (no regressions)
5. `npm run test:legacy`
6. `npm run build`
