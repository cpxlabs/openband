# Proposal: UI Cards Sizing & Grid Refinement

## Context
Following the recent responsivity update, the `FeedPostCard` and `ProjectCard` components are displaying layout breaking ("squished" text, aggressive wrapping) on desktop screens. This happens because the grid column logic (`numColumns`) was scaling too aggressively (up to 4 or 5 columns) relative to the available container widths.

## Problem Description
- **Aggressive Column Count**: On 1200px-1500px screens, placing 4 columns inside a constrained container (like `maxWidth: 1200` or `1440`) leaves less than ~300px per card.
- **Horizontal Flex Overflow**: `ProjectCard` and `FeedPostCard` have many horizontal fixed-width elements (avatars, buttons, icons). When constrained to <300px, the remaining space for the title text is minimal, causing words to break awkwardly (e.g., "Pro ject").
- **Missing Truncation**: Text elements do not have `numberOfLines={1}` or `ellipsizeMode="tail"`, meaning they push layout boundaries instead of gracefully truncating.

## High-Level Objectives
1. **Conservative Grid Scaling**: Adjust the `numColumns` logic in `src/lib/responsive.ts` to aim for a comfortable minimum width of ~400px per card.
2. **Resilient Card Layouts**: Add proper text truncation (`numberOfLines={1}`) to titles and subtitles in `FeedPostCard` and `ProjectCard` to prevent layout breakage under constraint.
