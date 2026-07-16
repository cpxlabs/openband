# Design: Studio "Add Clip" Action

## `handleAddClip` (in `app/studio/[id].tsx`)

Placed near `handleAddTrack` (after `handleAddMidiTrack` or `handleAddSample`).

```ts
const handleAddClip = useCallback(() => {
  const defaultDuration =
    numBars && initialBpm ? (60 / initialBpm) * numBars : 4;
  const target = tracks.find((t) => t.id === selectedTrackId) ?? null;

  if (target) {
    const lastEnd = target.regions.reduce(
      (max, r) => Math.max(max, (r.start || 0) + (r.duration || 0)),
      0,
    );
    const newRegion: TrackRegion = {
      id: "region-" + Date.now(),
      start: lastEnd,
      duration: defaultDuration,
    };
    setTracks(
      tracks.map((t) =>
        t.id === target.id ? { ...t, regions: [...t.regions, newRegion] } : t,
      ),
    );
    return;
  }

  // No selection: create a new audio track with one clip (reuse add-track shape).
  const trackId = "track-" + Date.now();
  const name = "Clip " + (tracks.length + 1);
  const busId = assignTrackToBus(name);
  const newTrack: TrackDef = {
    id: trackId,
    name,
    color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
    muted: false,
    solo: false,
    volume: 75,
    pan: 0,
    sends: {},
    sidechainSource: null,
    outputId: busId,
    regions: [
      { id: "region-" + Date.now(), start: 0, duration: defaultDuration },
    ],
    plugins: [],
    automation: {},
  };
  setTracks([...tracks, newTrack]);
  setSelectedTrackId(trackId);
}, [tracks, setTracks, selectedTrackId, initialBpm, numBars]);
```

Note: `numBars` and `initialBpm` must be available in the component scope
(they are — used by `NewProject`/project init). Confirm they are in scope; if
`numBars` is named differently (e.g. `initialNumBars`), use the actual name.

## Toolbar button
After the Import `Pressable` (around line 1892), add:
```tsx
<Pressable
  onPress={handleAddClip}
  className="h-8 rounded-lg bg-dark-muted/30 items-center justify-center flex-row gap-1.5 active:opacity-70 border border-dark-border/30"
>
  <Text className="text-gray-300 text-xs">▦</Text>
  <Text className="text-gray-300 text-[10px] font-semibold">Clip</Text>
</Pressable>
```

## Command
With the other `registerCommand` calls (near line 1261):
```ts
registerCommand("clip.add", "Add Clip", "Add a clip region to the selected track", "Clip", handleAddClip, "Ctrl+Shift+C");
```
Add `handleAddClip` to the dependency array of that `useEffect`/`useCallback`.

## Test Requirements (add to `openspec/specs/studio-daw/spec.md`)
- [x] "Add clip" appends a valid `TrackRegion` to the selected track at the end of existing regions.
- [x] "Add clip" with no selected track creates a new track containing one region and selects it.

## Tests (`tests/studio.test.tsx`)
Add a "clip controls" describe (or extend an existing one) that renders `<Studio />`
and:
- selects a track (click a track row, or set selection via the existing pattern),
- clicks the "▦ Clip" button,
- asserts the selected track now has one more region than before.
If driving selection is awkward, assert via `screen.getByText("▦")` then
`Clip` and verify a region was added to the project's first track (the component
seeds tracks via `generateTracksForGenre`). Keep the test robust and not
flaky. Alternatively, extract the append logic so it can be unit-tested
purely — but given the existing `studio.test.tsx` already renders `<Studio />`,
follow that pattern.

## Verification
1. `npx tsc --noEmit`
2. `cd backend && npx tsc --noEmit`
3. `npx vitest run tests/studio.test.tsx`
4. `npx vitest run` (no regressions)
5. `npm run test:legacy`
6. `npm run build`
