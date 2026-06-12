# Agent Workflow: Loop

> This project uses a structured **Plan → Act → Check → Repeat** loop. Every change goes through all three phases before moving on.

---

## Pre-flight

Before starting any task:

- [ ] Read this file (`AGENTS.md`) fully
- [ ] Read `CLAUDE.md` and follow its references
- [ ] Read `global.css` to understand available component classes
- [ ] Review `src/components/index.ts` for existing design system components
- [ ] Read `tailwind.config.js` for design tokens (colors, spacing, radii)
- [ ] Check `package.json` for available dependencies — **do not add new ones without approval**
- [ ] Read the exact Expo SDK docs at https://docs.expo.dev/versions/v56.0.0/ before using any Expo API
- [ ] Check git log (`git log --oneline -10`) to understand recent context

---

## Phase 1: Plan

**Goal:** Understand what needs to change before writing code.

1. **Read relevant files** — Read all files mentioned in the task, plus any files they import
2. **Trace the data flow** — Identify state, props, and side effects before modifying
3. **Scope the change** — Answer:
   - What is the smallest possible change?
   - Which files must be modified?
   - Will this change affect other screens?
4. **Produce a plan** — List files and changes in order. Example:
   ```
   1. src/components/Button.tsx — add `danger` variant
   2. app/(auth)/login.tsx — use new variant for delete action
   3. Run `npx tsc --noEmit` to verify types
   4. Run `npm run build` to verify build
   ```

**Do NOT** skip straight to code. If uncertain about the approach, use the Task tool to explore first.

---

## Phase 2: Act

**Goal:** Implement the plan with minimal scope.

### Constraints

- **No new dependencies** unless explicitly approved. Check `package.json` first.
- **Follow existing patterns.** If the project uses `View` + `className`, do that. Don't introduce `StyleSheet.create`.
- **Use the design system.** Import from `src/components/` whenever possible. Don't inline styles that exist as components.
- **No comments in code.** The code should be self-documenting.
- **Tailwind v3 syntax.** Use `@tailwind base/components/utilities` directives, NOT `@import "tailwindcss/..."` (that's v4).
- **Don't modify config files** (`tailwind.config.js`, `metro.config.js`, `babel.config.js`, `tsconfig.json`) unless the task explicitly requires it.
- **No dead code.** Don't leave unused imports, variables, or files.
- **Root cause, not suppression.** For bugs, fix the underlying issue. Don't add try/catch wrappers that silence errors.

### Design System Reference

Available in `src/components/`:

| Component | Props | Usage |
|-----------|-------|-------|
| `Button` | `title, onPress, variant, loading, disabled, icon` | `variant: 'primary'\|'secondary'\|'ghost'` |
| `TextInput` | `label, error, ...TextInputProps` | Wraps RN TextInput with label + error |
| `Card` | `children, onPress, activeBorder, elevated` | Container with dark surface styling |
| `CardRow` | `children, onPress` | Horizontal card list item |
| `CardIcon` | `icon: string` | Emoji/text icon in gradient box |
| `Badge` | `text, icon, variant` | `variant: 'default'\|'play'\|'active'` |
| `Avatar` | `name, size` | `size: 'sm'\|'md'\|'lg'` |
| `Divider` | `label?, className?` | Horizontal line with optional label |
| `Loading` | `message?, fullScreen?` | Spinner + message |
| `EmptyState` | `icon, title, subtitle?, action?` | Centered empty state |
| `ProgressBar` | `progress, className?` | 0-100 progress fill |
| `PageHeader` | `title, subtitle?` | Standard page header |

CSS component classes (from `global.css`):
- `card`, `card-elevated` — container styles
- `btn-primary`, `btn-secondary`, `btn-ghost` — button styles
- `input-field`, `input-field-focused` — input styles
- `badge` — badge container
- `section-header`, `label` — text styles

### Audio System

- Uses `expo-audio` (SDK 56), NOT `expo-av`
- `useAudioPlayer(source)` — returns `AudioPlayer`
- `useAudioPlayerStatus(player)` — returns `{ playing, currentTime, duration, isLoaded }`
- `player.play()`, `player.pause()`, `player.replace(source)`, `player.seekTo(seconds)`
- `player.volume = 0.0...1.0`
- Sources can be `require(...)` or URL string

---

## Phase 3: Check

**Goal:** Verify correctness before moving on.

### Required checks (run in this order):

```
# TypeScript check — must pass with zero errors
npx tsc --noEmit

# Production build — must succeed
npm run build
```

### Additional checks (when applicable):

- **UI changes:** After building, verify the output
- **Audio changes:** Test play/pause/seek behavior
- **Auth changes:** Test with both real Supabase env vars and mock fallback (no .env)

### If a check fails:

1. Read the error message carefully
2. Fix the root cause (don't suppress)
3. Re-run all checks from the top
4. Only proceed to the next task when ALL checks pass

---

## Phase 4: Repeat (or Commit)

**Goal:** Decide whether to continue or finish.

- **If there are more tasks:** Go back to Phase 1 with the next task
- **If the task is complete:** Only commit/push if explicitly asked by the user

### Commit conventions (when asked):

```
type: short description (max 72 chars)

- bullet list of specific changes
- reference design system components used
```

Types: `fix`, `feat`, `chore`, `refactor`, `docs`

---

## Project Architecture Quick Reference

```
app/
  _layout.tsx          — Root: SafeAreaProvider + AuthProvider + redirect logic
  (auth)/login.tsx    — Login screen
  (tabs)/
    _layout.tsx       — Tab navigator (Feed, Biblioteca)
    index.tsx         — Feed screen with audio playback
    library.tsx       — Library screen with project list
  studio/[id].tsx     — DAW-style studio with multi-track mixer

src/
  lib/supabase.ts     — Supabase client with mock fallback for dev
  context/
    AuthContext.tsx    — Auth state context (session, user, loading, signOut)
  components/         — Design system components (see table above)

Config:
  tailwind.config.js  — Design tokens (colors, spacing, fonts)
  global.css          — Tailwind directives + component layer utilities
  babel.config.js     — Babel with expo preset + nativewind/babel + reanimated
  metro.config.js     — Metro with NativeWind + nativewind node_modules paths
```
