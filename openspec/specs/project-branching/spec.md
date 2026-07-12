# Project Branching

## Overview
OpenBand provides git-like project branching for CRDT project state, allowing users to fork a project into isolated branches, inspect differences at the track/bus field level, and merge changes back into `main` with selective acceptance. Branch metadata is managed by `src/lib/projectBranching.ts`; snapshot/compaction support lives in `src/lib/snapshotManager.ts`. The UI surfaces are `src/components/BranchManager.tsx`, `src/components/CommitModal.tsx` (which also exports `VersionHistory`), and the underlying CRDT branch state from `src/lib/projectBranching.ts`.

## Implementation Notes
`projectBranching.ts` keeps a module-level `projectState` map of branches (`initBranching` at `:87`, `createBranch` at `:104`, `switchBranch` at `:126`, `diffBranches` at `:198`, `mergeBranch` at `:284`, `deleteBranch` at `:335`). Branch state is a deep clone (`JSON.parse(JSON.stringify(...))`) of the parent on `createBranch`. `diffBranches` compares track/bus fields ignoring `[id, midiNotes, regions]` (`diffObjects` at `:264`). `mergeBranch` accepts an optional `acceptChanges` list using `track:<id>` / `bus:<id>` prefixes to selectively apply changes (`:295`). `snapshotManager.ts` (`createSnapshot` at `:31`, `compactOperations` at `:109`, `shouldSnapshot` at `:79`) bounds history and compacts the op log by snapshot `version`.

## Requirements

### Requirement: Branch Create / Switch / Delete
The system MUST allow creating a child branch from the active branch (deep-cloning its state), switching the active branch, and deleting unmerged non-main branches. Deleting `main` or an already-merged branch MUST be refused.

#### Scenario: Create inherits parent state
- **Given** `initBranching` with a main track
- **When** `createBranch("feature")` is called
- **Then** the new branch's `state.tracks` deep-equals main's tracks
- **And** `switchBranch` makes it active

#### Scenario: Delete refuses main and merged
- **Given** a merged feature branch and `main`
- **When** `deleteBranch("main")` then `deleteBranch(feature.id)` is called
- **Then** both return `false`

### Requirement: Diff Between Branches
`diffBranches` MUST report added/removed/modified tracks and buses between a branch and `main`, including per-field changes.

#### Scenario: Detect added and modified tracks
- **Given** a feature branch with one added track and one modified track field
- **When** `diffBranches(featureId)` is called
- **Then** `addedTracks` contains the new track id
- **And** `modifiedTracks` contains a `FieldDiff` for the changed field

### Requirement: Merge With Selective Accept
`mergeBranch` MUST merge a feature branch into `main`. When `acceptChanges` is omitted or empty, every change is merged. When a non-empty `acceptChanges` list (`track:<id>` / `bus:<id>` prefixes) is supplied, only the listed added/removed tracks and buses are kept — unlisted added tracks/buses are dropped and unlisted removed tracks/buses are restored — while modified track/bus field values are always taken from the branch state.

#### Scenario: No acceptChanges merges everything
- **Given** a feature branch with an added track and a modified track field
- **When** `mergeBranch(featureId)` is called
- **Then** main gains the added track
- **And** the modified track field reflects the branch value

#### Scenario: Selective accept keeps only listed added tracks
- **Given** a feature branch adding tracks `t2` and `t3` and modifying `t1`
- **When** `mergeBranch(featureId, ["track:t2"])` is called
- **Then** main contains `t2` and `t1` (with its branch-modified value)
- **And** `t3` is dropped

### Requirement: Snapshot Compaction
The system MUST bound snapshot history and collapse the operation log against the latest snapshot `version`.

#### Scenario: compactOperations drops old ops
- **Given** a snapshot with `version: 5` and operations with timestamps below and above 5
- **When** `compactOperations(ops, snapshot)` is called
- **Then** only operations with `timestamp > 5` remain

#### Scenario: Should snapshot after op threshold
- **Given** `incrementOperationCount` reaching the threshold
- **When** `shouldSnapshot` is evaluated
- **Then** it returns `true`

## Test Requirements (Vitest)
- [ ] `createBranch` deep-clones parent state and `switchBranch` activates it
- [ ] `diffBranches` reports added and modified tracks/buses
- [ ] `mergeBranch` with `acceptChanges=[]` reverts changes
- [ ] `mergeBranch` with explicit `acceptChanges` preserves accepted changes
- [ ] `deleteBranch` refuses `main` and merged branches
- [ ] `compactOperations` filters by snapshot version
