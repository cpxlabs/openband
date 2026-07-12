# Collaboration CRDT

## Overview
OpenBand implements real-time collaborative editing through operation-based Conflict-free Replicated Data Types (CRDTs). Two distinct implementations exist: `src/lib/crdt.ts` is the lightweight operation log used by the React `useCollaboration` hook in `src/lib/collaboration.ts`, while `src/lib/yjsCRDT.ts` is a standalone WebSocket-synced CRDT document store with Lamport clocks and state vectors. Presence (live cursors) is handled by `src/lib/presence.ts`. On the backend, `backend/src/routes/collab.ts` and `backend/src/routes/presence.ts` broadcast operations and cursor updates over Server-Sent Events (SSE).

## Implementation Notes
`crdt.ts` (`createOperation` at `:24`, `mergeOperations` at `:42`, `applyOperation` at `:76`, `encodeState`/`decodeState` at `:136`/`:140`) is the source of truth for the hook. It uses a monotonic `localClock` and `clientId` for last-writer-wins conflict resolution. `yjsCRDT.ts` is a separate, self-contained module (`createDocument` at `:138`, `applyOperation` at `:184`, `connectToSync` at `:234`, `resolveConflicts` at `:374`) with exponential reconnect backoff (`:269`). `collaboration.ts` layers offline queueing via IndexedDB (`enqueueOperation` at `:53`) and an SSE subscription, flushing queued ops on reconnect (`flushQueue` at `:149`). `presence.ts` throttles cursor broadcasts (`:206`) and caches cursors in localStorage.

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

### Requirement: Offline Operation Queue and Flush
Operations created while offline MUST be persisted to IndexedDB and flushed to the server when connectivity is restored.

#### Scenario: Flush queued ops on reconnect
- **Given** queued operations in the IndexedDB `pending-operations` store
- **When** the SSE connection `onopen` fires (reconnect)
- **Then** `flushQueue` POSTs each queued operation to `/api/collab/:projectId/operation`
- **And** the local queue is drained

### Requirement: Transport Abstraction (SSE / WebSocket)
The collaboration layer MUST support both SSE (used by `useCollaboration` / `usePresence`) and WebSocket (used by `yjsCRDT.connectToSync`) transports, with automatic reconnect and exponential backoff for both.

#### Scenario: WebSocket reconnect with backoff
- **Given** an open `yjsCRDT` sync connection
- **When** the socket closes
- **Then** `connectToSync` schedules a reconnect with `min(3000 * 2^attempt, 60000)` backoff

## Test Requirements (Vitest)
- [ ] `mergeOperations` retains two distinct ops (no data loss)
- [ ] Concurrent same-path ops resolve via last-writer-wins
- [ ] `encodeState` → `decodeState` round-trips the operation list
- [ ] `applyOperation` applies `track.add` / `track.update` to target state
- [ ] `usePresence` throttles rapid cursor sends
- [ ] `yjsCRDT` `createDocument` + `applyOperation` + `getDocumentState` reflect ops
- [ ] `resolveConflicts` returns last-writer-wins resolution
