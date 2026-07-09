# UI Overhaul v2 Branch Changes Document

This document summarizes the changes introduced in the `feat/ui-overhaul-v2` branch relative to `master`. These changes aim to implement a premium dark theme, improve visual layouts, and refine the studio workspace.

---

## 1. Global Styling & CSS Classes
### [global.css](file:///c:/Users/alans/Desktop/ag/global.css)
- **Ultra-Dark Aesthetic**: Adjusted HSL root variables in the dark theme block to use deeper colors (e.g., background `--color-dark-bg` shifted from `#0f0f11` to `#0a0a0d`, surface `--color-dark-surface` shifted to `#141418`).
- **New Layout and Utility Classes**:
  - `.card-premium`: Container styling with a subtle border and drop shadow.
  - `.btn-red`: Standard button styled with the brand primary color and custom shadow.
  - `.btn-mute` / `.btn-mute-active` and `.btn-solo` / `.btn-solo-active`: Mute and solo button styling for the DAW mixer channels.
  - `.mixer-channel`: Background and border styling for mixer channel strips.
  - `.pill-active` / `.pill-inactive`: Active/inactive filter tab styles.

---

## 2. Navigation & Shell Layout
### [app/tabs/_layout.tsx](file:///c:/Users/alans/Desktop/ag/app/tabs/_layout.tsx)
- **Responsive Custom Shell**: Replaced the default Expo Router `<Tabs>` bottom bar with a custom routing shell.
  - **Desktop**: A persistent side navigation utilizing the `Sidebar` component.
  - **Mobile**: A sliding hamburger drawer navigation menu toggled via a header button.
- **Tabs Routing Fix**: Restored `<Tabs>` navigation container (with `tabBarStyle: { display: "none" }` to hide the tab bar itself) to prevent client-side "No route found" (404) errors on Vercel.

### [src/components/Sidebar.tsx](file:///c:/Users/alans/Desktop/ag/src/components/Sidebar.tsx)
- **Refined Dimensions & Header**: Increased persistent sidebar width to `56` (from `52`). Reduced logo sizing and added a clean, tag-styled version badge in the header.
- **Account Footer**: Added a "Premium" status tag to the user profile area at the bottom.

### [src/components/RightSidebar.tsx](file:///c:/Users/alans/Desktop/ag/src/components/RightSidebar.tsx) [NEW]
- **Quick Action Sidebar**: Added a right sidebar on desktop that hosts screen-specific quick tools such as "Novo Projeto Rápido", "Masterização", and "Extrator de Stems".

### [src/components/index.ts](file:///c:/Users/alans/Desktop/ag/src/components/index.ts)
- Exported the newly created `RightSidebar` component.

---

## 3. Feed & Library Overhaul
### [app/tabs/index.tsx](file:///c:/Users/alans/Desktop/ag/app/tabs/index.tsx) (Feed)
- **Premium Cards**: Restructured `FeedPostCard` to use the `.card-premium` class.
- **Listen Button UI**: Added a prominent, styled "Ouvir" / "Pausar" button inside the main card container body.
- **Actions Bar**: Moved the Like, Remix, and Share buttons to a bottom horizontal action bar with clean, rounded pill borders.

### [src/components/MomentCard.tsx](file:///c:/Users/alans/Desktop/ag/src/components/MomentCard.tsx)
- **Full-Bleed Media Display**: Overhauled the card structure so that artist moment images display full-bleed at the top of the card rather than inside padded containers.
- **Gradients**: Added a dark gradient overlay at the bottom of the image for text legibility.

### [app/tabs/library.tsx](file:///c:/Users/alans/Desktop/ag/app/tabs/library.tsx)
- **Premium Cards**: Updated library project items to render with the new `.card-premium` layout.

### [app/tabs/moments.tsx](file:///c:/Users/alans/Desktop/ag/app/tabs/moments.tsx)
- **Refined Styling**: Updated Moment card layouts, tag badges, and tabs using the new styling variables.

---

## 4. DAW Studio & Mixer Workspace
### [app/studio/\[id\].tsx](file:///c:/Users/alans/Desktop/ag/app/studio/[id].tsx)
- **Code Cleanups**: Deleted unused functions `setTrackSend`, `setTrackSidechain`, and `setTrackOutput` to streamline the codebase.
- **Design System Integration**: Replaced inline styling on mixer track channels with the new `.mixer-channel` class, and updated mute/solo button elements to use the `.btn-mute` and `.btn-solo` classes.
- **Track Selection Accent**: Updated active track borders with a distinct `border-l-[3px] border-brand-primary` indicator.

---

## 5. Build Configuration
### [package.json](file:///c:/Users/alans/Desktop/ag/package.json)
- **Cache-Buster**: Added the `--clear` flag to `expo export --platform web` in the `build` script to clear Metro's cache on Vercel deployments.

---

## 6. UI Cards Component Extraction & Responsivity
> **OpenSpec Reference**: This refactoring was driven by the Specification-Driven Development loop. You can find the original specifications in the archive: 
> - [proposal.md](file:///c:/Users/alans/Desktop/ag/openspec/archive/ui-cards-responsivity/proposal.md)
> - [design.md](file:///c:/Users/alans/Desktop/ag/openspec/archive/ui-cards-responsivity/design.md)
> - [tasks.md](file:///c:/Users/alans/Desktop/ag/openspec/archive/ui-cards-responsivity/tasks.md)

### [src/components/FeedPostCard.tsx](file:///c:/Users/alans/Desktop/ag/src/components/FeedPostCard.tsx) [NEW]
- **Component Extraction**: Moved the inline `FeedPostCard` component logic out of `app/tabs/index.tsx` into its own dedicated file.

### [src/components/ProjectCard.tsx](file:///c:/Users/alans/Desktop/ag/src/components/ProjectCard.tsx) [NEW]
- **Component Extraction**: Moved the inline project card rendering logic out of `app/tabs/library.tsx` into a reusable component.

### [src/components/SamplePackCard.tsx](file:///c:/Users/alans/Desktop/ag/src/components/SamplePackCard.tsx) [NEW]
- **Component Extraction**: Moved the pack card rendering logic out of `app/tabs/moments.tsx` into a reusable component.

### [app/tabs/index.tsx](file:///c:/Users/alans/Desktop/ag/app/tabs/index.tsx) (Feed) & [app/tabs/library.tsx](file:///c:/Users/alans/Desktop/ag/app/tabs/library.tsx) (Library)
- **Responsive Grid**: Updated `FlatList` components to use `numColumns={resp.numColumns}` and `key={resp.numColumns}` from the `useResponsive` hook to automatically adapt from a single column on mobile to a multi-column grid on wider screens.
- **Column Spacing**: Applied `columnWrapperStyle={{ gap: 12 }}` for consistent spacing in multi-column layouts.

### [app/tabs/moments.tsx](file:///c:/Users/alans/Desktop/ag/app/tabs/moments.tsx) (Moments)
- **Dynamic Widths**: Refactored the sample pack flex container to apply width percentages dynamically based on breakpoints (e.g., full width on mobile, 31% on desktop).

