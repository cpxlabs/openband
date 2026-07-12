# Collaboration CRDT

## Overview
OpenBand implements real-time collaborative editing through a single operation-based Conflict-free Replicated Data Type (CRDT) implementation in `src/lib/crdt.ts`, which is the source of truth for the React `useCollaboration` hook in `src/lib/collaboration.ts`. Presence (live cursors) is handled by `src/lib/presence.ts`. On the backend, `backend/src/routes/collab.ts` and `backend/src/routes/presence.ts` broadcast operations and cursor updates over Server-Sent Events (SSE).

## Implementation Notes
`crdt.ts` (`createOperation` at `:24`, `mergeOperations` at `:42`, `applyOperation` at `:76`, `encodeState`/`decodeState` at `:136`/`:140`) is the source of truth for the hook. It uses a monotonic `localClock` and `clientId` for last-writer-wins conflict resolution. `collaboration.ts` layers offline queueing via IndexedDB (`enqueueOperation` at `:53`) and an SSE subscription, flushing queued ops on reconnect (`flushQueue` at `:149`). `presence.ts` throttles cursor broadcasts (`:206`) and caches cursors in localStorage.

## Requirements

### Requirement: CRDT Operation Merge Without Data Loss
Concurrent operations from different clients on distinct paths MUST be merged into a single operation log with no loss. Operations with the same path+type+user key MUST resolve via last-writer-wins (higher `timestamp`, then higher `clientId`).

#### Scenario: Two distinct ops merge into one log
- **Given** an existing operation log `[opA]`
- **When** `mergeOperations(existing, [opB])` is called with a distinct operation `opB`
- **Then** the result contains both `opA` and `opB`
- **And** the log length is `2`

#### Scenario: Concurrent conflict resolves last-writer-wins
- **Given** two operations targeting the same path with different `userId`
- **When** they are merged
- **Then** only the operation with the greater `timestamp` (or `clientId` on tie) is retained

### Requirement: Operation Encode / Decode Round-Trip
The operation log MUST serialize to a string and deserialize back without losing operations or the clock/identity.

#### Scenario: encode then decode preserves operations
- **Given** a list of `CrdtOperation`s
- **When** `encodeState(ops)` then `decodeState(...)` is called
- **Then** the decoded `operations` deep-equals the original list
- **And** the `clientId` is preserved

### Requirement: Presence Cursors
The system MUST broadcast and receive live cursor positions (x, active track, playhead) for collaborators over SSE, throttled to avoid spam.

#### Scenario: Throttled cursor send
- **Given** `usePresence` with `throttleMs = 50`
- **When** `sendCursor` is called twice within 50ms
- **Then** only the first send is dispatched
- **And** `cursors` from other users are stored in a `Map` keyed by `userId`

### Requirement: Presence Rendered in Studio
The studio (`app/studio/[id].tsx`) MUST consume `usePresence` for the active project, broadcast the local cursor/playhead on interaction (throttled), and render remote collaborators' cursors over the timeline.

#### Scenario: Studio wires and broadcasts presence
- **Given** the studio is mounted with a route `id`
- **When** the user moves the pointer over the timeline or the transport clock ticks
- **Then** `sendCursor` is invoked with the normalized cursor position, active track, and playhead
- **And** remote cursors from `usePresence` render as named markers over the timeline

### Requirement: Offline Operation Queue and Flush
Operations created while offline MUST be persisted to IndexedDB and flushed to the server when connectivity is restored.

#### Scenario: Flush queued ops on reconnect
- **Given** queued operations in the IndexedDB `pending-operations` store
- **When** the SSE connection `onopen` fires (reconnect)
- **Then** `flushQueue` POSTs each queued operation to `/api/collab/:projectId/operation`
- **And** the local queue is drained

### Requirement: Transport Abstraction (SSE)
The collaboration layer MUST support SSE (used by `useCollaboration` / `usePresence`) with automatic reconnect and exponential backoff.

## Test Requirements (Vitest)
- [ ] `mergeOperations` retains two distinct ops (no data loss)
- [ ] Concurrent same-path ops resolve via last-writer-wins
- [ ] `encodeState` → `decodeState` round-trips the operation list
- [ ] `applyOperation` applies `track.add` / `track.update` to target state
- [ ] `usePresence` throttles rapid cursor sends
- [ ] `usePresence` subscribes to the SSE endpoint, POSTs cursors, and receives remote cursors (`tests/presence.test.ts`)
- [ ] `mergeRemoteCursor` keys remote cursors by `userId` and excludes the local user
