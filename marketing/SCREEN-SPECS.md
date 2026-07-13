# OpenBand — Screen Specs & Improvement Roadmap

> **Status:** Audit complete. Implementation in progress (batches 1–5 shipped).
> This document catalogues all issues and required improvements per screen.

## Progress Log

**Shipped (P0 critical):**
- EXT-1 real file upload + client-side stem separation (`src/lib/stemExtractor.ts`)
- EXPL-1 / VS-1 native fallback for all 14 3D screens (`Screen3DFallback`)
- STU-12 MIDI plugin-parameter binding wired
- STU-1 DAW decomposition started (helpers → `app/studio/parts.tsx`)

**Shipped (P1/P2/P3):**
- Login: AUTH-1,2,3,4,5,7,8,9,10,11,12
- Library: LIB-1,2,3,4,6,7
- Settings: SET-1,3,4,6,7,8,9
- Account: ACC-1,2,4,5,6,7,8
- Studio: STU-2,3,4,5,6,8,9,10,11,14,15
- Feed: FEED-1,2,3,4,5,6,7,8,9,10 + CC-8 a11y + CC-5 fixtures
- Moments: MOM-1,2,3,4,5,7 + CC-5 fixtures
- Modes: MOD-1,3
- Mastering: MAS-1,3
- Tab layout: TAB-3,4,5
- 3D screens: 3D-2 (shared loader), 3D-7 (event leaks), 3D-8 (orbit Z bug),
  3D-9 (touch tap)
- Cross-cutting: CC-6 (shared MobileDrawer), CC-8 (a11y), CC-9 (ErrorBoundary),
  CC-10 (router.push tab nav)
- Design system: DS-1 (Toast), DS-2 (brand tokens), DS-5 (removed TrapScene)
- VS-2: verified non-issue (all furniture routes exist)
- Batch 11: FEED-5 (Skeleton), FEED-10 (pinned now-playing), ACC-3 (real session status),
  EXPL-2/3 (iframe loading/error states, shared Screen3DHeader)
- Batch 12: CC-1 partial (Extractor fully localized en/pt/es), LIB-5 (robust UTF-8 import)
- STU-1 (incremental): extracted StudioModals (17-modal cluster), buildProjectData helper
  (dedupe autosave/title-commit), StudioOnboardingCoachmark + StudioDrawer. Main studio
  component 3452 → 3285 lines. EXPL-5 (3D header back fallback).
- STU-1 (hooks): useProjectParams, useStudioPersistence, useMixSnapshots extracted
  to app/studio/hooks.ts. Main studio component 3285 → 3089 lines.
- STU-1 (hooks cont.): useStudioModals (17 modal booleans), useStudioTransport
  (playback engine + transport controls + effects), usePluginChains (plugin/mastering
  edit handlers), useMixerState (9 mixer/mix state atoms). Main studio component
  3089 → 2847 lines. STU-1 hook decomposition complete. Verified against studio
  test suite (39 pass; 2 pre-existing failures unrelated to refactor).

**Remaining (larger/deferred):** STU-1 (full stateful decomposition), STU-13/16/17,
DS-3 (light-theme token refactor), DS-4/6/7, CC-1 (remaining screens i18n audit), CC-2/3/4 remaining,
3D-1 (real audio in 3D shells), 3D-3/12 (shared ThreeDSScreen wrapper),
FEED-11, SET-2/5/10, TAB-1/2/6, EXPL-4/5/6, LIB-8.

---

## STU-1 Hook Decomposition Spec

Goal: shrink `app/studio/[id].tsx` by extracting cohesive state slices into custom
hooks in `app/studio/hooks/` (or `parts.tsx`), without a Context rewrite. Each hook
owns its state + effects + handlers and returns a typed API. Extract one at a time,
`tsc` clean + commit between each. Order chosen low→high coupling:

1. **`useStudioPersistence(id, snapshotInputs)`** — owns autosave debounce effect,
   `lastSavedLabel` + timer, `loadProject` hydrate effect, `commitTitle`, and the
   manual-save handler. Returns `{ lastSavedLabel, commitTitle, handleManualSave,
   hydrated }`. Consumes `buildProjectData`. Lowest coupling — reads state, writes storage.
2. **`useProjectParams()`** — parses `useLocalSearchParams` into typed project config
   (title, bpm, key, mood, numBars, timeSig, scratch, tab, tool, fromOnboarding).
   Pure derivation, zero state. Very safe.
3. **`useStudioModalState()`** — consolidates the ~22 `show*` boolean toggles into a
   single reducer/record + `openModal/closeModal` helpers. Reduces ~22 useState lines.
4. **`useStudioMixerState()`** — groups, buses, sendBuses, trackAmpChains,
   trackAssignments, masterPlugins, masteringChain, mixSnapshots, activeMixId, and
   their mix save/load/delete/compare handlers. Higher coupling (playback reads these).
5. **`useStudioTransport()`** — play/record/seek, engine refs, clock/telemetry effects.
   Highest coupling with audio libs — do LAST, most careful testing.

Risk notes: transport + mixer hooks touch refs shared by many callbacks; verify no
stale-closure regressions. Keep `tracks`/`useHistory` in the main component (undo/redo
is cross-cutting). Behavior must be identical.

Status: (1) useStudioPersistence ✅, (2) useProjectParams ✅, (3) useStudioModals ✅,
(4) useMixSnapshots ✅ + usePluginChains ✅ + useMixerState ✅ (mixer state atoms),
(5) useStudioTransport ✅. STU-1 hook decomposition COMPLETE — all 5 planned slices
extracted. Main studio: 3452 → 2847 lines; tracks/undo-redo state intentionally kept
in the component (cross-cutting).

---

## Table of Contents

- [Cross-Cutting Issues](#cross-cutting-issues)
- [Design System Gaps](#design-system-gaps)
- [Auth Screens](#auth-screens)
- [Tab Screens](#tab-screens)
- [Stack Screens](#stack-screens)
- [Creative Mode Screens (3D)](#creative-mode-screens-3d)

---

## Cross-Cutting Issues

Issues that affect multiple or all screens.

### CC-1 — No i18n on Dozens of Hardcoded Strings
**Affected:** All screens  
**Severity:** High  
**Description:** Many strings bypass `useTranslation()`. Portuguese and English strings are hardcoded directly in component bodies.  
**Examples:** Login validation messages, feed post data, drawer nav labels, studio toolbar labels, all 3D screen titles.  
**Action:** Audit every `t()` usage, extract all remaining hardcoded strings to locale files.

### CC-2 — No Pull-to-Refresh on Any List
**Affected:** Feed, Moments, Library  
**Severity:** Medium  
**Description:** All scrollable lists lack `onRefresh`/`refreshing` props on FlatList/ScrollView. Users expect pull-down to refresh.  
**Action:** Add `refreshing` state and `onRefresh` handler to Feed, Moments, Library.

### CC-3 — No Skeleton Loading States
**Affected:** All list screens  
**Severity:** Medium  
**Description:** Only a spinner `Loading` component is used. No shimmer/skeleton placeholders during data fetches.  
**Action:** Create a `Skeleton` component and use it for Feed, Moments, Library, Settings, Account.

### CC-4 — No Network Error States
**Affected:** Feed, Moments, Library, Account  
**Severity:** Medium  
**Description:** API failures silently fall back to mock data or are swallowed. No user notification.  
**Action:** Add error UI with retry option when API calls fail.

### CC-5 — Mock Data Committed Inline
**Affected:** Feed (178-line MOCK_POSTS), Moments (MOCK_MOMENTS + FREE_SAMPLE_PACKS), Settings (MOCK_PROFILE)  
**Severity:** Low  
**Description:** Large mock datasets are inlined in components instead of fixture files.  
**Action:** Move to `src/fixtures/` directory.

### CC-6 — Duplicate Hand-Rolled Mobile Drawer
**Affected:** Extractor, Studio, Mastering  
**Severity:** High  
**Description:** Three screens implement identical mobile drawer overlays (View with absolute positioning, same nav items) instead of using the `Sidebar` component. Navigation items must be kept in sync in 4+ places.  
**Action:** Create a shared `MobileDrawer` component or make `Sidebar` handle both desktop and mobile overlay.

### CC-7 — `contentContainerStyle={{ paddingBottom: 100 }}` Hardcoded
**Affected:** Account, Settings  
**Severity:** Low  
**Description:** Should use `SCREEN_BOTTOM_PADDING` from constants for consistency.  
**Action:** Replace with imported constant.

### CC-8 — No Accessibility Labels on Interactive Elements
**Affected:** Feed (genre pills, sort buttons), Moments (tab toggles), Settings (theme cards), Library (filter tabs), all 3D screens  
**Severity:** Medium  
**Description:** Many interactive elements lack `accessibilityLabel`, `accessibilityRole`, or `accessibilityHint`.  
**Action:** Add accessibility props to all Pressable elements.

### CC-9 — No Error Boundaries
**Affected:** All screens  
**Severity:** Medium  
**Description:** No screen wraps content in an Error Boundary. A crash in one component takes down the whole tab.  
**Action:** Add ErrorBoundary wrappers at the layout level.

### CC-10 — `router.replace` for Tab Navigation
**Affected:** All tabs (via `_layout.tsx`)  
**Severity:** Medium  
**Description:** Using `router.replace` means users cannot use Android back button to go to previous tab.  
**Action:** Switch to `router.push` for tab navigation.

---

## Design System Gaps

### DS-1 — Missing Components

| Missing Component | Where Used (Inline) | Recommendation |
|---|---|---|
| `IconButton` | All screens (back button pattern: `w-9 h-9 rounded-lg bg-dark-muted/40 items-center justify-center`) | Create `IconButton` component |
| `Tabs` / `FilterChips` | Library filter tabs, Settings language selector, Modes grid | Create `Tabs` component |
| `Modal` | All modal patterns (ad-hoc overlay + content) | Create `Modal` component |
| `Toast` / `Snackbar` | Error feedback via `Alert.alert()` | Create `Toast` component |
| `Tooltip` / `Hint` | All 3D screen control hints | Create `Tooltip` component |
| `Toggle` / `Switch` | Settings theme toggle | Create `Toggle` component |
| `Select` / `Dropdown` | Settings language selector | Create `Select` component |
| `Skeleton` | All loading states | Create `Skeleton` component |
| `SettingsRow` | Settings, Account info rows | Create `SettingsRow` component |

### DS-2 — Missing Brand Tokens in Tailwind Config
**Severity:** High  
CSS vars define `brand-red`, `brand-amber`, `brand-rose`, `brand-blue`, `brand-purple` but they are NOT in `tailwind.config.js`. This prevents `bg-brand-red/50`-style usage.  
**Action:** Add all missing brand tokens to Tailwind config.

### DS-3 — Light Theme Override System is Unsustainable
**Severity:** High  
`global.css` overrides hardcoded utility classes (`.text-white`, `.bg-green-500`) one-by-one in `[data-theme="light"]`. This will break whenever new utilities are added.  
**Action:** Refactor to CSS variable remapping at the token level.

### DS-4 — Parallel Layout Max-Width Systems
**Severity:** Low  
Tailwind config defines `max-w-login`, `max-w-account`, etc. But screens use `LAYOUT_MAX_WIDTHS` from `responsive.ts`. Two sources of truth.  
**Action:** Consolidate to one system.

### DS-5 — `TrapScene` Not Exported
**Severity:** Low  
`src/components/TrapScene.tsx` exists on disk but is not exported from `index.ts`.  
**Action:** Export it or remove the file.

### DS-6 — Duplicate Brand Colors
**Severity:** Low  
`brand-red` equals `brand-primary` in dark mode. `btn-red` exists alongside `brand-primary`. Confusing which to use.  
**Action:** Clarify naming convention or merge.

### DS-7 — `page-container` Has No Max-Width
**Severity:** Low  
`page-container` is `w-full mx-auto` which does nothing useful. Screens use inline max-width instead.  
**Action:** Add `max-w` or remove the class.

---

## Auth Screens

### Login (`app/(auth)/login.tsx`)

| Issue ID | Issue | Severity | Description |
|---|---|---|---|
| AUTH-1 | No password visibility toggle | High | `secureTextEntry` hides input with no eye icon to unmask |
| AUTH-2 | No "forgot password" link | High | No recovery flow for lost passwords |
| AUTH-3 | No email validation before API call | Medium | `abc` without `@` hits Supabase before being caught |
| AUTH-4 | No email verification indicator | Medium | After signup, unclear if verification is needed |
| AUTH-5 | No keyboard dismissal on submit | Low | Keyboard stays open after pressing "Entrar" |
| AUTH-6 | Weak validation UX | Medium | All errors show in single red banner; should be inline per-field |
| AUTH-7 | No tab/focus order management | Low | "Next" on keyboard does not advance to password field |
| AUTH-8 | Fields not cleared on mode switch | Low | Toggling login/signup leaves stale values |
| AUTH-9 | Visitor button has no loading state | Low | No visual feedback during async visitor sign-in |
| AUTH-10 | No success state after signup | Low | Ambiguous result after account creation |
| AUTH-11 | No rate-limit handling | Low | No "too many attempts" handling |
| AUTH-12 | Inaccessible logo emoji | Low | `♫` cannot be parsed by screen readers |

---

## Tab Screens

### Tab Layout (`app/tabs/_layout.tsx`)

| Issue ID | Issue | Severity | Description |
|---|---|---|---|
| TAB-1 | Duplicate route names (`index` + `feed`) | Medium | `feed.tsx` re-exports `index.tsx`; causes confusion on which to edit |
| TAB-2 | No scroll-to-top on tab re-tap | Low | Common mobile UX pattern missing |
| TAB-3 | Drawer close button uses text character | Low | `✕` instead of proper icon; no accessibilityLabel |
| TAB-4 | Drawer has no slide-in animation | Low | Appears instantly, feels jarring |
| TAB-5 | Bottom account row always shows "Premium" | Low | Should reflect actual tier |
| TAB-6 | No skeleton/loading when switching tabs | Low | No visual transition feedback |

### Feed (`app/tabs/index.tsx`)

| Issue ID | Issue | Severity | Description |
|---|---|---|---|
| FEED-1 | No pull-to-refresh | High | FlatList has no `onRefresh`/`refreshing` |
| FEED-2 | No pagination/infinite scroll | High | All posts load at once; no `onEndReached` |
| FEED-3 | Genre pills overflow on small screens | Medium | No fade/gradient on scroll edge to indicate more |
| FEED-4 | Sort buttons lack radio-style affordance | Low | Look like independent toggle chips |
| FEED-5 | No skeleton loading state | Medium | Only spinner, no shimmer placeholders |
| FEED-6 | Like failure silently reverts | Medium | Brief flicker with no toast feedback |
| FEED-7 | Remix promise ignored | Low | `.catch(() => {})` silently swallows errors |
| FEED-8 | Share has no clipboard fallback | Low | `navigator.clipboard` fails on HTTP contexts |
| FEED-9 | Welcome card uses Pressable not Button | Low | Breaks visual consistency |
| FEED-10 | Playing indicator positioned incorrectly | Low | Does not scroll with list |
| FEED-11 | Desktop QuickActions not accessible on mobile | Medium | No way to access quick actions in single-column mobile |
| FEED-12 | MOCK_POSTS inlined (178 lines) | Low | Should be in fixture file |

### Moments (`app/tabs/moments.tsx`)

| Issue ID | Issue | Severity | Description |
|---|---|---|---|
| MOM-1 | No loading state for moments fetch | Medium | Shows mock data instantly, may flicker to real |
| MOM-2 | No empty state for Moments tab | Medium | Blank screen if API returns zero moments |
| MOM-3 | Credits panel grows unbounded | Medium | No scroll container, no clear option |
| MOM-4 | No pull-to-refresh | Medium | ScrollView lacks refresh |
| MOM-5 | NewProject uses key prop to force remount | Low | React anti-pattern; should use controlled reset |
| MOM-6 | MOCK_MOMENTS + FREE_SAMPLE_PACKS inlined | Low | Should be in fixture file |
| MOM-7 | Tab switching stretches on wide desktop | Low | No max-width container |

### Library (`app/tabs/library.tsx`)

| Issue ID | Issue | Severity | Description |
|---|---|---|---|
| LIB-1 | No loading state when fetching cloud projects | Medium | Shows empty list until data arrives |
| LIB-2 | "Trash" filter tab shows all projects | High | filtered useMemo never handles trash; falls through to all |
| LIB-3 | loadProject called in useMemo per render | Medium | Potentially expensive for many projects |
| LIB-4 | isProjectFavorite called in renderItem | Low | Should be pre-computed in memoized list |
| LIB-5 | Import silently fails without TextDecoder | Low | Garbled UTF-8 output |
| LIB-6 | Import expects .json not .openband | Medium | Filter only offers json extensions |
| LIB-7 | No confirmation before deleting | High | No delete action or confirmation dialog |
| LIB-8 | No sync state or last-synced timestamp | Low | No offline indicator |

### Account (`app/tabs/account.tsx`)

| Issue ID | Issue | Severity | Description |
|---|---|---|---|
| ACC-1 | Save button stays disabled after API failure | Medium | Cannot retry without further change |
| ACC-2 | No success feedback after name save | Low | Button just becomes disabled |
| ACC-3 | Session status always shows green | Medium | Shows "Connected" even when Supabase unreachable |
| ACC-4 | No avatar upload/edit capability | Medium | Avatar only shows initials |
| ACC-5 | No delete account option | Medium | Required for app store compliance |
| ACC-6 | Tier badge shows raw string | Low | "free"/"live"/"studio" without formatting |
| ACC-7 | paddingBottom hardcoded | Low | Should use SCREEN_BOTTOM_PADDING |
| ACC-8 | No loading skeleton | Low | No loading state for profile data |

### Settings (`app/tabs/settings.tsx`)

| Issue ID | Issue | Severity | Description |
|---|---|---|---|
| SET-1 | MOCK_PROFILE always displayed | High | Shows "Joao Produtor" regardless of real user |
| SET-2 | Light theme likely incomplete | Medium | All class names use `dark-*` tokens |
| SET-3 | No audio settings | Medium | No sample rate, buffer size, output device |
| SET-4 | No notification settings | Low | Missing notifications section |
| SET-5 | No storage/cache management | Low | App handles large audio files |
| SET-6 | Version hardcoded as "1.0.0" | Low | Should read from package.json |
| SET-7 | Language cards take too much space | Low | Compact dropdown would be better |
| SET-8 | paddingBottom hardcoded | Low | Should use SCREEN_BOTTOM_PADDING |
| SET-9 | No "reset to defaults" option | Low | Missing factory reset |
| SET-10 | No audio settings section | Medium | Critical for a music production app |

### Modes (`app/tabs/modes.tsx`)

| Issue ID | Issue | Severity | Description |
|---|---|---|---|
| MOD-1 | No maxWidth constraint on grid | Low | Stretches edge-to-edge on wide desktop |
| MOD-2 | Grid tile sizing is approximate (23%/31%) | Low | May leave ragged edges depending on gap |
| MOD-3 | No visual feedback on press | Low | Only opacity change; no scale/highlight animation |
| MOD-4 | Gap not responsive | Low | Always 12px regardless of screen size |

### Explorer Tab (`app/tabs/explorer.tsx`) & Virtual Studio Tab (`app/tabs/virtual-studio.tsx`)

| Issue ID | Issue | Severity | Description |
|---|---|---|---|
| EXPL-1 | iframe/srcDoc is web-only, broken on native | Critical | No conditional rendering or native fallback |
| EXPL-2 | No loading state while Three.js initializes | Medium | User sees brown background |
| EXPL-3 | No error state if CDN fails | Medium | Scene fails silently |
| EXPL-4 | No LightControls (inconsistent with other 3D) | Low | Missing from explorer |
| EXPL-5 | Back button from tab has no destination | Medium | `router.back()` may do nothing |
| EXPL-6 | HTML is 288-line inline string | Low | Unmaintainable |
| VS-1 | Uses raw `<div>`, web-only, broken on native | Critical | No native fallback |
| VS-2 | Furniture routes likely 404 | High | 12 items link to routes that may not exist |
| VS-3 | WASD conflicts with browser scroll | Medium | No `e.preventDefault()` |
| VS-4 | No touch controls for mobile | High | Only WASD keyboard |
| VS-5 | No loading/error states | Medium | No WebGL availability check |
| VS-6 | Controls hint meaningless on mobile | Low | "WASD to move" with no keyboard |

---

## Stack Screens

### Stem Extractor (`app/extractor.tsx`)

| Issue ID | Issue | Severity | Description |
|---|---|---|---|
| EXT-1 | No actual file upload logic | Critical | "Escolher arquivo" immediately triggers demo processing |
| EXT-2 | All stems use same demo audio | High | Every stem plays identical 30-second MP3 |
| EXT-3 | Export button is non-functional | High | Shows Alert.alert placeholder |
| EXT-4 | Duplicate hand-rolled mobile drawer | Medium | Duplicates Sidebar component |
| EXT-5 | Stem player audio lifecycle issues | Medium | Multiple stems may play concurrently; no cleanup |
| EXT-6 | Progress animation uses raw setInterval | Low | Not frame-rate aligned, may throttle in background |
| EXT-7 | No error state for audio load failure | Medium | Demo URL may fail silently |
| EXT-8 | timeSignature hardcoded to [4,4] | Medium | Ignores NewProject dialog config |
| EXT-9 | No track renaming on stem add | Low | Defaults to stem label |
| EXT-10 | File picker area looks interactive but isn't | Medium | Dashed border implies drop zone |
| EXT-11 | Processing animation wastes vertical space | Low | py-16 on mobile |

### DAW Studio (`app/studio/[id].tsx`)

| Issue ID | Issue | Severity | Description |
|---|---|---|---|
| STU-1 | 3,284-line God Component | Critical | ~50 useState, 20+ useCallback, deeply nested inline JSX. Unmaintainable. |
| STU-2 | Duplicate useEffect for stop-on-unmount | Low | Copy-paste bug; two identical hooks back-to-back |
| STU-3 | Duplicate time display in toolbar | Low | Two time formats in different places |
| STU-4 | VuMeter uses Math.random() in render | High | Forces constant re-renders; VU meters jitter randomly |
| STU-5 | Volume fader UX confusing | Medium | onPress (−10%) + separate −/+ buttons (−5%); two mechanisms |
| STU-6 | Pan control not interactive | Medium | Read-only bar; no drag-to-adjust |
| STU-7 | Timeline fixed at 1200px, no zoom | High | TIMELINE_WIDTH hardcoded; no pinch-to-zoom |
| STU-8 | No empty state for tracks | Medium | Blank timeline with no guidance |
| STU-9 | Track deletion has no confirmation | High | Delete/Backspace immediately destroys track |
| STU-10 | Recording region uses Date.now() in render | Medium | Stale between renders; should use rAF |
| STU-11 | Toolbar overflow on mobile | Medium | 14+ icon buttons with no overflow menu |
| STU-12 | MIDI pluginParam binding not wired | High | Explicit TODO: "not yet wired" |
| STU-13 | No undo for recording | Medium | Accidental recordings cannot be undone |
| STU-14 | Project title not editable | Low | Comes from URL param, never editable |
| STU-15 | No keyboard shortcut hints visible | Low | Users must guess or open command palette |
| STU-16 | renderTracksToUrl called without caching | Medium | Same offline render repeated in multiple places |
| STU-17 | Mastering tab duplicates MasteringSuite logic | Medium | Inline EQ/comp/limiter instead of using component |

### Mastering Suite (`app/mastering/index.tsx`)

| Issue ID | Issue | Severity | Description |
|---|---|---|---|
| MAS-1 | No empty state if no mastering input | Medium | Direct URL access shows nothing |
| MAS-2 | Duplicate hand-rolled mobile drawer | Medium | Same as Extractor and Studio |
| MAS-3 | Sidebar currentRoute="" incorrect | Low | No nav item highlighted |
| MAS-4 | No loading state while mastering processes | Low | No export progress indicator |
| MAS-5 | No project context passed | Low | No genre/BPM/title metadata |

---

## Creative Mode Screens (3D)

> All 13 screens share these cross-cutting 3D issues.

### Shared 3D Issues

| Issue ID | Issue | Severity | Screens Affected |
|---|---|---|---|
| 3D-1 | All screens are 3D-only shells (no audio) | High | All 13 |
| 3D-2 | Three.js CDN loading duplicated (~360 lines) | Medium | All 12 non-explorer |
| 3D-3 | Orbit controls duplicated across all screens | Medium | All 12 non-explorer |
| 3D-4 | Zero accessibility across all screens | Medium | All 13 |
| 3D-5 | Zero internationalization | Medium | All 13 |
| 3D-6 | Inconsistent emoji in controls hint (🖱 vs 🎮) | Low | 6 use 🖱, 7 use 🎮 |
| 3D-7 | Event listener leaks (mousemove/mouseup from window) | Medium | beatmaker, mixing-console, dj-stage, autotune, live-room, stem-collider, lofi-tape, cover-jam |
| 3D-8 | Camera orbit Z calculation bug | Medium | dj-stage, live-room, lofi-tape (`Math.cos(sphericalPhi)` should be `Math.cos(sphericalTheta)`) |
| 3D-9 | No touch support for interactive elements | Medium | beatmaker, synth-lab, mixing-console |
| 3D-10 | No Suspense or Error Boundaries | Medium | All 13 |
| 3D-11 | No back navigation safety | Medium | All 13 (`router.back()` may fail on deep links) |
| 3D-12 | No performance optimization (no useMemo, no LOD) | Low | All 13 |

### Per-Screen Summary

| Screen | Interactive Elements | Touch Support | Event Cleanup | Notes |
|---|---|---|---|---|
| **Beatmaker** | None | No | Leaks | 3D-only shell |
| **Synth Lab** | None | No | Clean | 3D-only shell |
| **Mixing Console** | None | No | Leaks | VU meters static |
| **DJ Stage** | None | Yes (orbit) | Leaks | Orbit Z bug |
| **AutoTune** | Dial, scale pads (click only) | No | Leaks | No touch-to-click |
| **Live Room** | None | Yes (orbit) | Leaks | Orbit Z bug |
| **Spatial Audio** | None | Yes (orbit) | Clean | Best cleanup impl |
| **Stem Collider** | Orbs (click to mute, visual only) | No | Leaks | Click-drag conflict |
| **Lofi Tape** | Tubes (click to cycle drive, visual only) | No | Leaks | Orbit Z bug; all tubes affected at once |
| **Acoustics** | Panels (toggle visibility), TREATED/BARE toggle | No | Clean | Best interactive impl |
| **Cover Jam** | Pedals (click to cut stems, visual), speed dial | No | Leaks | Metronome hardcoded 120 BPM |
| **Vocal Booth** | None | Yes (orbit) | Clean | Cleanest cleanup; passive touchmove issue |
| **Explorer** | OrbitControls via iframe | Yes | N/A (iframe) | Completely different architecture |

### Recommended Shared Extraction

Create `src/components/ThreeDSScreen.tsx` — a wrapper component handling:
- Three.js CDN loading with cascade fallback
- Orbit controls (mouse + touch)
- Header with back button
- Loading/Error overlays
- Controls hint
- LightControls
- Proper event listener cleanup
- Error boundary wrapping

This eliminates ~360 lines of duplicated code across 12 screens.

---

## Priority Matrix

### P0 — Critical (Blocks core functionality)
1. **STU-1** — Decompose 3,284-line DAW God Component
2. **EXT-1** — Implement real file upload in Extractor
3. **EXPL-1 / VS-1** — Native fallback for iframe/web-only screens
4. **STU-12** — Wire MIDI plugin parameter binding

### P1 — High (Significant UX impact)
1. **CC-6** — Eliminate duplicate hand-rolled drawers
2. **AUTH-1/2** — Password toggle + forgot password
3. **FEED-1/2** — Pull-to-refresh + pagination
4. **LIB-2/7** — Fix Trash filter + add delete confirmation
5. **STU-4** — Fix VuMeter Math.random() in render
6. **STU-7** — Timeline zoom
7. **STU-9** — Track deletion confirmation
8. **SET-1** — Remove mock profile from Settings
9. **VS-2/4** — Fix virtual studio routes + add touch controls
10. **DS-2** — Add missing brand tokens to Tailwind config

### P2 — Medium (Quality of life)
1. **CC-2/3/4** — Pull-to-refresh, skeletons, error states
2. **CC-8** — Accessibility labels
3. **CC-9** — Error boundaries
4. **CC-10** — Fix tab navigation (router.push)
5. **DS-3** — Refactor light theme system
6. **3D-7/8** — Fix event leaks + orbit Z bug
7. **3D-9** — Touch support for interactive 3D elements
8. **STU-5/6** — Improve volume/pan UX
9. **STU-10** — Fix recording region render timing
10. **3D-12** — Extract shared ThreeDSScreen component

### P3 — Low (Polish)
1. **CC-1** — Full i18n audit
2. **CC-5** — Move mock data to fixtures
3. **CC-7** — Fix hardcoded padding
4. All "Low" items per screen
