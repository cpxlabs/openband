# Design: Project Starter Wiring & Validation

## Data Flow
`NewProject` (UI state: name, selectedGenre, bpm, selectedKey, selectedMood, numBars, timeSignature) → builds `ProjectStarterConfig` → `setupProjectStarter(config)` → `ProjectStarterResult` → `onCreate(result)` / `onStartFromScratch(result)`.

## Config shape
`ProjectStarterConfig` (already in `src/lib/projectStarter.ts`):
```
{ name, genreId, mood?, bpm?, numBars?, timeSignature?, key?, startFromScratch? }
```
Note: the wizard stores a `GenreTemplate` object (`selectedGenre`), but `setupProjectStarter` takes `genreId: string`. The wiring maps `selectedGenre.id` → `genreId`.

## Wiring changes in `NewProject.handleCreate`
```ts
const result = setupProjectStarter({
  name: finalName,
  genreId: selectedGenre.id,
  mood: selectedMood,
  bpm,
  numBars,
  timeSignature,
  key: selectedKey,
});
// reset local state ...
onCreate(result);
```
`handleScratch`:
```ts
const result = setupProjectStarter({
  name: finalName || "Projeto em Branco",
  genreId: selectedGenre.id,
  mood: selectedMood,
  bpm,
  numBars,
  timeSignature,
  key: selectedKey,
  startFromScratch: true,
});
// reset local state ...
onStartFromScratch?.(result);
onClose();
```

## `onCreate` / `onStartFromScratch` prop signature
`NewProjectProps` `onCreate` currently expects the raw config object. Update to accept `ProjectStarterResult`:
```ts
onCreate: (result: ProjectStarterResult) => void;
onStartFromScratch?: (result: ProjectStarterResult) => void;
```
Update callers (grep `NewProject` usages) to consume `result.tracks`, `result.bpm`, etc. (they currently read fields off the config object — field names match `ProjectStarterResult` for `name`/`bpm`/`numBars`/`timeSignature`/`key`; `genre` → `genreId`).

## Tests to add (`tests/projectStarter.test.ts`)
- `regionDurationFor` matches `(numBars * beatsPerBar * 60) / bpm` for `4/4`, `3/4`, `6/8`.
- `setupProjectStarter` with `numBars: 200` clamps to `64`; `numBars: 0` clamps to `1`.
- `setupProjectStarter` with `bpm` above `genre.bpmRange` clamps to max; below clamps to min.
- `setupProjectStarter({ startFromScratch: true })` → `tracks.length === 0` and metadata preserved.
- `setupProjectStarter({ genreId: "pop", numBars: 16, ... })` → `tracks.length === GENRES.find(g=>g.id==="pop").suggestedTracks.length`.

## Component test alignment
`tests/components*.test.tsx` / `tests/screens.test.tsx` that render `NewProject` and assert `onCreate` was called with a config object should be updated to expect a `ProjectStarterResult` (the field names overlap, so most assertions stay valid; adjust `genre` → `genreId` if referenced).
