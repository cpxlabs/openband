# Studio DAW

## Overview
The Studio is the DAW-style editing surface at `app/studio/[id].tsx`. It provides a multi-track mixer view, a transport bar (play / stop / record) driven by the `clockManager` web worker clock, an arrangement timeline with per-track regions, a per-track plugin chain (audio-plugins spec), automation lanes (automation-routing spec), track grouping, and a master section. The surface is tabbed via `BottomTab` (`app/studio/[id].tsx:101`: `mixer | fx | mastering | groups | buses | mixes | chords`) rendered in a bottom panel. This spec covers only the *surface*; transport resilience, recovery, and offline rendering fall under `studio-resilience`.

## Implementation Notes
The screen renders `TrackGroupManager`, `PluginRack`/`MasterRack`, `PluginEditor`, `WaveformCanvas`, `AutomationLane`, `Patchbay`, `MixManager`, and `VuMeter` (imports at `app/studio/[id].tsx:27-62`). Transport state derives from `webAudio` (web) or `expo-audio` `player` (native): `isPlaying` at `:460`, `currentTime`/`duration` at `:461-462`, `isRecording` at `:271`. Playback starts the worker clock via `startClock(25)` and subscribes to `onClockTick` for beat tracking (`:516-549`). Regions are `TrackRegion` objects (`src/lib/types.ts`) with `start`/`duration`, stored per track as `track.regions`. Bus auto-routing uses `assignTrackToBus` from `src/lib/busRouter.ts`. Group volume is read via `getGroupVolume` from `src/components/TrackGroup.tsx`.

## Requirements

### Requirement: Multi-Track Mixer View
The studio MUST render a multi-track mixer where each `TrackDef` appears as a channel strip showing name, volume/mute/solo, a `VuMeter`, and its plugin rack. Switching tabs via `setBottomTab("mixer")` (`:1452`, `:1472`) MUST show the mixer surface.

#### Scenario: Open mixer tab
- **Given** a project with 4 tracks loaded in `app/studio/[id].tsx`
- **When** the user selects the "Mixer" bottom tab
- **Then** a `VuMeter` is rendered for every track (`:1847`, `:2237`)
- **And** each track's `PluginRack` is accessible from the strip

#### Scenario: Mute a channel strip
- **Given** track "Vocals" is audible
- **When** the user toggles `toggleMute` for that track
- **Then** `track.muted` becomes true and audio routes around its gain via `busRouter`

### Requirement: Transport Play / Stop / Record
The studio MUST provide transport controls that start/stop playback through the `clockManager` worker clock and arm recording through `expo-audio` `useAudioRecorder`. `togglePlay` (`:551`) must call `startClock(25)` on play and `stopClock()` on stop.

#### Scenario: Press play starts the clock
- **Given** the project is stopped
- **When** the user taps the play button invoking `togglePlay`
- **Then** `startClock(25)` is called (`app/studio/[id].tsx:518`)
- **And** an `onClockTick` listener updates `currentBeat` each 25ms tick (`:534-539`)

#### Scenario: Press stop halts the clock
- **Given** playback is running
- **When** the user taps stop
- **Then** `stopClock()` is called (`:523`)
- **And** `setCurrentBeat(0)` resets the playhead

#### Scenario: Record arms recorder and captures audio
- **Given** `recordSettings.armed` is true
- **When** the user taps the record button
- **Then** `isRecording` flips to true (`:271`, `:1561`)
- **And** `audioSystem.startRecording` / `expo-audio` recorder captures a new region appended to `track.regions` (`:647`, `:710`, `:675`)

### Requirement: Arrangement Timeline With Regions
The studio MUST render an arrangement timeline (width `TIMELINE_WIDTH = 1200`, `:139`) where each track shows `TrackRegion` blocks positioned by `region.start` and sized by `region.duration`. Users MUST be able to add a region to a track.

#### Scenario: Add region to track
- **Given** a track with an empty `regions` array
- **When** the user adds a clip
- **Then** a `TrackRegion` `{ id, start, duration }` is appended (`:675`, `:1124`, `:1147`)
- **And** the timeline renders it left-positioned at `start / duration` and width proportional to `duration`

#### Scenario: MIDI import produces regions
- **Given** a user imports a MIDI file
- **When** `parseMidi` + `midiToTrackRegions` run (`:69`, `:1324`)
- **Then** each track receives `TrackRegion` blocks derived from MIDI note timings

### Requirement: Per-Track Plugin Chain
Each track MUST expose its `plugins: Plugin[]` chain via `PluginRack` (`:2494`), and selecting a plugin MUST open `PluginEditor` (`:2867`) for deep parameter editing. This reuses the `audio-plugins` spec.

#### Scenario: Open plugin editor
- **Given** a track with a Compressor plugin
- **When** the user taps the plugin slot
- **Then** `PluginEditor` renders the plugin's param knobs
- **And** edits write back to `track.plugins[i].params`

### Requirement: Automation Lanes
The studio MUST render `AutomationLane` components for a selected track's automatable params (`:2060`, `:2077`), backed by `buildAutomationSchedule` / `interpolateAutomationValue` from `src/lib/automationEngine.ts`. This reuses the `automation-routing` spec.

#### Scenario: Draw a volume automation curve
- **Given** a track with an empty `automation.volume` array
- **When** the user draws points in `AutomationLane`
- **Then** `track.automation.volume: AutomationPoint[]` is populated
- **And** during playback `automatedVolume(trackId)` interpolates the fader value per frame (`:503-514`)

### Requirement: Track Grouping
The studio MUST render a groups tab backed by `TrackGroupManager` (`:2736`) and `GroupDef[]` state (`groups` at `:311`, `trackAssignments` at `:317`). Group shared volume/mute MUST be reflected on member tracks via `getGroupVolume` (`:869`).

#### Scenario: Create a group and assign tracks
- **Given** tracks "Kick" and "Snare"
- **When** the user creates a group and assigns both tracks (`:2736`)
- **Then** `groups` gains a `GroupDef` and `trackAssignments` maps both track ids to it
- **And** adjusting group volume applies `getGroupVolume(groups, track.id)` to each member (`:869`)

### Requirement: Master Section Link
The studio MUST present a master section with `MasterRack` (`:2546`, `:2560`) showing the master `Plugin[]` chain, plus a `LufsMeter` and `BounceDialog` entry. Mixer strips and bus outputs MUST sum into the master gain.

#### Scenario: Master chain reflects on export
- **Given** a master chain with a Limiter plugin enabled
- **When** the user opens Bounce / export (`:38`)
- **Then** `renderTracksToUrl(tracks, bpm, mood, buses)` (`:568`) includes the master `MasterRack` plugins in the mixdown

## Test Requirements (Vitest)
- [ ] Studio renders a `VuMeter` per track when the "mixer" bottom tab is active
- [ ] Tapping play invokes `startClock(25)` and an `onClockTick` subscription updates `currentBeat`
- [ ] Tapping stop invokes `stopClock()` and resets `currentBeat` to 0
- [ ] Record button flips `isRecording` and appends a `TrackRegion` to the armed track
- [ ] Adding a clip appends a valid `TrackRegion { id, start, duration }` to `track.regions`
- [ ] Tapping a track plugin slot opens `PluginEditor` bound to `track.plugins[i]`
- [ ] Drawing an `AutomationLane` populates `track.automation.volume` and `automatedVolume` interpolates per frame
- [ ] Creating a group updates `groups` + `trackAssignments` and `getGroupVolume` reflects on members
- [ ] Master `MasterRack` plugins are included in `renderTracksToUrl` mixdown path
