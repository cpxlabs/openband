# Design: V10 Section D — Variation History

## Module
New file `src/lib/variationHistory.ts`. Imports `ApprovedStarterSnapshot` from
`src/lib/snapshotPromotion` (already on master — no cross-PR dependency).

## Data model
```ts
export interface HistoryEntry {
  id: string;
  snapshot: ApprovedStarterSnapshot;
  previewUri: string | null;
}

export interface VariationHistoryOptions {
  defaultKeep?: number;   // 3
  hardMax?: number;       // 5
  onEvict?: (entry: HistoryEntry) => void;  // revoke preview resource
}

export class VariationHistory {
  constructor(opts?: VariationHistoryOptions);
  push(entry: HistoryEntry): void;        // appends; selects it; evicts if over hardMax
  select(id: string): void;               // move selection pointer; no regen
  get selected(): HistoryEntry | null;
  get entries(): HistoryEntry[];
  get selectedId(): string | null;
  reset(): void;                         // revoke all entries, then clear
}
```

## Behavior
- `push` appends the entry and makes it the selected entry. After push, if `entries.length > hardMax`, evict the oldest entry that is NOT selected (scan from front), calling `onEvict` for it. If every entry is selected (only possible when length===1), do not evict below 1.
- `defaultKeep` (3) is a hint for UI ("keep last 3"); the hard guarantee is `hardMax` (5). Eviction is driven by `hardMax`. (D28 default-keeps-3 is verified by pushing 3 → length 3, no eviction; D29 hard-max-5 by pushing 6 → length ≤ 5.)
- `select(id)` only changes `selectedId`; it never calls `onEvict`, never pushes, never regenerates (D32).
- `reset()` calls `onEvict` for every entry (revoke all previews) then clears `entries` and `selectedId` (D34).
- Selected entry is never evicted: when evicting, skip the entry whose `id === selectedId` (D30).
- `selected` returns the entry with `id === selectedId`, or `null` if none. So promoting the selected entry (even if it is not the latest pushed) promotes that one (D33).

## Determinism / safety
No randomness, no timers. `onEvict` is the only side-effecting callback (used to revoke
blob URLs / audio buffers). All operations are synchronous and pure apart from `onEvict`.
