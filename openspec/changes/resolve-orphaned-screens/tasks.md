# Tasks — Resolve Orphaned Screens (Creative Modes Hub)

## 1. Spec scaffolding (docs)
- [x] Create `openspec/changes/resolve-orphaned-screens/proposal.md`
- [x] Create `openspec/changes/resolve-orphaned-screens/design.md`
- [x] Create `openspec/changes/resolve-orphaned-screens/tasks.md`

## 2. Shared mode registry (new)
- [ ] Create `src/lib/creativeModes.ts` exporting `CREATIVE_MODES` array of all
      13 modes (`id`, `label`, `icon`, `route`, `description`, `category`)
      with routes: `/acoustics`, `/autotune`, `/beatmaker`, `/cover-jam`,
      `/dj-stage`, `/live-room`, `/lofi-tape`, `/mixing-console`,
      `/spatial-audio`, `/stem-collider`, `/synth-lab`, `/vocal-booth`,
      `/tabs/explorer`.
- [ ] Add `registerCreativeModeCommands(router)` to `src/lib/creativeModes.ts`
      that calls `registerCommand` for each mode (category `"Modes"`,
      `action` = `router.push(route)`).

## 3. Hub screen (new)
- [ ] Create `app/tabs/modes.tsx` rendering a responsive grid of 13 mode tiles
      using `PageHeader`, `Card`, `CardIcon`, `Divider` from `src/components`.
- [ ] Each tile `onPress` calls `router.push(mode.route)` via `useRouter`.
- [ ] In a `useEffect`, call `registerCreativeModeCommands(router)` and
      `unregisterCommand` for each mode on unmount.

## 4. Tab + Sidebar registration
- [ ] In `app/tabs/_layout.tsx`: add `modes` to `NAV_ITEMS` (label "Modos"),
      add `"modes"` to `routeNameMap`, and add `<Tabs.Screen name="modes" />`.
- [ ] In `src/components/Sidebar.tsx`: add a flat `modes` item to `NAV_ITEMS`
      with route `/tabs/modes`.

## 5. Routing spec sync
- [ ] Update `openspec/specs/routing-navigation.md` with a section listing
      `/tabs/modes` and the 13 mode routes so the spec matches the route graph.

## 6. Tests (new)
- [ ] Create `tests/modes.test.tsx` (Vitest + React Testing Library):
      - renders `app/tabs/modes.tsx`;
      - asserts all 13 mode labels appear (hub lists every mode);
      - fires a tile press and asserts `router.push` was called with the
        correct route (navigation reaches a screen).
- [ ] Add a `commandRegistry` test asserting `registerCreativeModeCommands`
      registers 13 visible `"Modes"` category commands and that
      `executeCommand("mode.synth-lab")` triggers the `router.push` action.

## 7. Verification
- [ ] `npx tsc --noEmit` clean (root)
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `npx vitest run` passes (incl. new `tests/modes.test.tsx`)
- [ ] `npm run test:legacy` passes
- [ ] `npm run build` succeeds
- [ ] Manual: open app → "Modos" tab lists all 13 → tapping a tile navigates;
      Cmd/Ctrl+K finds each mode and navigates on select.
