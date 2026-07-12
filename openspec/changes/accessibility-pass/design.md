# Design — Accessibility Pass

## Accessibility Contract (applies to all design-system components in `src/components/`)

Every interactive component MUST:
1. Set `accessibilityRole` to the semantically correct ARIA role (`button`, `slider`, `progressbar`, `image`, `adjustable`, etc.).
2. Set `accessibilityLabel` to a human-readable, localized (pt-BR default) name describing the action or control.
3. For valued/adjustable controls, set `accessibilityValue={{ now, min, max }}` (RN-web maps to `aria-valuenow/min/max`).
4. Mark disabled/busy state via `accessibilityState={{ disabled, busy }}`.
5. Be reachable and operable by keyboard; show a visible focus ring via the shared `.focus-ring` utility / `:focus-visible` style.

`react-native-web` mapping reference:
- `accessibilityRole="button"` → `role="button"`
- `accessibilityRole="slider"` / `"adjustable"` → `role="slider"`
- `accessibilityLabel` → `aria-label`
- `accessibilityValue` → `aria-valuenow/min/max`
- `accessibilityState={{ disabled }}` → `aria-disabled`
- `accessibilityHint` → `aria-hint` (advisory)

## Component / File Mapping

| Component | File | Change |
|---|---|---|
| `OneKnob` (incl. `OneKnobProcessor`) | `src/components/OneKnob.tsx` | Add `accessibilityRole="adjustable"`, `accessibilityLabel={label}`, `accessibilityValue={{ now: value, min, max }}`, `accessibilityHint`. Add keyboard handlers (`onKeyDown` ArrowUp/Down/Left/Right ± step, Home/End) driving `onChange`. Add `:focus-visible` ring on the `Pressable`. |
| `Button` | `src/components/Button.tsx` | Already has role/label/state. Add `accessibilityHint` support (optional prop) + ensure focus ring class on the `Pressable`. |
| `Sidebar` / `RightSidebar` | `src/components/Sidebar.tsx`, `src/components/RightSidebar.tsx` | Already role=button + `aria-current`. Add `accessibilityLabel` text to icon-only items (already present via `item.label`). Add focus ring to nav `Pressable`s. |
| `Card` / `CardRow` | `src/components/Card.tsx` | Already supports `accessibilityLabel`. Ensure interactive variant gets focus ring. |
| `ProgressBar` | `src/components/ProgressBar.tsx` | Already `role=progressbar` + `aria-valuenow/min/max`. Add `accessibilityLabel` (e.g. "Progress"). |
| `Loading` | `src/components/Loading.tsx` | Already `role=progressbar` + label. No change. |
| `Metronome` | `src/components/Metronome.tsx` | Add `accessibilityRole="button"` + labels to play/stop toggle; BPM `TextInput` already numeric — add `accessibilityLabel="BPM"`. |
| `MiniPlayer` | `src/components/MiniPlayer.tsx` | Already labeled. Add focus ring. |
| `FeedPostCard` / `SamplePackCard` / `ProjectCard` / `MomentCard` | `src/components/*.tsx` | Ensure play/pause `Pressable`s have `accessibilityRole="button"` + label (FeedPostCard already does). Audit the others. |
| `Transport controls` | `app/studio/[id].tsx` (lines ~1457–1509: seek -5, play, record, seek +5, stop, undo, redo) | Add `accessibilityRole="button"` + `accessibilityLabel` to each `Pressable` (e.g. "Reproduzir", "Parar", "Gravar", "Voltar 5 segundos", "Avançar 5 segundos", "Desfazer", "Refazer"). Keep existing `CommandPalette` shortcuts (`Space`, `R`) intact. |
| `PluginRack` / `MasterRack` / `PluginEditor` | `src/components/PluginRack.tsx`, `PluginEditor.tsx` | Add `accessibilityRole="button"` + labels to enable/disable and param-toggle `Pressable`s. |
| `PianoRoll`, `PedalRack`, `Looper`, `Tuner`, `AutomationLane`, `TrackGroupManager`, `ChordTrack`, `Sampler`, `Synth`, `Mastering*` | `src/components/*.tsx` | Apply role/label contract to top-level interactive affordances. Deep keyboard editing of Canvas internals tracked as follow-up (see Out of Scope in proposal). |

## Focus-Visible Style (`global.css`)
Add under `@layer components` (no existing `:focus-visible` rule — confirmed by grep):
```css
@layer components {
  .focus-ring {
    outline: none;
  }
  .focus-ring:focus-visible {
    outline: 2px solid #5ac8fa;
    outline-offset: 2px;
    border-radius: 8px;
  }
  .btn-primary:focus-visible,
  .btn-secondary:focus-visible,
  .btn-ghost:focus-visible,
  .input-field:focus-visible {
    outline: 2px solid #5ac8fa;
    outline-offset: 2px;
  }
}
```
Apply `.focus-ring` to `OneKnob` `Pressable`, sidebar nav items, and transport `Pressable`s. (Code not authored here — spec only.)

## Keyboard Operability Detail — `OneKnob`
- `onKeyDown` (when focusable): `ArrowUp`/`ArrowRight` → `onChange(clamp(value + step))`; `ArrowDown`/`ArrowLeft` → `onChange(clamp(value - step))`; `Home` → `min`; `End` → `max`.
- `Pressable` must be focusable on web (`tabIndex={0}` via RN-web `focusable`/`tabIndex` prop) so the key handler fires.
- Screen-reader announces `label`, `role=slider/adjustable`, and current `value` via `accessibilityValue`.

## New OpenSpec Spec
Create `openspec/specs/accessibility/spec.md` documenting: the contract above, required roles/labels per component category, keyboard-operability requirement, focus-visible requirement, and a test requirement (component tests must assert `accessibilityLabel`/`role` on key components).
