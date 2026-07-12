# History: Local Undo / Redo

## Overview
OpenBand provides **local** undo/redo of project edits through the Command Pattern. Every mutating edit (add/remove/update of tracks, regions, or plugin parameters) is expressed as an `UndoCommand` carrying an `execute` and an `inverse`, pushed onto a bounded undo stack. `useHistory<T>` (`src/lib/history.ts:324`) wraps a reducer that snapshots the previous `present` on every `SET`, enabling linear undo/redo within a single client session.

This spec covers **local** history only. Remote merge/sync is owned by the `collaboration-crdt` spec; this spec does not address multi-user CRDT rebasing.

## Implementation Notes
The stack primitives live in `src/lib/history.ts`: `createUndoStack`/`pushUndoCommand` (`src/lib/history.ts:19`, `:27`) manage an explicit `UndoStack` of `{undoStack, redoStack, maxHistory}`. `executeUndo`/`executeRedo` (`src/lib/history.ts:58`, `:86`) apply the `inverse`/`execute` functions over a `Record<string, unknown>` state and rely on `validate` to skip stale commands. Command factory helpers `createTrackAddCommand`, `createTrackRemoveCommand`, `createTrackUpdateCommand`, `createNoteAddCommand`, `createNoteRemoveCommand` (`src/lib/history.ts:118`–`:280`) each define `execute`/`inverse`/`validate` keyed by `trackId`/`noteId`.

The React hook `useHistory<T>` (`src/lib/history.ts:324`) exposes `state`, `setState`, `undo`, `redo`, `canUndo`, `canRedo`. Its reducer (`historyReducer` at `:295`) keeps the last `MAX_HISTORY` (100) snapshots in `undoStack` and clears `redoStack` on each new `SET`. The studio screen wires `undoHistory`/`redoHistory` to the `Cmd+Z` / `Cmd+Shift+Z` shortcuts and the `transport.undo` / `transport.redo` command registry entries (`app/studio/[id].tsx:1445`).

## Requirements

### Requirement: Command-Pattern Undo/Redo Stack
The system MUST represent each local mutating edit as an `UndoCommand` (`src/lib/history.ts:3`) containing `execute` and `inverse` functions plus a `validate` guard, and MUST maintain separate `undoStack` and `redoStack` collections.

#### Scenario: Undo a track-region addition
- **Given** a track with `regions: []` and one undo command for a region add on the stack
- **When** `executeUndo` is invoked
- **Then** `inverse` removes the region from the track
- **And** the command moves to `redoStack`

#### Scenario: Redo restores the edit
- **Given** the region was just undone (command on `redoStack`)
- **When** `executeRedo` is invoked
- **Then** `execute` re-adds the region
- **And** the command returns to `undoStack`

### Requirement: Track and Region Edits Are Undoable
The system MUST provide inverse commands for add/remove/update of tracks and add/remove of MIDI notes, via `createTrackAddCommand`, `createTrackRemoveCommand`, `createTrackUpdateCommand`, `createNoteAddCommand`, `createNoteRemoveCommand` (`src/lib/history.ts:118`–`:280`).

#### Scenario: Undo a track volume change
- **Given** track `t1` with `volume: 80` and a `createTrackUpdateCommand(t1, "volume", 80, 40)` on the stack
- **When** `executeUndo` runs against the state
- **Then** `t1.volume` becomes `80`
- **And** re-running `executeRedo` sets it back to `40`

#### Scenario: Remove-track inverse re-inserts data
- **Given** a `createTrackRemoveCommand` carrying `trackData`
- **When** `executeUndo` runs
- **Then** the full `trackData` is restored to `state.tracks`

### Requirement: Keyboard Shortcuts
The system MUST bind local undo to `Cmd+Z` (meta+z) and redo to `Cmd+Shift+Z` (meta+shift+z) on the studio screen, dispatching `undoHistory` / `redoHistory` (`app/studio/[id].tsx:1445`).

#### Scenario: Cmd+Z triggers undo
- **Given** the studio is focused and at least one undo command exists
- **When** the user presses `Cmd+Z`
- **Then** `undo()` is invoked and `canUndo` decreases

#### Scenario: Cmd+Shift+Z triggers redo
- **Given** at least one redo command exists
- **When** the user presses `Cmd+Shift+Z`
- **Then** `redo()` is invoked and `canRedo` decreases

### Requirement: Bounded Stack With Validation Guard
The undo stack MUST be capped at `MAX_HISTORY` (100) snapshots and any command whose `validate` returns `false` against the current state MUST be skipped (its stack entry dropped) rather than applied.

#### Scenario: Stale command is skipped
- **Given** an undo command whose `validate` returns `false` (target already removed)
- **When** `executeUndo` runs
- **Then** the command is removed from `undoStack`
- **And** the returned `applied` flag is `false` with unchanged state

#### Scenario: Stack truncates oldest
- **Given** more than 100 edits have occurred
- **When** a new `SET` is pushed
- **Then** the oldest snapshot is evicted (max 100 retained)

### Requirement: New Edits Clear Redo
Any fresh mutating edit (`SET`) MUST clear the `redoStack` so redo is only available for commands undone in the current linear history.

#### Scenario: Edit after undo clears redo
- **Given** the user performed undo, leaving `redoStack` non-empty
- **When** the user makes a new edit via `setState`
- **Then** `redoStack` is emptied
- **And** `canRedo` becomes `false`

## Test Requirements (Vitest)
- [ ] `createUndoStack` seeds empty `undoStack`/`redoStack` with `maxHistory`
- [ ] `pushUndoCommand` appends and clears `redoStack`
- [ ] `executeUndo`/`executeRedo` apply inverse/execute and swap stacks
- [ ] `executeUndo` drops a command whose `validate` returns `false`
- [ ] `createTrackUpdateCommand` round-trips a field value through undo+redo
- [ ] `createNoteAddCommand`/`createNoteRemoveCommand` inverse each other
- [ ] `useHistory` reducer evicts beyond 100 and clears redo on new SET
- [ ] Cmd+Z / Cmd+Shift+Z dispatch `undoHistory`/`redoHistory` (studio key handler)
