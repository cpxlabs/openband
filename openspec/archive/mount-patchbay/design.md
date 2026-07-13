# Design — Mount Patchbay in Studio Routing Panel

## File / Requirement Mapping

| Change | File | Symbols |
|---|---|---|
| Toolbar toggle state | `app/studio/[id].tsx` | add `const [showPatchbay, setShowPatchbay] = useState(false)` (mirror `showOutputSelector` at `:252`) |
| Toolbar button | `app/studio/[id].tsx` | add a toolbar `Pressable` near the `OutputSelector` button (~`:1573`) calling `setShowPatchbay(true)` |
| Mount component | `app/studio/[id].tsx` | render `<Patchbay visible={showPatchbay} onClose={() => setShowPatchbay(false)} trackIds={trackIds} onRouteCreated={...} onRouteRemoved={...} />` near the `OutputSelector` mount (~`:2892`) |
| Track ids source | `app/studio/[id].tsx` | derive `trackIds` from the studio's `tracks` state (the existing `TrackDef[]` list) — `tracks.map((t) => t.id)` |
| Test | `tests/components*.test.tsx` | assert `Patchbay` renders and a created route appears |
| Spec update | `openspec/specs/hardware-io/spec.md` | add "Patchbay Mounted in Studio" requirement |

## Patchbay Props Contract
`src/components/Patchbay.tsx` (`:12-18`) expects:
```
interface PatchbayProps {
  visible: boolean;
  onClose: () => void;
  trackIds: string[];
  onRouteCreated?: (route: PatchRoute) => void;
  onRouteRemoved?: (routeId: string) => void;
}
```
Internally it calls `enumerateAudioDevices()`, `getPatchbayState()`, `getHardwareChannels(deviceId, 16)`, `createPatchRoute(...)`, `removePatchRoute(...)` directly from `src/lib/hardwareIO.ts` — so the studio only needs to supply `trackIds` and visibility.

## Studio Wiring
1. Add state near `showOutputSelector`:
   ```
   const [showPatchbay, setShowPatchbay] = useState(false);
   ```
2. In the toolbar `ScrollView` (around `:1572`), add a button (e.g. `🔌` / "Patch") that does `setShowPatchbay(true)`. Keep it visually consistent with the `OutputSelector` toggle.
3. Compute track ids once from studio state:
   ```
   const trackIds = useMemo(() => tracks.map((t) => t.id), [tracks]);
   ```
   (`tracks` already exists in the studio as the `TrackDef[]` array.)
4. Mount after `OutputSelector` (`:2892`):
   ```
   <Patchbay
     visible={showPatchbay}
     onClose={() => setShowPatchbay(false)}
     trackIds={trackIds}
     onRouteCreated={(r) => {/* studio-side bookkeeping / telemetry */}}
     onRouteRemoved={(id) => {/* studio-side bookkeeping */}}
   />
   ```
   The component returns `null` when `visible` is false, so it is inert until toggled.

## Test
Add to an existing component test file (`tests/components.test.tsx` or a new `tests/patchbay.test.tsx`):
- Render `<Patchbay visible trackIds={["t1","t2"]} onClose={()=>{}} />`; assert the "Hardware Patchbay" title appears.
- Simulate `enumerateAudioDevices` returning a mock device + channels; simulate a drop; assert `onRouteCreated` fired and the route chip renders.

## Spec Update
Add to `openspec/specs/hardware-io/spec.md` a requirement "Patchbay Mounted in Studio":

> The studio MUST mount the `Patchbay` component (toggled from the transport toolbar) feeding it the project's track ids, so hardware input channels can be routed to tracks via the existing `hardwareIO` CRUD.

And a test requirement: mounting `Patchbay` with `visible` renders the matrix and a created route is reflected.
