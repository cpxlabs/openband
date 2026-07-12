# Tasks — Wire Collab Presence into Studio

## 1. Mount presence in studio
- [ ] In `app/studio/[id].tsx`, import `usePresence` from `src/lib/presence` and `useAuth` from `../../src/context/AuthContext`.
- [ ] Resolve `userId` (`user?.id ?? visitorId`) and `userName` (`user?.user_metadata?.name ?? "Visitante"`).
- [ ] Instantiate `usePresence({ projectId: id, userId, userName, throttleMs: 50 })`; capture `cursors`, `sendCursor`, `isConnected`.

## 2. Broadcast local cursor
- [ ] On the timeline container's pointer-move handler, compute normalized `cursorX` and `sendCursor(cursorX, focusedTrackId, currentTime)`.
- [ ] On track focus change and on `onClockTick` (playhead), `sendCursor` with current `playheadPosition`.
- [ ] Guard sends behind `isConnected` / non-null `projectId`.

## 3. Render remote cursors
- [ ] Add a `CollaboratorCursors` overlay (local component) receiving `cursors` + `timelineWidth`.
- [ ] Render each remote cursor as an absolutely-positioned marker with `userName` at `left = cursorX * timelineWidth`, over the timeline ruler.

## 4. Tests (new stub)
- [ ] Add `tests/` studio-presence test (Vitest + React Testing Library): renders studio, asserts `usePresence` is subscribed (mock `src/lib/presence`) and `sendCursor` is called on a simulated pointer move / playhead tick.

## 5. Spec update
- [ ] Add "Presence Rendered in Studio" requirement + test requirement to `openspec/specs/collaboration-crdt/spec.md`.

## Verification
- [ ] `npx tsc --noEmit` clean
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `npx vitest run` passes
