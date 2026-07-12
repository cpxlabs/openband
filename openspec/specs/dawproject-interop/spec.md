# DAWPROJECT Interop

## Overview
OpenBand projects MUST be interoperable with the open **DAWPROJECT** format (XML-based, `application/dawproject`) so users can exchange sessions with Bitwig Studio, Studio One, and other compatible DAWs. The native OpenBand archive is `src/lib/openbandFormat.ts` (`OpenBandProject` at `:4`, `createOpenBandArchive` at `:182`, `parseOpenBandArchive` at `:224`, `projectToOpenBand` at `:348`). Project JSON persistence and round-tripping live in `src/lib/projectStore.ts` (`ProjectData` at `:15`, `sanitizeProjectData` at `:197`, `exportProject` at `:191`, `importProject` at `:261`). Track structure is defined by `TrackDef` (`src/lib/types.ts:44`) with `regions`, `midiNotes`, `plugins`, `automation`, and `sends`. Genre/tempo scaffolding is produced by `src/lib/projectTemplates.ts` (`generateTracksForGenre` at `:340`, `TIME_SIGNATURES` at `:76`).

This spec adds a new module `src/lib/dawproject.ts` that serializes an OpenBand `ProjectData` into a DAWPROJECT `application.xml` + `resources/` bundle and parses an incoming DAWPROJECT archive back into `ProjectData`. When a plugin type in the foreign DAW has no OpenBand equivalent, it MUST be imported as a **placeholder plugin** (a `Plugin` instance with `type: "unknown"` and preserved vendor/name metadata) so the session loads without data loss.

## Implementation Notes
DAWPROJECT uses an XML application model with `<Clip>`, `<Note>`, `<Device>`, `<Automation>`, and `<Track>` elements plus a `resources/` folder for audio files. Mappings:
- OpenBand `TrackDef.regions` (`src/lib/types.ts:54`) → DAWPROJECT `<Clip>` with `time`/`duration`.
- `TrackDef.midiNotes` (`src/lib/types.ts:55`) → DAWPROJECT `<Note>` children (pitch/key/velocity/duration), reusing the note model from `src/lib/midiParser.ts` (`MidiNote` at `:3`).
- `TrackDef.plugins` (`src/lib/types.ts:58`) → DAWPROJECT `<Device>`; unknown device UUIDs become placeholder `Plugin` objects.
- `TrackDef.automation` (`src/lib/types.ts:59`) → DAWPROJECT `<Automation>` lanes, target ids resolved via `PLUGIN_SPECS` keys (`src/lib/types.ts` audio-plugins spec).
Tempo/time-signature come from `ProjectData.bpm` and `projectTemplates.TIME_SIGNATURES`. The serializer MUST reuse `createArchive`/`parseArchive` CRC helpers (`src/lib/openbandFormat.ts:88`/`:143`) for the bundle container, or emit a standard zip with `application.xml` at the root.

## Requirements

### Requirement: Export ProjectData to DAWPROJECT XML
A new `src/lib/dawproject.ts` MUST provide `exportDawProject(project: ProjectData): Uint8Array` that emits a DAWPROJECT bundle (root `application.xml` + `resources/`) describing every track, clip, note, device, and automation lane.

#### Scenario: Regions become clips
- **Given** a `TrackDef` with `regions: [{ start: 0, duration: 4 }]`
- **When** `exportDawProject` serializes the track
- **Then** the XML contains a `<Clip>` with `time="0"` and `duration="4"`
- **And** the clip references the parent `<Track>` by id

#### Scenario: MIDI notes become Note elements
- **Given** a `TrackDef` with `midiNotes: [{ pitch: 60, start: 0, duration: 1, velocity: 100 }]`
- **When** `exportDawProject` runs
- **Then** a `<Note>` child is emitted with key `60`, duration `1`, velocity `100` (`src/lib/midiParser.ts` note model)

### Requirement: Preserve Tempo and Time Signature
The exported DAWPROJECT MUST encode `ProjectData.bpm` as the project tempo and map a matching entry from `TIME_SIGNATURES` (`src/lib/projectTemplates.ts:76`) into the DAWPROJECT timing model.

#### Scenario: Tempo exported
- **Given** `ProjectData.bpm = 128`
- **When** `exportDawProject` runs
- **Then** the application model declares tempo `128 BPM`

#### Scenario: Time signature matched
- **Given** a project whose time signature is `"4/4"`
- **When** `exportDawProject` runs
- **Then** the signature `4/4` is found in `TIME_SIGNATURES` (`:76`) and written to the timing element

### Requirement: Import DAWPROJECT to ProjectData
`src/lib/dawproject.ts` MUST provide `importDawProject(bundle: Uint8Array): ProjectData | null` that parses the XML back into `ProjectData`, reconstructing `TrackDef`s, regions, and notes, then runs them through `sanitizeProjectData` (`src/lib/projectStore.ts:197`).

#### Scenario: Clips import as regions
- **Given** a DAWPROJECT `<Clip time="2" duration="8">` inside a track
- **When** `importDawProject` parses it
- **Then** the resulting `TrackDef.regions` contains `{ start: 2, duration: 8 }` (`:54`)

#### Scenario: Notes import as midiNotes
- **Given** a DAWPROJECT track with `<Note key="64" duration="2">`
- **When** `importDawProject` runs
- **Then** `TrackDef.midiNotes` contains `{ pitch: 64, start: 0, duration: 2 }` (`:55`)

### Requirement: Unknown Plugin becomes Placeholder
When an imported DAWPROJECT `<Device>` type or UUID has no OpenBand equivalent, `importDawProject` MUST create a placeholder `Plugin` with `type: "unknown"` and preserve the original vendor/name in its params/metadata, so the session loads without dropping devices.

#### Scenario: Foreign device imported as placeholder
- **Given** a DAWPROJECT `<Device>` with an unrecognized UUID `"com.foreign.synth"`
- **When** `importDawProject` runs
- **Then** `track.plugins` contains a `Plugin` with `type: "unknown"`
- **And** its params hold the original id/name metadata

#### Scenario: Known device maps to real plugin
- **Given** a DAWPROJECT `<Device>` whose type matches an OpenBand `PluginType`
- **When** `importDawProject` runs
- **Then** a concrete plugin instance (e.g. `eq`) is created, not a placeholder

### Requirement: Round-Trip Integrity
An OpenBand `ProjectData` exported via `exportDawProject` and re-imported via `importDawProject` MUST yield a `ProjectData` whose track count, region timings, and note counts match the original (placeholder devices permitted where the original had no DAWPROJECT-native representation).

#### Scenario: Track count preserved
- **Given** a project with 5 tracks
- **When** `importDawProject(exportDawProject(project))` is called
- **Then** the result has exactly 5 `TrackDef`s
- **And** every region `start`/`duration` matches within float tolerance

#### Scenario: Notes preserved
- **Given** a project with 12 MIDI notes across tracks
- **When** the round-trip runs
- **Then** the re-imported project has 12 notes with matching pitch/start/duration

### Requirement: Bundle Container Integrity
The DAWPROJECT bundle builder MUST use CRC-protected archiving consistent with `src/lib/openbandFormat.ts` (`createArchive`/`crc32` at `:88`/`:66`) so a corrupt or truncated bundle is detected and `importDawProject` returns `null` rather than partially loading.

#### Scenario: Corrupt bundle rejected
- **Given** a byte-flipped DAWPROJECT bundle
- **When** `importDawProject` runs
- **Then** CRC validation fails (`src/lib/openbandFormat.ts:172`) and the function returns `null`

#### Scenario: Missing application.xml rejected
- **Given** a bundle with no root `application.xml`
- **When** `importDawProject` runs
- **Then** it returns `null` (`src/lib/openbandFormat.ts:235`)

## Test Requirements (Vitest)
- [ ] `exportDawProject` emits a `<Clip>` per `TrackDef.region` with correct time/duration
- [ ] `exportDawProject` emits `<Note>` per `TrackDef.midiNotes` (pitch/start/duration/velocity)
- [ ] Exported tempo equals `ProjectData.bpm`; signature resolved from `TIME_SIGNATURES`
- [ ] `importDawProject` rebuilds regions from `<Clip>` elements
- [ ] `importDawProject` rebuilds `midiNotes` from `<Note>` elements
- [ ] Unrecognized `<Device>` becomes `Plugin` with `type: "unknown"` and preserved metadata
- [ ] Recognized `<Device>` maps to a real `PluginType` (not placeholder)
- [ ] Round-trip preserves track count and region timings within float tolerance
- [ ] Round-trip preserves MIDI note count and values
- [ ] Corrupt / missing `application.xml` bundle returns `null` from `importDawProject`
