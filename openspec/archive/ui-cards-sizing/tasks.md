# Tasks: UI Cards Sizing & Grid Refinement

## Checklist

### Phase 1: Grid Adjustments
- [x] **`src/lib/responsive.ts`**:
  - [x] Modify `numColumns` logic to use `800`, `1300`, and `1800` thresholds.
  - [x] Cap max columns at 4.

### Phase 2: Component Hardening
- [x] **`src/components/ProjectCard.tsx`**:
  - [x] Add `numberOfLines={1}` to the title `<Text>`.
- [x] **`src/components/FeedPostCard.tsx`**:
  - [x] Add `numberOfLines={1}` to the title `<Text>`.
  - [x] Add `numberOfLines={1}` to the author handle `<Text>`.

### Phase 3: Verification
- [x] Verify `npx tsc --noEmit` and `npx vitest run`.
- [x] Review UI cards to ensure text now truncates instead of wrapping awkwardly into vertical columns.
