# Tasks — Accessibility Pass

## 1. Spec scaffolding (docs)
- [ ] Create `openspec/specs/accessibility/spec.md` capturing the a11y contract (roles/labels/values, keyboard operability, focus-visible, test requirement)
- [ ] Note in `openspec/specs/accessibility/spec.md` the `react-native-web` attribute mapping used by this project

## 2. Design-system component a11y props (no code here — tasks for implementation)
- [ ] `OneKnob.tsx` — add `accessibilityRole="adjustable"`, `accessibilityLabel={label}`, `accessibilityValue`, `accessibilityHint`; add `tabIndex` focusability + `onKeyDown` arrow/Home/End handlers; add `.focus-ring`
- [ ] `Button.tsx` — add optional `accessibilityHint` prop; ensure focus ring class on `Pressable`
- [ ] `Sidebar.tsx` / `RightSidebar.tsx` — add focus ring to nav `Pressable`s (role/label already present); verify `aria-current` retained
- [ ] `Card.tsx` — ensure interactive `Card`/`CardRow` get focus ring (label already supported)
- [ ] `ProgressBar.tsx` — add `accessibilityLabel`
- [ ] `Metronome.tsx` — add `accessibilityRole`/`accessibilityLabel` to play/stop toggle; `accessibilityLabel="BPM"` on BPM input
- [ ] `MiniPlayer.tsx`, `FeedPostCard.tsx`, `SamplePackCard.tsx`, `ProjectCard.tsx`, `MomentCard.tsx` — audit + add `accessibilityRole="button"` + `accessibilityLabel` to play/pause affordances; add focus ring
- [ ] `PluginRack.tsx` / `MasterRack.tsx` / `PluginEditor.tsx` — add role/label + focus ring to enable/disable and param `Pressable`s

## 3. Studio transport a11y (`app/studio/[id].tsx`)
- [ ] Add `accessibilityRole="button"` + `accessibilityLabel` (pt-BR) to: seek -5, play, record, seek +5, stop, undo, redo `Pressable`s (~lines 1457–1509)
- [ ] Add `.focus-ring` to each transport `Pressable` (visible focus, WCAG 2.4.7)
- [ ] Preserve existing `CommandPalette` keyboard shortcuts (`Space` play, `R` record) — no behavior change

## 4. Focus-visible style (`global.css`)
- [ ] Add `.focus-ring` / `:focus-visible` rules to `@layer components` (no existing rule — confirmed by grep)
- [ ] Apply `.focus-ring` to `OneKnob`, sidebar nav items, transport `Pressable`s, and interactive `Card`s

## 5. Follow-up audit (documented, deep keyboard editing out of scope)
- [ ] `PianoRoll`, `PedalRack`, `Looper`, `Tuner`, `AutomationLane`, `TrackGroupManager`, `ChordTrack`, `Sampler`, `Synth`, `Mastering*` — apply role/label contract to top-level affordances; track deep Canvas keyboard editing as TODO

## 6. Tests
- [ ] Add/extend `tests/components.test.tsx` assertions that `Button` renders with `accessibilityRole="button"` and `accessibilityLabel` == title
- [ ] Add assertion that `OneKnob` (after implementation) renders with `accessibilityRole="adjustable"` and `accessibilityLabel` == label and `accessibilityValue.now` == value
- [ ] Add assertion that `ProgressBar` exposes `role="progressbar"` + `aria-valuenow`
- [ ] Add assertion that studio transport `Pressable`s expose `accessibilityRole="button"` + non-empty `accessibilityLabel` (render `app/studio/[id].tsx` with a mock project)

## 7. Verification
- [ ] `npx tsc --noEmit` clean
- [ ] `cd backend && npx tsc --noEmit` clean
- [ ] `npx vitest run` passes
- [ ] `npm run test:legacy` passes
- [ ] `npm run build` succeeds
