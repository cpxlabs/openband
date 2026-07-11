# Project Starter

## Overview
The New Project flow (`src/components/NewProject.tsx`) is a 3-step wizard (genre → mood → details) that collects `name`, `bpm`, `numBars`, `timeSignature`, `key`, and `mood`, then produces an initial project via `src/lib/projectTemplates.ts` `generateTracksForGenre`. It also supports a "Start From Scratch" path that yields an empty starter with no tracks.

## Implementation Notes
The wizard UI lives in `src/components/NewProject.tsx` (3-step genre→mood→details; exposes `onStartFromScratch?` and `onCreate`). Track generation and all template data live in `src/lib/projectTemplates.ts`: `GENRES` (`projectTemplates.ts:139`), `MOODS` (`projectTemplates.ts:23`), `MUSICAL_KEYS` (`projectTemplates.ts:330`), `TIME_SIGNATURES` (`projectTemplates.ts:76`), and `generateTracksForGenre(genreId, bpm?, key?, mood?, numBars?, timeSignature?)` (`projectTemplates.ts:340`). The new orchestration point `setupProjectStarter(config)` is added to a new module `src/lib/projectStarter.ts` (spec'd below) and delegates to `generateTracksForGenre`.

## Requirements

### Requirement: Project Configuration Inputs
The starter MUST collect the following fields before creating a project:
- `name: string` — project display name
- `genre: GENRES id` — selected genre (e.g. `pop`, `lofi`)
- `mood: Mood` — optional `MOODS` id applied as a vibe offset
- `bpm: number` — constrained within `genre.bpmRange`
- `numBars: number` — `1..64`, default `8`
- `timeSignature: TIME_SIGNATURES` — default `"4/4"`
- `key: MUSICAL_KEYS` — optional, default `genre.defaultKey`

#### Scenario: Collect minimal config
- **Given** the user picks genre `lofi` and accepts defaults
- **When** the details step renders
- **Then** `numBars = 8`, `timeSignature = "4/4"`, `key = genre.defaultKey` are prefilled
- **And** `bpm` input is clamped to `genre.bpmRange`

### Requirement: Track Generation
On create, `setupProjectStarter(config)` MUST call `generateTracksForGenre(genre.id, bpm, key, mood, numBars, timeSignature)` and return a `ProjectDef`-like object:
`{ id, name, bpm, numBars, timeSignature, key, mood, genre, tracks: TrackDef[] }`.

#### Scenario: Create populated project
- **Given** config `{ genre: "pop", bpm: 120, numBars: 16, timeSignature: "4/4", key: "C" }`
- **When** `setupProjectStarter` is called
- **Then** a project object is returned with `tracks.length === selectedGenre.suggestedTracks.length`
- **And** each track carries regions whose duration equals the computed `regionDuration`

### Requirement: Start From Scratch
The flow MUST support an empty starter (no tracks) when `onStartFromScratch` is used. `setupProjectStarter` SHOULD accept a `scratch: true` flag (or `onStartFromScratch` callback) that returns a project with `tracks: []`.

#### Scenario: Empty scratch project
- **Given** the user taps "Start From Scratch"
- **When** `setupProjectStarter` is invoked with `scratch: true`
- **Then** the returned project has `tracks: []`
- **And** all metadata fields (`name`, `bpm`, `numBars`, `timeSignature`, `key`) are still populated

### Requirement: Deterministic Defaults
Given the same config, generation MUST be deterministic:
- generated track count equals `selectedGenre.suggestedTracks.length`
- region duration = `(numBars * beatsPerBar * 60) / bpm` where `beatsPerBar` is parsed from `timeSignature`

#### Scenario: Region duration formula
- **Given** `numBars = 8`, `timeSignature = "4/4"`, `bpm = 120`
- **When** track generation runs
- **Then** each region duration equals `(8 * 4 * 60) / 120 = 16` seconds

#### Scenario: Invalid bpm clamped
- **Given** `genre.bpmRange = [70, 110]` and user enters `bpm = 200`
- **When** `setupProjectStarter` validates config
- **Then** `bpm` is clamped to `110` before `generateTracksForGenre` is called

## Test Requirements (Vitest)
- [ ] `setupProjectStarter` returns `tracks.length === selectedGenre.suggestedTracks.length`
- [ ] Region duration matches `(numBars * beatsPerBar * 60) / bpm`
- [ ] `startFromScratch` returns empty `tracks`
- [ ] Invalid `bpm` is clamped to `genre.bpmRange`
- [ ] `numBars` outside `1..64` is clamped to range
