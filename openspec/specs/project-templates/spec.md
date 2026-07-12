# Project Templates

## Overview
OpenBand ships a data-and-generation layer that turns a genre + mood + musical config into a fully populated set of tracks. This layer lives in `src/lib/projectTemplates.ts` and is the foundation beneath the `project-starter` spec: the New Project wizard (`src/components/NewProject.tsx`) collects config and `project-starter`'s `setupProjectStarter` orchestrates it, but all template data (genres, moods, keys, time signatures) and the deterministic track generator (`generateTracksForGenre`) are defined here. See `openspec/specs/project-starter/spec.md` for the UI/orchestration layer that consumes this module.

## Implementation Notes
All template data and generation logic are centralized in `src/lib/projectTemplates.ts`:
- `Mood` union (`projectTemplates.ts:5`) — 10 values: `dark`, `bright`, `warm`, `cold`, `aggressive`, `chill`, `epic`, `minimal`, `nostalgic`, `euphoric`.
- `MOODS: MoodPreset[]` (`projectTemplates.ts:23`) — per-mood `bpmOffset`, `waveType`, `filter`, `reverb`, `density`, `velocity`, `octaveShift`.
- `TIME_SIGNATURES` (`projectTemplates.ts:76`) — `["2/2", "3/4", "4/4", "5/4", "6/8", "7/8", "12/8"]`.
- `GENRES: GenreTemplate[]` (`projectTemplates.ts:139`) — 10 genres, each with `id`, `defaultBpm`, `bpmRange`, `defaultKey`, `suggestedTracks`, optional `subgenres`.
- `GENRE_PLUGINS` (`projectTemplates.ts:83`) — per-genre default plugin presets applied to generated tracks.
- `MUSICAL_KEYS` (`projectTemplates.ts:330`) — 24 keys (12 chromatic roots × major/minor).
- `generateTracksForGenre(genreId, bpm?, key?, mood?, numBars=8, timeSignature="4/4"): TrackDef[]` (`projectTemplates.ts:340`).
- Helpers: `genreSubgenreMap` (`:300`), `subgenreToGenreId` (`:308`), `keyLabel` (`:332`).

The mastering/DSP graph and MIDI harmony are delegated (`src/lib/harmony.ts`); genre drum/instrument MIDI patterns are internal to this module.

## Requirements

### Requirement: Genre Templates
The system MUST expose `GENRES` as an array of `GenreTemplate` entries. Each entry MUST declare `id`, `name`, `icon`, `defaultBpm`, `bpmRange: [number, number]`, `defaultKey`, `description`, and a non-empty `suggestedTracks` list; `subgenres` is optional. There MUST be exactly 10 genres.

#### Scenario: Genre carries a bpm range and default key
- **Given** the genre `lofi`
- **When** its template is read from `GENRES`
- **Then** `bpmRange` is `[60, 100]` and `defaultKey` is `"Am"`
- **And** `suggestedTracks.length > 0`

#### Scenario: Subgenre resolves to parent genre
- **Given** the subgenre id `techno`
- **When** `subgenreToGenreId("techno")` is called
- **Then** it returns `"edm"`

### Requirement: Mood Templates
The system MUST expose `MOODS` as presets keyed by the 10-value `Mood` union. Each `MoodPreset` MUST provide `bpmOffset`, `waveType`, `filter`, `reverb`, `density`, `velocity`, and `octaveShift`, which are applied during MIDI generation to bias tempo, note density, velocity, and octave.

#### Scenario: Mood offsets bpm
- **Given** genre `pop` with `defaultBpm = 120` and mood `chill` (`bpmOffset = -15`)
- **When** `generateTracksForGenre("pop", undefined, undefined, "chill")` runs
- **Then** the effective bpm used for region/MIDI timing is `105`

#### Scenario: All 10 moods are defined
- **Given** the `Mood` union
- **When** `MOODS` is inspected
- **Then** it contains exactly 10 presets, one per union member

### Requirement: Time Signature & Musical Key Options
The system MUST expose `TIME_SIGNATURES` and `MUSICAL_KEYS` as selectable option lists. `TIME_SIGNATURES` MUST include `"4/4"` as the default. `MUSICAL_KEYS` MUST contain 24 entries (12 chromatic roots, each in major and minor form).

#### Scenario: Default time signature available
- **Given** the `TIME_SIGNATURES` list
- **When** the details step renders its picker
- **Then** `"4/4"` is present and used as the default

#### Scenario: Twenty-four musical keys
- **Given** the `MUSICAL_KEYS` list
- **When** its length is checked
- **Then** it equals `24`
- **And** both `"C"` and `"Cm"` are present

### Requirement: Deterministic Track Generation
`generateTracksForGenre(genreId, bpm?, key?, mood?, numBars, timeSignature)` MUST return a `TrackDef[]` whose length equals `genre.suggestedTracks.length`. Each generated track MUST contain a single region whose `duration` equals `Math.round((numBars * beatsPerBar * 60) / bpm)`, where `beatsPerBar` is the denominator parsed from `timeSignature` and `bpm` is the effective (mood-adjusted) tempo.

#### Scenario: Track count matches suggested tracks
- **Given** genre `pop` whose `suggestedTracks.length === 4`
- **When** `generateTracksForGenre("pop")` is called
- **Then** the returned array has length `4`
- **And** each track has a `regions` array of length `1`

#### Scenario: Region duration formula
- **Given** `numBars = 8`, `timeSignature = "4/4"`, `bpm = 120`
- **When** track generation runs
- **Then** each region duration equals `Math.round((8 * 4 * 60) / 120) = 16` seconds

### Requirement: Unknown Genre Fallback
When `generateTracksForGenre` receives a `genreId` not present in `GENRES` (or a genre with no suggested tracks), it MUST NOT throw and MUST return a non-empty fallback track set sized off `numBars` at 120 bpm / 4 beats per bar.

#### Scenario: Fallback for unknown genre
- **Given** `genreId = "nonexistent"`
- **When** `generateTracksForGenre("nonexistent")` is called
- **Then** a non-empty `TrackDef[]` is returned
- **And** no error is thrown

## Test Requirements (Vitest)
- [ ] `GENRES` has exactly 10 entries, each with a non-empty `suggestedTracks`
- [ ] `generateTracksForGenre(id)` returns `tracks.length === genre.suggestedTracks.length`
- [ ] Region duration equals `Math.round((numBars * beatsPerBar * 60) / bpm)`
- [ ] `MUSICAL_KEYS.length === 24` and includes both `"C"` and `"Cm"`
- [ ] `TIME_SIGNATURES` includes `"4/4"`
- [ ] Unknown genre id returns a non-empty fallback without throwing
