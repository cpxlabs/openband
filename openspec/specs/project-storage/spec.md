# Project Storage

## Overview
OpenBand persists projects through three layered mechanisms: (1) a local/bridge key-value store in `src/lib/projectStore.ts`, (2) a binary `.openband` archive format with CRC32 integrity in `src/lib/openbandFormat.ts`, and (3) an OpenBandManifest v2 state/asset separation model with SHA-256 commit hashing in `src/lib/stateAssetSeparation.ts`. Storage falls back across web `localStorage`, the desktop `OpenBandNative` bridge, and in-memory IndexedDB queues.

## Implementation Notes
`projectStore.ts` (`saveProject` at `:124`, `loadProject` at `:144`, `exportProject` at `:191`, `importProject` at `:261`, `sanitizeProjectData` at `:197`, `toggleProjectFavorite` at `:329`, `createRemix` at `:314`) writes to `localStorage` under `openband_project_<id>` and queues a bridge save. `sanitizeProjectData` validates `id`, `title`, `bpm` and fills defaults for missing fields. `openbandFormat.ts` (`createOpenBandArchive` at `:182`, `parseOpenBandArchive` at `:224`, `crc32` at `:66`, `projectToOpenBand` at `:348`) builds a magic-prefixed archive with per-file CRC32 checks; `parseArchive` throws on a bad magic header. `stateAssetSeparation.ts` (`createProject` at `:87`, `commitState` at `:170`, `sha256` at `:70`) produces commits with a SHA-256 `stateHash` and tracks `audioAssetRef` pointers via `getAssetRefs`.

## Requirements

### Requirement: Persist Project (localStorage / Bridge)
The system MUST persist a project to `localStorage` on web and queue it to the desktop `OpenBandNative` bridge, updating an index entry.

#### Scenario: Save then load round-trips
- **Given** a project definition with `title` and `bpm`
- **When** `saveProject(id, data)` then `loadProject(id)` is called
- **Then** the returned project deep-equals the saved data (with `id` and `lastSaved` set)

### Requirement: Export / Import JSON
The system MUST serialize a saved project to pretty-printed JSON and re-import it, sanitizing fields on load.

#### Scenario: Export and re-import
- **Given** a saved project
- **When** `exportProject` produces JSON and `importProject` reads it back
- **Then** a new project id is returned and `loadProject` yields sanitized data

#### Scenario: Import rejects invalid data
- **Given** JSON missing a required `title` or with non-numeric `bpm`
- **When** `importProject` is called
- **Then** it returns `null` (sanitize rejected the payload)

### Requirement: .openband Binary Archive With CRC32 Integrity
The system MUST produce a binary `.openband` archive (magic `OPENBAND`, version, entries with CRC32) and parse it back, detecting corruption.

#### Scenario: Archive round-trips project
- **Given** an `OpenBandProject`
- **When** `createOpenBandArchive` then `parseOpenBandArchive` is called
- **Then** the parsed project deep-equals the original

#### Scenario: Corrupted magic header fails to parse
- **Given** a valid archive
- **When** its magic header bytes are corrupted and `parseOpenBandArchive` is called
- **Then** it returns `null` (integrity failure)

### Requirement: OpenBandManifest v2 With SHA-256 Asset Hashing
`stateAssetSeparation.ts` MUST maintain an OpenBandManifest v2 (`format: "openband-v2"`) and produce commits whose `stateHash` is a SHA-256 hex digest of the serialized project state, with `assetRefs` tracking audio asset pointers.

#### Scenario: Commit produces SHA-256 state hash
- **Given** a created project with at least one track
- **When** `commitState("msg")` is called
- **Then** the commit `stateHash` is a 64-character hexadecimal SHA-256 string
- **And** asset refs are collected via `getAssetRefs`

### Requirement: Sanitize On Load
`loadProject` / `importProject` MUST sanitize raw storage data, coercing missing arrays to `[]`, defaulting `metronome`/`recordSettings`, and rejecting structurally invalid payloads.

#### Scenario: Missing arrays default to empty
- **Given** stored JSON without `tracks`/`buses`
- **When** `loadProject` is called
- **Then** `tracks` and `buses` are `[]`
- **And** a valid `metronome` default object is provided

## Test Requirements (Vitest)
- [ ] `saveProject` → `loadProject` round-trips
- [ ] `importProject` accepts valid JSON and returns an id
- [ ] `importProject` returns `null` for invalid payloads (sanitize)
- [ ] `.openband` archive round-trips via `createOpenBandArchive` / `parseOpenBandArchive`
- [ ] Corrupted magic header yields `null` from `parseOpenBandArchive`
- [ ] `commitState` yields a 64-char SHA-256 `stateHash`
- [ ] `sanitizeProjectData` defaults missing arrays and `metronome`
