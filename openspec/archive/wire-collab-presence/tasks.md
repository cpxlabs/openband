# Tasks — Wire Collab Presence into Studio

## 1. Mount presence in studio
  - [x] In `app/studio/[id].tsx`, import `usePresence` from `src/lib/presence` and `useAuth` from `../../src/context/AuthContext`.
  - [x] Resolve `userId` (`user?.id ?? visitorId`) and `userName` (`user?.user_metadata?.name ?? "Visitante"`).
  - [x] Instantiate `usePresence({ projectId: id, userId, userName, throttleMs: 50 })`; capture `cursors`, `sendCursor`, `isConnected`.

## 2. Broadcast local cursor
  - [x] On the timeline container's pointer-move handler, compute normalized `cursorX` and `sendCursor(cursorX, focusedTrackId, currentTime)`.
  - [x] On track focus change and on `onClockTick` (playhead), `sendCursor` with current `playheadPosition`.
  - [x] Guard sends behind `isConnected` / non-null `projectId`.

## 3. Render remote cursors
  - [x] Add a `CollaboratorCursors` overlay (local component) receiving `cursors` + `timelineWidth`.
  - [x] Render each remote cursor as an absolutely-positioned marker with `userName` at `left = cursorX * timelineWidth`, over the timeline ruler.

## 4. Tests (new stub)
  - [x] Add `tests/` studio-presence test (Vitest + React Testing Library): renders studio, asserts `usePresence` is subscribed (mock `src/lib/presence`) and `sendCursor` is called on a simulated pointer move / playhead tick.

## 5. Spec update
  - [x] Add "Presence Rendered in Studio" requirement + test requirement to `openspec/specs/collaboration-crdt/spec.md`.

## Verification
  - [x] `npx tsc --noEmit` clean
  - [x] `cd backend && npx tsc --noEmit` clean
  - [x] `npx vitest run` passes
