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
- [ ] Check `docs/supabase.md` when setting up or modifying Supabase integration
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
| `Sidebar` | `currentRoute, onNavigate, isOpen, onClose, isPersistent` | Left drawer nav (persistent on desktop, overlay on mobile) |
| `PedalRack` | `chain, onChange, trackName` | 6-slot guitar pedalboard with amp + cab selectors |
| `Tuner` | `visible, onClose` | Chromatic tuner overlay |
| `CodeSampler` | `visible, onClose, onRender, bpm` | Token-based beat sequencer |
| `MomentCard` | `moment: MomentData` | Artist moment card for social feed |
| `MiniMastering` | `onPresetChange, activePreset, eqValues, onEqChange` | Quick mastering chain presets + EQ |
| `LufsMeter` | `isPlaying` | Loudness meter (LUFS) |
| `BounceDialog` | `visible, onClose, projectTitle, duration` | Export/stem bounce dialog |
| `MixManager` | `snapshots, activeMixId, onSave, onLoad, onDelete, onCompare` | A/B mix snapshot manager |
| `PluginRack` | `plugins, onChange, onEdit, trackName` | Plugin chain per track |
| `MasterRack` | `plugins, onChange, onEdit` | Master bus plugin chain |
| `PluginEditor` | `plugin, onParamChange, onToggle, onClose` | Deep plugin parameter editor (all 18 types) |
| `AutomationLane` | `points, onChange, duration, color, visible, label, minValue, maxValue` | Volume/param automation curve editor |
| `TrackGroupManager` | `groups, tracks, onCreateGroup, onRemoveGroup, onGroupVolume, onGroupMute, onAssignTrack, trackAssignments` | Track grouping with shared volume/mute |
| `WaveformClip` | `regionId, duration, color, audible, height` | Waveform visualization for audio clips |
| `SampleBrowser` | `visible, onAddSample` | Browse and add sample packs |
| `RecordOptions` | `settings, onChange, visible, onClose` | Recording settings (source, quality, sample rate) |
| `Metronome` | `settings, onChange, isPlaying` | BPM/tempo click track |
| `NewProject` | `visible, onClose, onCreate` | New project creation modal |
| `PianoRoll` | `notes, onChange, visible, onClose, bpm, numBars?, snap?, keySignature?, scale?` | MIDI note piano roll editor |
| `Looper` | `visible, onClose, bpm, onCommitLoop` | Live loop recording/playback |
| `VisualEQ` | `frequencies, onChange?, height?` | Visual equalizer display |
| `OneKnob` | `label, value, onChange, min?, max?, step?, type?` | Single-knob control (18 types) |
| `Sampler` | `visible, onClose, onAddToTrack` | Audio sample player |
| `Synth` | `visible, onClose, bpm` | Synthesizer with presets |

CSS component classes (from `global.css`):
- `card`, `card-elevated` — container styles
- `btn-secondary` — button style
- `input-field`, `input-field-focused` — input styles
- `badge` — badge container
- `label` — text style

### Audio System

- Uses `expo-audio` (SDK 56), NOT `expo-av`
- `useAudioPlayer(source)` — returns `AudioPlayer`
- `useAudioPlayerStatus(player)` — returns `{ playing, currentTime, duration, isLoaded }`
- `player.play()`, `player.pause()`, `player.replace(source)`, `player.seekTo(seconds)`
- `player.volume = 0.0...1.0`
- Sources can be `require(...)` or URL string

### Backend

- Express server at `backend/src/index.ts`, port 3001
- POST `/api/extract` — upload audio for Demucs stem separation
- GET `/api/stems/:filename` — download processed stems
- Python Demucs path: `backend/.venv/bin/python3` (or `$PYTHON_PATH` env var)
- Mock fallback generates silent WAVs when Demucs unavailable
- Run: `cd backend && npm run dev`

---

## Phase 3: Check

**Goal:** Verify correctness before moving on.

### Required checks (run in this order):

```
# TypeScript check — must pass with zero errors
npx tsc --noEmit

# Vitest component + lib tests — must pass
npx vitest run

# Legacy node:test suite — must pass
npm test

# Production build — must succeed
npm run build
```

### Additional checks (when applicable):

- **UI changes:** After building, verify the output
- **Audio changes:** Test play/pause/seek behavior
- **Auth changes:** Test with both real Supabase env vars and mock fallback (no .env)
- **Android build:** `cd android && ./gradlew assembleRelease`
- **Dependency changes:** Check `package.json` before adding any new package

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
  (auth)/login.tsx    — Login screen (Supabase auth, mock fallback)
  (tabs)/
    _layout.tsx       — Tab navigator (Feed, Biblioteca) + responsive sidebar drawer
    index.tsx         — Feed screen with audio playback
    library.tsx       — Library screen with project list + "Separar Stems" button
  extractor.tsx       — Stem separation (select → process → results)
  studio/[id].tsx     — DAW-style multi-track mixer with waveform + transport

src/
  lib/supabase.ts     — Supabase client with mock fallback for dev
  lib/responsive.ts   — useResponsive hook (mobile/tablet/desktop breakpoints)
  context/
    AuthContext.tsx    — Auth state context (session, user, loading, signOut)
  components/         — Design system (34 components, see table above)

tests/
  responsive.test.ts  — Breakpoint & dimension tests (legacy)
  types.test.ts       — Type structure tests (legacy)
  presets.test.ts     — Pedal/amp/cab preset count + structure tests (legacy)
  components.test.tsx — Vitest component rendering + interaction tests (116 tests)
  lib.test.ts         — Vitest library function tests (39 tests)

stories/              — Storybook stories for all 34 components
  *.stories.tsx       — Run: `npx storybook dev -p 6006`

.storybook/
  main.ts             — Vite + react-native-web alias
  preview.ts          — Dark theme, CSS import

backend/
  src/
    index.ts          — Express server entry (port 3001)
    routes/extract.ts — POST /api/extract + GET /api/stems/:filename
    services/
      demucs.ts       — Python Demucs subprocess (htdemucs, 4 stems)
      mock.ts         — Silent WAV fallback generator
    middleware/upload.ts — Multer config (200MB, audio formats)
    types.ts          — Shared types

supabase/
  schema.sql          — DB tables: profiles, projects, tracks, stems, posts

Config:
  tailwind.config.js  — Design tokens (colors, spacing, fonts, radii)
  global.css          — Tailwind v3 directives + component layer
  babel.config.js     — Babel with expo preset + nativewind/babel + reanimated
  metro.config.js     — Metro with NativeWind + nativewind node_modules paths
  tsconfig.json       — Strict TS, @/ path alias
  .env.example        — Supabase env vars template
  docs/supabase.md    — Complete Supabase setup guide
```
