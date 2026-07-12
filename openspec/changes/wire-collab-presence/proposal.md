# Proposal — Wire Collab Presence into Studio

## Context
Real-time collaboration presence is fully built on the backend: `backend/src/routes/presence.ts` exposes SSE subscribe (`GET /api/presence/:projectId/subscribe`), cursor broadcast (`POST /api/presence/:projectId/cursor`), and leave (`POST /api/presence/:projectId/leave`). A frontend consumer already exists: `src/lib/presence.ts` exports `usePresence({ projectId, userId, userName, throttleMs })` which opens the SSE subscription, throttles `sendCursor` (`:206`), caches cursors in localStorage, and returns `{ cursors, sendCursor, isConnected }`. The CRDT collaboration layer (`src/lib/collaboration.ts`) similarly consumes an SSE endpoint for operations.

Despite this, **no screen consumes `usePresence`** — collaborators' live cursors never render. The studio (`app/studio/[id].tsx`) already imports collaboration-adjacent components (`BranchManager`, `CommitModal`, `CommandPalette`) but never instantiates presence. The `collaboration-crdt` spec lists "Presence Cursors" as a requirement, but it is unmet on the client.

## Problem Description
- The `usePresence` hook is implemented but orphaned — zero importers.
- Multi-user cursor positions (x, active track, playhead) are broadcast by the backend and received by the hook, but there is no UI surface to display them.
- Users cannot see who else is in the session or where their cursors are.

## Objectives
- Consume `usePresence` from `src/lib/presence.ts` inside `app/studio/[id].tsx` to subscribe to the project's presence channel.
- Broadcast the local user's cursor/playhead on interaction (pointer move / track focus / transport) via the existing throttled `sendCursor`.
- Render remote collaborator cursors (name + position) over the studio timeline/track area.
- Add a test verifying the studio wires the hook (subscribes + sends) and update `openspec/specs/collaboration-crdt/spec.md`.

## Scope
**M** — medium: one studio integration (mount hook + broadcast + render) + test + spec edit. Reuses the existing `usePresence`; no new SSE endpoints.

## Out of Scope
- Changing backend presence protocol or `usePresence` internals.
- Full CRDT operation UI wiring (covered by separate collab work).
- Auth/user-identity mapping beyond the existing `userName` (from `useAuth()` or visitor id).
