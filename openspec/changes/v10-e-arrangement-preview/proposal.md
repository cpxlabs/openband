# Proposal: V10 Section E — Arrangement Preview

## Context
V10 Section A–D cover exact promotion, determinism, locks, and variation history. Section E
adds **arrangement preview**: instead of rendering the full 48–112 bar arrangement on every
tweak, the app selects a bounded set of representative preview windows (high-energy moments,
contrasting sections) within a preview budget, and only re-renders when the cache key
(genre/bpm/key) actually changes. Unknown subgenres fall back to a short-loop preview.

`src/lib/arrangementGenerator.ts` already provides `generateArrangement(subgenreId)` →
`EnergySection[]` (with `energy: 1..5`) and `getTotalBars`. Section E extends it with a
representative-window selector, high-energy/contrast pickers, window clamping, and a
render-cache key/validity guard.

## Objectives
- `selectRepresentativeWindows(arrangement, { maxWindows, previewBudgetBars })` → bounded windows.
- `pickHighEnergy` / `pickContrast` helpers feeding the selector.
- `clampWindowToContent` keeps windows inside generated content duration.
- `arrangementCacheKey(genre, bpm, key)` + `isRenderCacheValid` invalidate render on bpm/key change.
- `shouldRenderFullArrangement(bars)` guard — full 48–112 bar arrangement is never rendered per tweak.
- Unknown subgenre (empty arrangement) falls back to a short-loop preview window.

## Non-goals
No UI rendering changes (UI wiring is later). No audio. Pure functions + tests.
