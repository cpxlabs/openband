# Tasks: App, Desktop, and Tablet Responsivity

## Checklist

### Phase 1: Core Responsivity Hook Updates
- [ ] **`src/lib/responsive.ts`**:
  - [ ] Update `LAYOUT_MAX_WIDTHS` with numeric values (`feedWide: 1440`, etc).
  - [ ] Adjust breakpoints (`mobile < 768`, `tablet < 1024`, `desktop >= 1024`).
  - [ ] Rewrite `numColumns` calculation to scale up to 5 columns based on width thresholds.
  - [ ] Import `useSafeAreaInsets` and expose `safeTop` and `safeBottom`.

### Phase 2: Screen Layout Refinements
- [ ] **`app/tabs/index.tsx` (Feed)**:
  - [ ] Apply `width: "100%"` alongside `maxWidth: LAYOUT_MAX_WIDTHS.feedWide` so it scales correctly on smaller screens.
  - [ ] Ensure safe area padding is applied to the root view.
- [ ] **`app/tabs/library.tsx` (Library)**:
  - [ ] Apply `maxWidth: LAYOUT_MAX_WIDTHS.library` and `alignSelf: "center"`.
  - [ ] Apply safe area padding.
- [ ] **`app/tabs/moments.tsx` (Moments)**:
  - [ ] Refactor sample pack card widths to use `numColumns` dynamically rather than hardcoded percentage values, or update the percentages to accommodate 4-5 items per row.
  - [ ] Apply safe area padding.

### Phase 3: Shell & Navigation Updates
- [ ] **`app/tabs/_layout.tsx`, `extractor.tsx`, `mastering/index.tsx`**:
  - [ ] Adjust Sidebar rendering so `resp.isDesktop` (now >= 1024px) triggers the persistent sidebar (enabling it on iPad landscape).

### Phase 4: Verification
- [ ] Run `npx tsc --noEmit` to ensure Safe Area typings and logic are correct.
- [ ] Run `npx vitest run` to catch any test breakages (especially tests asserting breakpoints or sidebar visibility).
- [ ] Manually verify UI across different screen sizes.
