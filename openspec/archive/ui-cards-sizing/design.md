# Design: UI Cards Sizing & Grid Refinement

## Grid Columns Logic
Update `numColumns` in `src/lib/responsive.ts` to ensure cards have adequate breathing room:
- `< 800px`: 1 column
- `800px - 1299px`: 2 columns (Min width: ~400px)
- `1300px - 1799px`: 3 columns (Min width: ~433px)
- `>= 1800px`: 4 columns (Min width: ~450px)
- Remove 5 columns entirely to avoid over-densification.

## Component Resilience Updates
### `ProjectCard`
- Apply `numberOfLines={1}` to `project.title`.
- Ensure the meta badges (date, BPM, key, genre) can wrap gracefully without breaking the container flex.

### `FeedPostCard`
- Apply `numberOfLines={1}` to `item.title` and `item.authorHandle`.
- Ensure the container properly flexes the title space.

### `SamplePackCard` (Moments)
- Maintain the width percentage logic based on the new, more conservative `numColumns`.
