### Title
Audio region editing: trim, split, move, crossfade

### Problem
Tracks store `regions: TrackRegion[]` (`{ id, start, duration, url }`) but the Studio timeline offers no **non-destructive region editing**: users cannot trim a region's edges, split it at the playhead, drag it in time, or crossfade overlaps. Recording/imported audio is therefore fixed and uneditable — a hard gap vs. any real DAW and vs. BandLab's clip editing.

### Why
Editing is the core loop of production after capture. Without it, OpenBand is record/play-only. It is the explicit `EDIT` pillar in `ROADMAP.md` (region trimming/splitting/moving, crossfade, time-stretch without pitch change) and is currently un-specced.

### Scope
- **Trim** — adjust a region's `start`/`duration` (and the underlying audio offset/length) via draggable edge handles on the waveform.
- **Split** — cut a region at the playhead into two regions sharing the source `url` with split offsets.
- **Move** — drag a region along the timeline (changes `start`); snaps to grid/beats.
- **Crossfade** — when two overlapping regions share a lane, render a short equal-power crossfade at the overlap (baked at render time, or via gain ramps in `PlaybackEngine`/`renderTrackStem`).
- **Time-stretch** — optional region-level stretch without pitch change using `src/lib/timeStretch.ts` (`timeStretch`) when a region's `duration` differs from its source length.

**In scope:** region edit model + timeline interactions + crossfade rendering + (optional) stretch.
**Out of scope:** MIDI note editing (PianoRoll exists), arrangement song structure, destructive render-to-new-file.

### Success metric
A user records a 4-bar vocal, splits it at bar 2, drags the second half to start earlier, trims silence off the front, and hears a smooth crossfade at the overlap; playback reflects edits without re-recording.
