# Design — Wire Collab Presence into Studio

## File / Requirement Mapping

| Change | File | Symbols |
|---|---|---|
| Mount presence hook | `app/studio/[id].tsx` | import `usePresence` from `src/lib/presence`; instantiate with `projectId` (= route `id`), `userId`/`userName` from `useAuth()` (fallback `visitorId`) |
| Broadcast local cursor | `app/studio/[id].tsx` | call `sendCursor(cursorX, activeTrackId, playheadPosition)` from pointer handlers and transport tick |
| Render remote cursors | `app/studio/[id].tsx` | map over `cursors` to render name + position overlay; new small `CollaboratorCursors` local component |
| Test | `tests/...` (or `app` test) | assert hook subscription + cursor send on interaction |
| Spec update | `openspec/specs/collaboration-crdt/spec.md` | add "Presence Rendered in Studio" requirement |

## Reusing Existing Code
The hook `usePresence` in `src/lib/presence.ts` already does the heavy lifting:
- Opens `EventSource(/api/presence/:projectId/subscribe?userId=...&userName=...)` (`:52`).
- `onmessage` parses incoming cursors and stores them in a `Map` keyed by `userId`, excluding the local `userId` (`:124`).
- `sendCursor(cursorX, activeTrackId, playheadPosition)` POSTs to `.../cursor` and is internally throttled to `throttleMs` (default `50`, `:206`).
- Returns `{ cursors, sendCursor, isConnected }`.

No new SSE subscription code is needed — only a consumer. The throttling requirement in the spec (presence-crdt: "Throttled cursor send") is already satisfied by `sendCursor`.

## Studio Integration
`app/studio/[id].tsx` already has `const { id } = useLocalSearchParams()` and imports `useAuth` is NOT currently imported there — add `import { useAuth } from "../../src/context/AuthContext"`. Resolve identity:
- `userId = user?.id ?? visitorId ?? "anon-studio"`
- `userName = user?.user_metadata?.name ?? "Visitante"`

Instantiate near the other collaboration-related state:
```
const { cursors, sendCursor, isConnected } = usePresence({
  projectId: typeof id === "string" ? id : null,
  userId,
  userName,
  throttleMs: 50,
});
```

### Broadcast points
- On the main timeline/scroll view `onPointerMove` (or `onTouchMove`), compute `cursorX` (normalized 0..1 across the timeline width) and call `sendCursor(cursorX, focusedTrackId, currentTime)`.
- When `focusedTrackId` changes (track selection) and on `onClockTick` (playhead moves), call `sendCursor` with the current `playheadPosition = currentTime`.
- Guard all sends behind `isConnected` (the hook already no-ops when `projectId` is null).

### Rendering
Add a `CollaboratorCursors` overlay component (kept inside the studio file) that receives `cursors` and `timelineWidth`:
```
{Array.from(cursors.values()).map((c) => (
  <View key={c.userId} style={{ left: c.cursorX * timelineWidth }} className="absolute top-0 ...">
    <Text>{c.userName}</Text>
  </View>
))}
```
Place it absolutely over the timeline ruler area so remote cursors track horizontally with the playhead.

## Spec Update
Add to `openspec/specs/collaboration-crdt/spec.md` a requirement "Presence Rendered in Studio":

> The studio MUST consume `usePresence` for the active project, broadcast the local cursor/playhead on interaction (throttled), and render remote collaborators' cursors.

And a test requirement: studio wires `usePresence` and `sendCursor` is invoked on pointer/transport interaction.
