# Design — Resolve Orphaned Screens (Creative Modes Hub)

This change implements **Option A** from `proposal.md`: a "Creative Modes" hub
that surfaces all 13 modes and wires them into primary navigation and the
Command Palette.

## Orphan Trace (verified)
| Mode (screen) | File | Current inbound path |
|---|---|---|
| acoustics | `app/acoustics.tsx` | only `virtual-studio` dynamic push → `/acoustics` |
| autotune | `app/autotune.tsx` | only `virtual-studio` → `/autotune` |
| beatmaker | `app/beatmaker.tsx` | only `virtual-studio` → `/beatmaker` |
| cover-jam | `app/cover-jam.tsx` | only `virtual-studio` → `/cover-jam` |
| dj-stage | `app/dj-stage.tsx` | only `virtual-studio` → `/dj-stage` |
| live-room | `app/live-room.tsx` | only `virtual-studio` → `/live-room` |
| lofi-tape | `app/lofi-tape.tsx` | only `virtual-studio` → `/lofi-tape` |
| mixing-console | `app/mixing-console.tsx` | only `virtual-studio` → `/mixing-console` |
| spatial-audio | `app/spatial-audio.tsx` | only `virtual-studio` → `/spatial-audio` |
| stem-collider | `app/stem-collider.tsx` | only `virtual-studio` → `/stem-collider` |
| synth-lab | `app/synth-lab.tsx` | only `virtual-studio` → `/synth-lab` |
| vocal-booth | `app/vocal-booth.tsx` | only `virtual-studio` → `/vocal-booth` |
| explorer | `app/explorer.tsx` (via `app/tabs/explorer.tsx`) | **live tab** `/tabs/explorer` |

## File / Change Mapping

| Purpose | File | Change |
|---|---|---|
| Hub screen (NEW) | `app/tabs/modes.tsx` | New screen: responsive grid of 13 mode tiles; each tile `router.push`-es the mode route. Reuses `PageHeader`, `Card`, `CardIcon`, `Divider` from `src/components`. |
| Tab registration | `app/tabs/_layout.tsx` | Add `modes` entry to `NAV_ITEMS` (key `"modes"`, label `"Modos"`, icon), add `"modes"` to `routeNameMap`, and add `<Tabs.Screen name="modes" />` to the `Tabs` group. |
| Sidebar registration | `src/components/Sidebar.tsx` | Add `modes` item to `NAV_ITEMS` (route `/tabs/modes`). Keep it flat (not a submenu) to mirror the tab. |
| Mode registry (NEW, shared) | `src/lib/creativeModes.ts` | Export `CREATIVE_MODES`: array of `{ id, label, icon, route, description, category }` for all 13 modes, plus a `registerCreativeModeCommands(router)` helper that calls `registerCommand` for each mode under category `"Modes"` with action `() => router.push(route)`. |
| Command Palette wiring | `app/tabs/modes.tsx` (or an app init effect) | Call `registerCreativeModeCommands(router)` in a `useEffect` (empty deps) so all 13 modes appear in Cmd/Ctrl+K search. Mirror the teardown with `unregisterCommand` on unmount. |
| Routing spec sync | `openspec/specs/routing-navigation.md` | Add a new section listing `/tabs/modes` and the 13 mode routes (`/acoustics`, `/autotune`, `/beatmaker`, `/cover-jam`, `/dj-stage`, `/live-room`, `/lofi-tape`, `/mixing-console`, `/spatial-audio`, `/stem-collider`, `/synth-lab`, `/vocal-booth`, `/tabs/explorer`) so the spec matches the route graph. |

## Behavior Details

### Hub screen (`app/tabs/modes.tsx`)
- Uses `useRouter` from `expo-router` and `useResponsive` for grid columns.
- Renders `PageHeader` title "Modos Criativos" and a `Divider`.
- Iterates `CREATIVE_MODES` and renders a `Card`/`CardIcon` tile per mode;
  `onPress` calls `router.push(mode.route)`.
- `explorer` tile routes to `/tabs/explorer`; the other 12 route to
  `/<name>` (their existing root screen).
- Must render on web and native; no new dependencies.

### `CREATIVE_MODES` registry (`src/lib/creativeModes.ts`)
- Single source of truth used by both the hub UI and command registration.
- Each entry: stable `id` (e.g. `mode.acoustics`), `label` (PT), `icon`
  (emoji), `route` (absolute path string), `description`, `category: "Modes"`.
- `registerCreativeModeCommands(router)` loops the array and registers one
  command per mode; its `action` performs `router.push(route)`.

### Command Palette
- After registration, typing "beat", "synth", "spatial", etc. in Cmd/Ctrl+K
  surfaces the corresponding mode and navigates on select (existing
  `CommandPalette` already calls `executeCommand` → `action`).
- No change to `CommandPalette.tsx` or `commandRegistry.ts` internals is
  required — only new `registerCommand` calls.

### Spec mapping (for traceability)
- `spatial-audio`, `acoustics` → `openspec/specs/immersive-studio/` (spatial
  audio, acoustics, scene lighting).
- `synth-lab` → `openspec/specs/instruments/` (synth presets).
- `stem-collider` → `openspec/specs/backend-api/` (stem separation).
- `autotune` → `openspec/specs/audio-plugins/` (auto-pitch plugin).
- `vocal-booth`, `beatmaker`, `dj-stage`, `lofi-tape`, `live-room`,
  `cover-jam`, `mixing-console` → creative-mode screens without a dedicated
  spec yet (tracked as TODO in `polish-core-specs` tasks.md); the hub does not
  require new specs for these.

## Why not Option B (prune)
Option B was rejected as the primary path because every screen is a real,
hundreds-of-lines implementation. Only adopt pruning if, during implementation,
a specific mode is found to be a non-functional stub — in which case remove
that one screen plus its entry in `CREATIVE_MODES` and its test, rather than
pruning the whole set.
