## 1. Region edit model
- [ ] `src/lib/regionEdit.ts` — `trimRegion(region, edge, delta, sourceDur)`, `splitRegion(region, atSec)`, `moveRegion(region, delta)`, `crossfadeRegions(a, b, fadeSec)`.
- [ ] Track internal `offset`/`length` on `TrackRegion` (extend the type if needed) so trims map to source audio.
- [ ] Add Vitest: split produces two regions whose combined duration equals the original; trim clamps at boundaries; move respects ≥0.

## 2. Timeline interactions
- [ ] Add draggable edge handles (trim) + body drag (move, beat-snap) to region rendering (reuse `WaveformCanvas`/`WaveformClip`).
- [ ] "Split at playhead" action + shortcut → `splitRegion` on the region under the cursor.
- [ ] Edits flow through `useHistory` (undo/redo) and `projectStore.saveProject`.

## 3. Crossfade + stretch rendering
- [ ] In `renderTrackStem`, apply equal-power crossfade ramps for overlapping same-track regions.
- [ ] If a region `duration` ≠ source length, apply `timeStretch` (pitch-preserving) before scheduling.
- [ ] `npx tsc --noEmit` clean; `npx vitest run` green (existing dsp/modulation/playback suites stay green).

## 4. Manual
- [ ] Record a vocal, split at bar 2, drag + trim, hear crossfade at overlap; edits persist after reload.

## Notes
- Non-destructive; source `url` audio is never rewritten.
- Web-first.
