# Tasks — Resolve Orphaned Screens (Creative Modes Hub)

## 1. Spec scaffolding (docs)
- [x] Create `openspec/changes/resolve-orphaned-screens/proposal.md`
- [x] Create `openspec/changes/resolve-orphaned-screens/design.md`
- [x] Create `openspec/changes/resolve-orphaned-screens/tasks.md`

## 2. Shared mode registry (new)
- [x] Create `src/lib/creativeModes.ts` exporting `CREATIVE_MODES` array of all
       13 modes (`id`, `label`, `icon`, `route`, `description`, `category`)
       with routes: `/acoustics`, `/autotune`, `/beatmaker`, `/cover-jam`,
       `/dj-stage`, `/live-room`, `/lofi-tape`, `/mixing-console`,
       `/spatial-audio`, `/stem-collider`, `/synth-lab`, `/vocal-booth`,
       `/tabs/explorer`.
- [x] Add `registerCreativeModeCommands(router)` to `src/lib/creativeModes.ts`
       that calls `registerCommand` for each mode (category `"Modes"`,
       `action` = `router.push(route)`).

## 3. Hub screen (new)
- [x] Create `app/tabs/modes.tsx` rendering a responsive grid of 13 mode tiles
       using `PageHeader`, `Card`, `CardIcon`, `Divider` from `src/components`.
- [x] Each tile `onPress` calls `router.push(mode.route)` via `useRouter`.
- [x] In a `useEffect`, call `registerCreativeModeCommands(router)` and
       `unregisterCreativeModeCommands` on unmount.

## 4. Tab + Sidebar registration
- [x] In `app/tabs/_layout.tsx`: add `modes` to `NAV_ITEMS` (label "Modos"),
       add `"modes"` to `routeNameMap`, and add `<Tabs.Screen name="modes" />`.
- [x] In `src/components/Sidebar.tsx`: add a flat `modes` item to `NAV_ITEMS`
       with route `/tabs/modes`.

## 5. Routing spec sync
- [x] Update `openspec/specs/routing-navigation.md` with a section listing
       `/tabs/modes` and the 13 mode routes so the spec matches the route graph.

## 6. Tests (new)
- [x] Create `tests/modes.test.tsx` (Vitest + React Testing Library):
       - renders `app/tabs/modes.tsx`;
       - asserts all 13 mode labels appear (hub lists every mode);
       - fires a tile press and asserts `router.push` was called with the
         correct route (navigation reaches a screen).
- [x] Add a `commandRegistry` test asserting `registerCreativeModeCommands`
       registers 13 visible `"Modes"` category commands and that
       `executeCommand("mode.synth-lab")` triggers the `router.push` action.

## 7. Verification
- [x] `npx tsc --noEmit` — no errors in changed files (pre-existing unrelated
       errors remain in `src/lib/hardwareIO.ts` / `src/lib/supabaseRemote.ts`
       from prior uncommitted work, not introduced by this change).
- [x] `npx vitest run` passes — 963/963 (incl. new `tests/modes.test.tsx`).
       Added `@bridge` alias to `vitest.config.ts` so the test runner resolves
       the tsconfig path alias (required for suites importing the components
       barrel / `hardwareIO`).
  - [x] `cd backend && npx tsc --noEmit` clean
  - [x] `npm run test:legacy` passes
  - [x] `npm run build` succeeds
  - [x] Manual: open app → "Modos" tab lists all 13 → tapping a tile navigates;
       Cmd/Ctrl+K finds each mode and navigates on select.
