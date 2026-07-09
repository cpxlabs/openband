# Proposal: App, Desktop, and Tablet Responsivity

## Context
Our current responsive setup successfully transitions between mobile and desktop via a basic breakpoint system. However, the `LAYOUT_MAX_WIDTHS` dictionary is completely undefined, meaning layouts stretch infinitely on large desktop screens. Furthermore, the column counts are hardcapped at 3, and tablet devices currently fallback to the mobile drawer experience without taking advantage of their larger screen real estate. Native app platforms (iOS/Android) also need safe area handling for notches and gesture bars.

## Problem Description
- **Unbounded Scaling**: Ultra-wide desktop screens stretch the grid and content too far, ruining the visual aesthetic and readability.
- **Limited Columns**: The `numColumns` value in `useResponsive` stops at 3, leaving empty space or massive cards on large monitors.
- **Tablet Experience**: Tablets (< 1280px) hide the sidebar and use the mobile hamburger menu, ignoring potential landscape real estate.
- **Native Safe Areas**: The app lacks dynamic top/bottom padding to account for mobile status bars and notches.

## High-Level Objectives
1. **Define Strict Max Widths**: Populate `LAYOUT_MAX_WIDTHS` with sensible pixel constraints to keep layouts centered and legible on large monitors.
2. **Dynamic Column Scaling**: Scale `numColumns` gracefully to 4 or 5 columns on ultra-wide screens.
3. **Refine Breakpoints**: Adjust breakpoint thresholds so standard tablets (e.g., 1024px landscape) can utilize the persistent Sidebar.
4. **App Safe Area**: Integrate Safe Area Context into the `useResponsive` hook to provide automatic layout padding on native devices.
