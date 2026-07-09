# OpenSpec Proposal: UI Cards & Responsivity

## Context
Currently, the UI cards for Feed, Momentos, Sample Packs, and Projects are implemented with inconsistent patterns. Some are inline (Feed, Packs, Projects), while `MomentCard` is isolated. Furthermore, the lists displaying these cards (`FlatList`, `ScrollView`) don't fully leverage responsive design paradigms for wider screens, often resulting in cards stretching too wide on desktop/tablet views.

## Problem Description
1. **Component Duplication & Inconsistency**: The logic and styling for Feed, Sample Packs, and Project cards are embedded directly within their screen files (`app/tabs/index.tsx`, `app/tabs/moments.tsx`, `app/tabs/library.tsx`).
2. **Poor Responsivity**: On tablet and desktop breakpoints, these lists do not efficiently utilize the available screen width. `FlatList` implementations lack `numColumns` adaptation based on breakpoints.
3. **Mismatched UI Language**: Some cards lack consistent padding, shadow structures, or hover/active states that align with the new `card-premium` UI overhaul v2 guidelines.

## High-Level Objectives
- Extract Feed, Sample Pack, and Project cards into reusable components within `src/components/`.
- Standardize all 4 card types (FeedPostCard, MomentCard, SamplePackCard, ProjectCard) to use the `card-premium` UI style.
- Implement responsive grid layouts using the `useResponsive` hook's `numColumns` value (1 for mobile, 2 for tablet, 3 for desktop) where applicable.
- Enhance the visual density on larger screens to avoid stretched, unappealing UI cards.
