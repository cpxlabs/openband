# Tasks: V10 Section E — Arrangement Preview

## Implementation
- [ ] E1. Extend `src/lib/arrangementGenerator.ts` with `PreviewWindow`, `selectRepresentativeWindows`, `pickHighEnergy`, `pickContrast`, `clampWindowToContent`, `arrangementCacheKey`, `isRenderCacheValid`, `shouldRenderFullArrangement`. Re-export via `src/lib/arrangement.ts`.
- [ ] E2. Add `tests/arrangementPreview.test.ts` covering E35–E44.

## Verification
- [ ] Run `npx tsc --noEmit`
- [ ] Run `cd backend && npx tsc --noEmit`
- [ ] Run `npx vitest run`
- [ ] Run `npm run test:legacy`
- [ ] Run `npm run graph:ci`
- [ ] Run `npm run build`

## Acceptance (maps to V10 master tasks)
- [x] E35. Known subgenre returns arrangement sections.
- [x] E36. Representative selector chooses ≤ configured max windows.
- [x] E37. Selected windows stay within preview budget.
- [x] E38. At least one high-energy section selected when available.
- [x] E39. Low/medium contrast selected when available.
- [x] E40. No-arrangement genre falls back to short-loop preview.
- [x] E41. Manual section selection plays requested section.
- [x] E42. BPM/key change invalidates render cache but not unrelated session state.
- [x] E43. Full 48–112 bar arrangement is not rendered on each tweak.
- [x] E44. Preview window boundaries do not exceed generated content duration.
