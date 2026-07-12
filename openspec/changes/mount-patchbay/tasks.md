# Tasks — Mount Patchbay in Studio Routing Panel

## 1. Studio mount
- [ ] In `app/studio/[id].tsx`, add `const [showPatchbay, setShowPatchbay] = useState(false)`.
- [ ] Add a toolbar `Pressable` (near the `OutputSelector` toggle ~`:1573`) that calls `setShowPatchbay(true)`.
- [ ] Derive `const trackIds = useMemo(() => tracks.map((t) => t.id), [tracks])`.
- [ ] Import `Patchbay` from `../../src/components` (it is already exported via `src/components/index.ts`).
- [ ] Render `<Patchbay visible={showPatchbay} onClose={...} trackIds={trackIds} onRouteCreated={...} onRouteRemoved={...} />` adjacent to `OutputSelector` (~`:2892`).

## 2. Tests
- [ ] Add `tests/patchbay.test.tsx` (or extend `tests/components.test.tsx`): render `Patchbay` visible with mock `trackIds`; assert title + route chip after a simulated drop; assert `onRouteCreated` fired.

## 3. Spec update
- [ ] Add "Patchbay Mounted in Studio" requirement + test requirement to `openspec/specs/hardware-io/spec.md`.

## Verification
- [ ] `npx tsc --noEmit` clean
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `npx vitest run` passes
