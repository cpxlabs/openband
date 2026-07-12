# Spec — Accessibility Contract

This spec defines the accessibility (a11y) contract for OpenBand's design-system
components and key interactive surfaces. OpenBand renders on web via
`react-native-web`, which maps React Native a11y props directly to HTML ARIA
attributes, so a consistent a11y contract makes the product usable for
keyboard-only and screen-reader users.

## Requirements

### R1 — Accessibility contract for interactive components
Every interactive design-system component in `src/components/` MUST:

1. Set `accessibilityRole` to the semantically correct ARIA role
   (`button`, `slider`, `progressbar`, `image`, `adjustable`, etc.).
2. Set `accessibilityLabel` to a human-readable, localized (pt-BR default) name
   describing the action or control.
3. For valued/adjustable controls, set
   `accessibilityValue={{ now, min, max }}` (RN-web → `aria-valuenow/min/max`).
4. Mark disabled/busy state via `accessibilityState={{ disabled, busy }}`.
5. Be reachable and operable by keyboard; show a visible focus ring via the
   shared `.focus-ring` utility / `:focus-visible` style.

### R2 — Keyboard operability for custom controls
- `OneKnob` MUST be keyboard-operable: `ArrowUp`/`ArrowRight` increment by
  `step`, `ArrowDown`/`ArrowLeft` decrement by `step`, `Home` → `min`,
  `End` → `max`. The `Pressable` MUST be focusable (`focusable`/`tabIndex`)
  so the key handler fires.
- Studio transport `Pressable`s (play/stop/record/seek/undo/redo) MUST expose
  `accessibilityRole="button"` + `accessibilityLabel` (pt-BR) and retain the
  existing `CommandPalette` shortcuts (`Space` play, `R` record).

### R3 — Visible focus
`global.css` MUST provide a `.focus-ring` / `:focus-visible` style (cyan
`#5ac8fa` outline, 2px, 2px offset) applied to `.btn-primary`, `.btn-secondary`,
`.btn-ghost`, `.input-field`, `OneKnob`, sidebar nav items, and transport
`Pressable`s.

### R4 — Test requirement
Component tests MUST assert that key components render with the correct
`accessibilityRole`/`accessibilityLabel` (and `accessibilityValue` for valued
controls). At minimum: `Button`, `OneKnob`, `ProgressBar`, `Loading`,
`Sidebar`, and the studio transport controls.

## react-native-web attribute mapping

| RN prop | HTML attribute |
|---|---|
| `accessibilityRole="button"` | `role="button"` |
| `accessibilityRole="slider"` / `"adjustable"` | `role="slider"` |
| `accessibilityRole="progressbar"` | `role="progressbar"` |
| `accessibilityLabel` | `aria-label` |
| `accessibilityValue` | `aria-valuenow/min/max` |
| `accessibilityState={{ disabled }}` | `aria-disabled` |
| `accessibilityHint` | `aria-hint` (advisory) |
| `aria-busy` (direct) | `aria-busy` |

## Scope

- **In scope:** core design-system components (`Button`, `OneKnob`, `Sidebar`,
  `ProgressBar`, `Loading`, `Card`/`CardRow`), studio transport, focus styles,
  and component tests.
- **Follow-up (out of scope for this pass):** deep keyboard rework of Canvas
  widgets (`PianoRoll`, `PedalRack`, `AutomationLane`, `Looper`, `Tuner`,
  `ChordTrack`, `Sampler`, `Synth`, `Mastering*`), and `Metronome` /
  `MiniPlayer` / card play-pause affordances — these receive role/label and
  are tracked separately.
