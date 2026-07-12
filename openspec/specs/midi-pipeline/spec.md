# MIDI Pipeline

## Overview
OpenBand parses Standard MIDI Files (SMF) and renders them through a Web Audio synthesis pipeline with sample-accurate scheduling. Three modules drive this: `midiParser.ts` (binary SMF parser), `midiSynth.ts` (Web Audio synth with bus routing + offline render), and `midiScheduler.ts` (lookahead scheduler with voice management + beat tracking).

## Implementation Notes
`parseMidi` in `src/lib/midiParser.ts` (`src/lib/midiParser.ts:87`) reads MThd/MTrk chunks, varlen delta-times, note on/off, tempo meta (FF 51), program change (instrument), and SMPTE time division. `midiSynth.ts` (`src/lib/midiSynth.ts:698`) exposes `renderTracksToUrl` which builds an `OfflineAudioContext` graph routing each `TrackDef` through per-track gain + stereo panner into sub-mix buses (`BusDef`) and a master bus, with soundfont or oscillator voices. `midiScheduler.ts` (`src/lib/midiScheduler.ts:131`) provides `createLookaheadScheduler` with a 25ms tick loop, a 0.15s schedule-ahead window, voice bookkeeping, and `getCurrentBeat`/`seekTo` transport controls.

## Requirements

### Requirement: SMF Parsing (Header & Tracks)
The system MUST parse a Standard MIDI File into `MidiData` (`src/lib/midiParser.ts:18`), extracting format, track count, metrical/SMPTE time division, `ticksPerQuarter`, and global tempo (BPM) from the FF 51 meta event.

#### Scenario: Parse a minimal SMF
- **Given** a byte array with a valid MThd header (format 0, 1 track, division 480)
- **When** `parseMidi(buffer)` is called
- **Then** a non-null `MidiData` is returned
- **And** `ticksPerQuarter === 480` and `bpm` reflects the tempo meta event

#### Scenario: Reject non-MIDI input
- **Given** an `ArrayBuffer` whose first four bytes are not "MThd"
- **When** `parseMidi(buffer)` is called
- **Then** the function returns `null`

### Requirement: Note Extraction
The system MUST extract `MidiNote` events (`src/lib/midiParser.ts:3`) — channel, note, velocity, start (ticks), duration (ticks) — pairing note-on (9x, velocity > 0) with note-off (8x or 9x velocity 0).

#### Scenario: Extract a note pair
- **Given** a track with a note-on at tick 0 and a note-off at tick 64 for note 60
- **When** `parseMidi(buffer)` is called
- **Then** the track's `notes` array contains one entry
- **And** `note === 60`, `start === 0`, `duration === 64`

### Requirement: Web Audio Synth Bus Routing + Offline Render
The system MUST render `TrackDef[]` to a playable URL via `renderTracksToUrl` (`src/lib/midiSynth.ts:698`), routing each audible track through a per-track gain and stereo panner into its `BusDef` (or master) and applying mood filter/reverb FX on the master bus.

#### Scenario: Render tracks to a URL
- **Given** tracks with `midiNotes` and a set of `BusDef`s
- **When** `renderTracksToUrl(tracks, bpm, mood, buses)` is called on web
- **Then** an `OfflineAudioContext` graph is built with a gain+stereo panner per track
- **And** a non-null blob URL string is returned

#### Scenario: Mute and solo handling
- **Given** a mixed set of tracks with `muted` and `solo` flags
- **When** `renderTracksToUrl` builds the graph
- **Then** muted tracks and non-soloed tracks are excluded from the rendered output

### Requirement: Lookahead Scheduler with Voice Management
The system MUST provide `createLookaheadScheduler` (`src/lib/midiScheduler.ts:131`) that schedules `MIDINote`s ahead of the playhead using a 25ms tick loop and a schedule-ahead window, tracking active voices and exposing `getCurrentBeat`, `seekTo`, `isRunning`, `stop`, and `dispose`.

#### Scenario: Start and track beat position
- **Given** a scheduler created via `createLookaheadScheduler()`
- **When** `start(notes, bpm)` is invoked
- **Then** `isRunning()` returns true
- **And** `getCurrentBeat()` advances over time and `stop()` clears the interval and all voices

#### Scenario: Seek mid-playback
- **Given** a running scheduler
- **When** `seekTo(beat)` is called
- **Then** `getCurrentBeat()` is reset to `beat` and previously scheduled voices are released

## Test Requirements (Vitest)
- [ ] `parseMidi` returns non-null for a hand-built SMF with MThd/MTrk + tempo
- [ ] `parseMidi` extracts `bpm` and `ticksPerQuarter` from header + FF 51
- [ ] `parseMidi` returns `null` for non-MIDI input
- [ ] A note-on/note-off pair yields one `MidiNote` with correct note/start/duration
- [ ] `renderTracksToUrl` returns a non-null URL for tracks with `midiNotes`
- [ ] `renderTracksToUrl` excludes muted / non-soloed tracks
- [ ] `createLookaheadScheduler().isRunning()` true after `start`, false after `stop`
- [ ] `getCurrentBeat()` reflects elapsed time; `seekTo` resets the beat
