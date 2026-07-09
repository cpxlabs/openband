# OpenSpec Tasks: UI Cards & Responsivity

## Checklist

### Phase 1: Component Extraction
- [x] Create `src/components/FeedPostCard.tsx` and move the inline `FeedPostCard` component from `app/tabs/index.tsx`.
- [x] Create `src/components/SamplePackCard.tsx` and extract the pack card rendering logic from `app/tabs/moments.tsx`.
- [x] Create `src/components/ProjectCard.tsx` and extract the project card rendering logic from `app/tabs/library.tsx`.
- [x] Update `src/components/index.ts` to export the new components.

### Phase 2: Refactor Screens
- [x] **Feed (`app/tabs/index.tsx`)**:
  - Import `FeedPostCard`.
  - Update `FlatList` to accept `key={resp.numColumns}` and `numColumns={resp.numColumns}`.
  - Apply `columnWrapperStyle` with a gap for multi-column layouts.
- [x] **Moments (`app/tabs/moments.tsx`)**:
  - Import `SamplePackCard`.
  - Refactor the Packs flex container to dynamically apply width percentages based on breakpoints (e.g. `w-full`, `w-[48%]`, `w-[31%]`).
- [x] **Library (`app/tabs/library.tsx`)**:
  - Import `ProjectCard`.
  - Update `FlatList` to accept `key={resp.numColumns}` and `numColumns={resp.numColumns}`.
  - Apply `columnWrapperStyle` with a gap.

### Phase 3: Verification
- [x] Run `npx tsc --noEmit` to ensure type safety after extraction.
- [x] Run `npx vitest run` to verify no existing tests break.
- [x] Verify UI visually: Cards should correctly form a grid on wider screens and retain their full-width layout on mobile.
