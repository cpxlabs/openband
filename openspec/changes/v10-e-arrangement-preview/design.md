# Design: V10 Section E — Arrangement Preview

## Module
Extend `src/lib/arrangementGenerator.ts` (reuse `EnergySection`, `EnergyLevel`,
`generateArrangement`, `getTotalBars`). No new file; re-export through `src/lib/arrangement.ts`.

## Types
```ts
export interface PreviewWindow {
  sectionIndex: number;
  startBar: number;
  endBar: number;
  bars: number;
}
```

## API (added to arrangementGenerator.ts)
```ts
export function selectRepresentativeWindows(
  arrangement: EnergySection[],
  opts: { maxWindows: number; previewBudgetBars: number },
): PreviewWindow[];

export function pickHighEnergy(sections: EnergySection[], n = 1): EnergySection[];
export function pickContrast(sections: EnergySection[], n = 1): EnergySection[];

export function clampWindowToContent(win: PreviewWindow, totalBars: number): PreviewWindow;

export function arrangementCacheKey(genre: string, bpm: number, key: string): string;
export function isRenderCacheValid(cacheKey: string, current: { bpm: number; key: string }): boolean;

export function shouldRenderFullArrangement(bars: number): boolean;
```

## selectRepresentativeWindows
- If `arrangement` is empty (unknown subgenre) → return ONE short window
  `{ sectionIndex: -1, startBar: 0, endBar: Math.min(8, previewBudgetBars), bars: ... }`
  (short-loop fallback, E40).
- Else: collect candidate windows, one per section (startBar..endBar), preferring
  high-energy sections first (via `pickHighEnergy`) then contrast pairs (via `pickContrast`),
  until `windows.length >= maxWindows` OR cumulative `bars > previewBudgetBars`.
- Every returned window is passed through `clampWindowToContent(win, getTotalBars(subgenre))`.
- Result length ≤ `maxWindows` and total bars ≤ `previewBudgetBars` (E36/E37).
- At least one window is a high-energy section when available (E38); a contrast pair is
  included when available (E39).

## pickHighEnergy / pickContrast
- `pickHighEnergy`: sections sorted by `energy` desc, take top `n` (energy >= 4 preferred).
- `pickContrast`: adjacent sections with the largest `|energy[a]-energy[b]|`, take top `n`.

## clampWindowToContent
Clamp `startBar` to `[0, totalBars]`, `endBar` to `[startBar, totalBars]`, derive `bars`.

## Cache
- `arrangementCacheKey(genre, bpm, key)` = `JSON.stringify({genre,bpm,key})`.
- `isRenderCacheValid(cacheKey, current)` = `cacheKey === arrangementCacheKey("", current.bpm, current.key)`?
  Actually validity compares the cached key to a freshly computed key for the same genre:
  `isRenderCacheValid(cacheKey, {bpm,key})` returns `cacheKey === arrangementCacheKey(genreFromKey(cacheKey), bpm, key)`.
  Simpler: store the full key; valid iff it deep-equals the current key. For E42 the test
  builds a key then changes bpm/key and asserts `isRenderCacheValid` returns false.

## shouldRenderFullArrangement
`return bars <= 16;` → full arrangement is only rendered for short loops; the 48–112 bar
range returns `false` (E43). The UI must use windows, not the full arrangement.

## Manual section playback (E41)
`selectRepresentativeWindows` already returns explicit windows; a manual selection is just
calling `clampWindowToContent` on a user-requested `{sectionIndex,startBar,endBar}` and
playing that window. No extra function needed; E41 is satisfied by `clampWindowToContent`
returning the requested (clamped) window.
