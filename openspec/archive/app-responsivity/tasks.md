# Tasks: App, Desktop, and Tablet Responsivity

## Checklist

### Phase 1: Core Responsivity Hook Updates
- [x] **`src/lib/responsive.ts`**:
  - [x] Update `LAYOUT_MAX_WIDTHS` with numeric values (`feedWide: 1440`, etc).
  - [x] Adjust breakpoints (`mobile < 768`, `tablet < 1024`, `desktop >= 1024`).
  - [x] Rewrite `numColumns` calculation to scale up to 5 columns based on width thresholds.
  - [x] Import `useSafeAreaInsets` and expose `safeTop` and `safeBottom`.

### Phase 2: Screen Layout Refinements
- [x] **`app/tabs/index.tsx` (Feed)**:
  - [x] Apply `width: "100%"` alongside `maxWidth: LAYOUT_MAX_WIDTHS.feedWide` so it scales correctly on smaller screens.
  - [x] Ensure safe area padding is applied to the root view.
- [x] **`app/tabs/library.tsx` (Library)**:
  - [x] Apply `maxWidth: LAYOUT_MAX_WIDTHS.library` and `alignSelf: "center"`.
  - [x] Apply safe area padding.
- [x] **`app/tabs/moments.tsx` (Moments)**:
  - [x] Refactor sample pack card widths to use `numColumns` dynamically rather than hardcoded percentage values, or update the percentages to accommodate 4-5 items per row.
  - [x] Apply safe area padding.

### Phase 3: Shell & Navigation Updates
- [x] **`app/tabs/_layout.tsx`, `extractor.tsx`, `mastering/index.tsx`**:
  - [x] Adjust Sidebar rendering so `resp.isDesktop` (now >= 1024px) triggers the persistent sidebar (enabling it on iPad landscape).

### Phase 4: Verification
- [x] Run `npx tsc --noEmit` to ensure Safe Area typings and logic are correct.
- [x] Run `npx vitest run` to catch any test breakages (especially tests asserting breakpoints or sidebar visibility).
- [x] Manually verify UI across different screen sizes.
