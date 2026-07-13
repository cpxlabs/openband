# Tasks — Mount Patchbay in Studio Routing Panel

## 1. Studio mount
  - [x] In `app/studio/[id].tsx`, add `const [showPatchbay, setShowPatchbay] = useState(false)`.
  - [x] Add a toolbar `Pressable` (near the `OutputSelector` toggle ~`:1573`) that calls `setShowPatchbay(true)`.
  - [x] Derive `const trackIds = useMemo(() => tracks.map((t) => t.id), [tracks])`.
  - [x] Import `Patchbay` from `../../src/components` (it is already exported via `src/components/index.ts`).
  - [x] Render `<Patchbay visible={showPatchbay} onClose={...} trackIds={trackIds} onRouteCreated={...} onRouteRemoved={...} />` adjacent to `OutputSelector` (~`:2892`).

## 2. Tests
  - [x] Add `tests/patchbay.test.tsx` (or extend `tests/components.test.tsx`): render `Patchbay` visible with mock `trackIds`; assert title + route chip after a simulated drop; assert `onRouteCreated` fired.

## 3. Spec update
  - [x] Add "Patchbay Mounted in Studio" requirement + test requirement to `openspec/specs/hardware-io/spec.md`.

## Verification
  - [x] `npx tsc --noEmit` clean
  - [x] `cd backend && npx tsc --noEmit` clean
  - [x] `npx vitest run` passes
