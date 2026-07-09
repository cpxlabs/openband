# Agent Workflow: OpenSpec SDD Loop

> This project uses the **OpenSpec Specification-Driven Development (SDD)** loop as its default development harness. Every change goes through three phases: **Propose** (define specs and tasks in `openspec/changes/`), **Apply** (implement exactly what is specified in `tasks.md`), and **Archive** (record and move completed specs to `openspec/archive/`).

**ALWAYS commit and push after completing changes.** Do not wait to be asked.

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
- [ ] Run code review via the `code-review` agent before every commit

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
- **Never modify build scripts** in `package.json` unless the user explicitly requests it.
- **Desktop bridge rule:** Never use `require('fs')`, `ipcRenderer`, or Tauri APIs in `src/` frontend code. All native desktop I/O goes through `OpenBandNative` from `@bridge`.
- **Follow existing patterns.** If the project uses `View` + `className`, do that. Don't introduce `StyleSheet.create`.
- **Use the design system.** Import from `src/components/` whenever possible. Don't inline styles that exist as components.
- **No comments in code.** The code should be self-documenting.
- **Tailwind v3 syntax.** Use `@tailwind base/components/utilities` directives, NOT `@import "tailwindcss/..."` (that's v4).
- **Don't modify config files** (`tailwind.config.js`, `metro.config.js`, `babel.config.js`, `tsconfig.json`) unless the task explicitly requires it. (Adding `@bridge` alias to tsconfig.json is allowed for desktop architecture changes.)
- **Keep changes documentation updated:** Always consult and update `docs/ui-overhaul-v2-changes.md` when modifying visual layouts, themes, stylesheets, or core components to ensure all UI overhaul features remain fully documented.
- **No dead code.** Don't leave unused imports, variables, or files.
- **Root cause, not suppression.** For bugs, fix the underlying issue. Don't add try/catch wrappers that silence errors.
- **Test output format:** Every test must follow the node:test pattern — `▶ SuiteName` for describe blocks, `  ✔ test description (Xms)` for passing tests, and `✔ SuiteName (Xms)` at suite end. See legacy tests (`tests/presets.test.ts`, `tests/types.test.ts`) for reference.

### Design System Reference

Available in `src/components/`:

| Component                 | Props                                                                                                       | Usage                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `Button`                  | `title, onPress, variant, loading, disabled, icon`                                                          | `variant: 'primary'\|'secondary'\|'ghost'`                 |
| `TextInput`               | `label, error, ...TextInputProps`                                                                           | Wraps RN TextInput with label + error                      |
| `Card`                    | `children, onPress, activeBorder, elevated`                                                                 | Container with dark surface styling                        |
| `CardRow`                 | `children, onPress`                                                                                         | Horizontal card list item                                  |
| `CardIcon`                | `icon: string`                                                                                              | Emoji/text icon in gradient box                            |
| `Badge`                   | `text, icon, variant`                                                                                       | `variant: 'default'\|'play'\|'active'`                     |
| `Avatar`                  | `name, size`                                                                                                | `size: 'sm'\|'md'\|'lg'`                                   |
| `Divider`                 | `label?, className?`                                                                                        | Horizontal line with optional label                        |
| `Loading`                 | `message?, fullScreen?`                                                                                     | Spinner + message                                          |
| `EmptyState`              | `icon, title, subtitle?, action?`                                                                           | Centered empty state                                       |
| `ProgressBar`             | `progress, className?`                                                                                      | 0-100 progress fill                                        |
| `PageHeader`              | `title, subtitle?`                                                                                          | Standard page header                                       |
| `Sidebar`                 | `currentRoute, onNavigate, isOpen, onClose, isPersistent`                                                   | Left drawer nav (persistent on desktop, overlay on mobile) |
| `PedalRack`               | `chain, onChange, trackName`                                                                                | 6-slot guitar pedalboard with amp + cab selectors          |
| `Tuner`                   | `visible, onClose`                                                                                          | Chromatic tuner overlay                                    |
| `CodeSampler`             | `visible, onClose, onRender, bpm`                                                                           | Token-based beat sequencer                                 |
| `MomentCard`              | `moment: MomentData`                                                                                        | Artist moment card for social feed                         |
| `MiniMastering`           | `onPresetChange, activePreset, eqValues, onEqChange`                                                        | Quick mastering chain presets + EQ                         |
| `LufsMeter`               | `isPlaying`                                                                                                 | Loudness meter (LUFS)                                      |
| `BounceDialog`            | `visible, onClose, projectTitle, duration`                                                                  | Export/stem bounce dialog                                  |
| `MixManager`              | `snapshots, activeMixId, onSave, onLoad, onDelete, onCompare`                                               | A/B mix snapshot manager                                   |
| `PluginRack`              | `plugins, onChange, onEdit, trackName`                                                                      | Plugin chain per track                                     |
| `MasterRack`              | `plugins, onChange, onEdit`                                                                                 | Master bus plugin chain                                    |
| `PluginEditor`            | `plugin, onParamChange, onToggle, onClose`                                                                  | Deep plugin parameter editor (all 19 types)                |
| `AutomationLane`          | `points, onChange, duration, color, visible, label, minValue, maxValue`                                     | Volume/param automation curve editor                       |
| `TrackGroupManager`       | `groups, tracks, onCreateGroup, onRemoveGroup, onGroupVolume, onGroupMute, onAssignTrack, trackAssignments` | Track grouping with shared volume/mute                     |
| `WaveformClip`            | `regionId, duration, color, audible, height`                                                                | Waveform visualization for audio clips (DOM)               |
| `WaveformCanvas`          | `regionId, duration, color, audible, selected?, muted?, height?, zoom?, peaks?`                             | Canvas-based waveform with devicePixelRatio, viewport culling |
| `SampleBrowser`           | `visible, onAddSample`                                                                                      | Browse and add sample packs                                |
| `RecordOptions`           | `settings, onChange, visible, onClose`                                                                      | Recording settings (source, quality, sample rate)          |
| `Metronome`               | `settings, onChange, isPlaying`                                                                             | BPM/tempo click track                                      |
| `NewProject`              | `visible, onClose, onCreate, onStartFromScratch?`                                                           | 3-step project creation (genre→mood→details) with numBars, timeSignature, "start from scratch" |
| `PianoRoll`               | `notes, onChange, visible, onClose, bpm, numBars?, snap?, keySignature?, scale?`                            | MIDI note piano roll editor                                |
| `Looper`                  | `visible, onClose, bpm, onCommitLoop`                                                                       | Live loop recording/playback                               |
| `VisualEQ`                | `frequencies, onChange?, height?`                                                                           | Visual equalizer display                                   |
| `OneKnob`                 | `label, value, onChange, min?, max?, step?, type?`                                                          | Single-knob control (19 types)                             |
| `Sampler`                 | `visible, onClose, onAddToTrack`                                                                            | Audio sample player                                        |
| `Synth`                   | `visible, onClose, bpm`                                                                                     | Synthesizer with presets                                   |
| `MasteringSuite`          | `audioUri, onExport, onClose, visible`                                                                      | Full mastering chain with EQ, comp, limiter, LUFS          |
| `MasteringChain`          | `plugins, onToggle, onReset`                                                                                | Mastering chain slot UI with ON/OFF toggles                |
| `MasteringVersionManager` | `versions, activeId, onSelect, onSave, onDelete, onBypass`                                                  | A/B version compare + snapshot management                  |
| `MasteringUpload`         | `input, onModeChange, onUpload, onClear, mode, testID?`                                                     | Upload/drop zone for audio files and stems (displays bpm/key/timeSignature if present) |
| `ChordTrack`              | `chords, onChange, keySignature, numBars, visible, onClose`                                                 | Chord progression timeline with presets + Markov suggestions |
| `PluginUI`                | `descriptor, paramValues, onParamChange, onToggle?, onClose?`                                              | Generic Wasm plugin UI generator (renders knobs/sliders from schema) |
| `BranchManager`           | `visible, onClose, onBranchSwitch?, onMerge?`                                                              | Git-like branch fork/merge/diff viewer for CRDT state        |
| `Patchbay`                | `visible, onClose, trackIds, onRouteCreated?, onRouteRemoved?`                                             | Drag-and-drop hardware I/O routing matrix (multi-channel)   |
| `CommandPalette`          | `visible, onClose`                                                                                         | Cmd+K searchable command overlay for keyboard-first workflow |
| `CommitModal`             | `visible, onClose, onCommit?, onSync?`                                                                     | Commit message + push-to-cloud modal                         |
| `VersionHistory`          | `visible, onClose, onRevert?`                                                                              | Visual commit timeline graph with revert support             |
| `PromptSampler`           | `visible, onClose, onRender, bpm`                                                                          | AI prompt-based MIDI generation                              |
| `VoiceCommandButton`      | `visible, onClose`                                                                                         | Voice command input button                                   |
| `MiniPlayer`              | `visible, onClose`                                                                                         | Mini audio player overlay                                    |
| `QuickActions`            | `visible, onClose`                                                                                         | Quick action shortcuts bar                                   |
| `QuickTools`              | `visible, onClose`                                                                                         | Quick tool selector                                          |
| `ProjectMenu`             | `visible, onClose`                                                                                         | Project-level menu (save, export, share)                     |

CSS component classes (from `global.css`):

- `card`, `card-elevated` — container styles
- `btn-secondary` — button style
- `input-field`, `input-field-focused` — input styles
- `badge` — badge container
- `label` — text style

### Desktop Bridge (`src/bridge/`)

All native desktop capabilities **must** go through `src/bridge/` — **never** use `require('fs')`, Electron `ipcRenderer`, or Tauri APIs in frontend code.

| File           | Role                                                                           |
| -------------- | ------------------------------------------------------------------------------ |
| `interface.ts` | Contract — `NativeBridge` interface with all method signatures                 |
| `electron.ts`  | Electron impl — delegates to `window.electronAPI` (exposed via preload)        |
| `tauri.ts`     | Tauri stub — placeholder for future migration (all methods warn + return null) |
| `browser.ts`   | Browser fallback — uses `localStorage`, `document.createElement`, etc.         |
| `index.ts`     | Auto-detect: `electronAPI` → Electron, `__TAURI__` → Tauri, else browser       |

**Usage in frontend:**

```ts
import { OpenBandNative } from '@bridge';
const path = await OpenBandNative.showOpenDialog({ filters: [...] });
```

**Motto:** The frontend has zero knowledge of whether it's running in Electron, Tauri, or a browser tab. Swap the backend by replacing one file.

### Audio System

- Uses `expo-audio` (SDK 56), NOT `expo-av`
- `useAudioPlayer(source)` — returns `AudioPlayer`
- `useAudioPlayerStatus(player)` — returns `{ playing, currentTime, duration, isLoaded }`
- `player.play()`, `player.pause()`, `player.replace(source)`, `player.seekTo(seconds)`
- `player.volume = 0.0...1.0`
- Sources can be `require(...)` or URL string
- **Universal Audio System** (`src/lib/universalAudio.ts`): Singleton `UniversalAudioSystem` with lazy AudioContext creation, multi-track mixdown via OfflineAudioContext (web) or bridge fallback (native), cross-platform file export (save dialog / download link)
- **Cross-platform BounceDialog**: No longer blocks on `Platform.OS !== "web"` — export works on all platforms via `audioSystem`
- **useUniversalAudio hook** (`src/hooks/useUniversalAudio.ts`): Wraps expo-audio with AudioContext resume on user interaction, play/pause/stop/seek/setVolume
- **App init** (`app/_layout.tsx`): Audio system initialized on first pointerdown/keydown (web) or immediately (native) — handles browser autoplay policy
- **Web player autoplay fix**: `togglePlay()` calls `audioSystem.ensureContext()` synchronously before any async work to satisfy browser autoplay policy. `await player.replace()` and `await player.play()` with try/catch. No eager `audioSystem.initialize()` in studio mount effect. Blob URLs tracked in `currentUrlRef` and revoked on re-render/unmount.

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
# 1. Code Review — must be done via the code-review subagent
#    Use: Task tool with subagent_type="code-review"
#    NEVER skip this step. Always shout this same agent.

# 2. TypeScript check — must pass with zero errors
npx tsc --noEmit

# 3. Backend TypeScript check — must pass
cd backend && npx tsc --noEmit

# 4. Vitest component + lib tests — must pass
npx vitest run

# 5. Legacy node:test suite — must pass
npm run test:legacy

# 6. Production build — must succeed
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
- **If the task is complete:** Commit and push all changes.

### Commit conventions:

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
  tabs/
    _layout.tsx       — Tab navigator (Feed, Biblioteca, Momentos) + responsive sidebar drawer (router.push, not replace)
    index.tsx         — Feed screen with audio playback
    library.tsx       — Library screen with project list + "Separar Stems" button
    moments.tsx       — Sample pack store / artist moments
    account.tsx       — Profile + sign-out
    settings.tsx      — App settings
  extractor.tsx       — Stem separation (select → process → results)
  mastering/
    index.tsx         — Mastering suite page (full chain EQ, comp, limiter, LUFS)
  studio/[id].tsx     — DAW-style multi-track mixer with waveform + transport (parses numBars, timeSignature, scratch params). Uses clockManager for beat tracking, busRouter for auto-assignment, automationEngine for volume interpolation

src/
  lib/
    supabase.ts       — Supabase client with mock fallback for dev
    responsive.ts     — useResponsive hook (mobile/tablet/desktop breakpoints)
    midiParser.ts     — MIDI file parser
    midiSynth.ts      — Web Audio API MIDI synthesizer (bus routing, offline rendering)
    projectStore.ts   — Project persistence (localStorage + bridge)
    projectTemplates.ts — Genre/mood/key templates with Mood (10-value), TIME_SIGNATURES, generateTracksForGenre
    keyboard.ts       — useKeyboardShortcuts hook
    automix.ts        — Genre-based auto-mix presets
    history.ts        — useHistory (undo/redo) hook
    mastering.ts      — Mastering chain builder
    types.ts          — Shared types (TrackDef, Plugin, BusDef, AutomationPoint, ChordQuality, TIME_SIGNATURES, EQ_DEFAULT_BANDS)
    automationEngine.ts — Web Audio automation scheduling (linear/exponential curves), wired into studio playback
    busRouter.ts      — Sub-mix bus routing graph builder, auto-assigns tracks to buses on creation
    clockManager.ts   — Web Worker master clock for metronome (25ms tick interval), tracks beat position during playback
    presence.ts       — Client-side SSE presence hook (throttled cursor broadcasting)
    canvasWaveform.ts — AudioBuffer → peak data (generatePeakData) + Canvas 2D waveform renderer (renderWaveformCanvas) + virtual scroll
    midiScheduler.ts  — Lookahead MIDI scheduler with sample-accurate timing
    subtractiveSynth.ts — Dual-oscillator subtractive synth with filter/ADSR/LFO
    chunkedRenderer.ts — Chunked offline rendering for long projects
    audioGraphValidation.ts — DAG cycle detection for bus/track routing
    snapshotManager.ts — CRDT snapshot compaction + state management
    timelineGestures.ts — Custom gesture state machine for pinch-zoom/scroll
    crdt.ts           — Operation-based CRDT with Lamport timestamps
    collaboration.ts  — Real-time collaboration hook with CRDT sync
    transientDetection.ts — Audio transient detection + slicing utilities
    timeStretch.ts    — Pitch-independent time-stretch via granular synthesis
    timeStretchVocoded.ts — Phase Vocoder / WSOLA time-stretch AudioWorklet with FFT
    wasmInstrumentEngine.ts — Unified Wasm synth/sampler in AudioWorklet (sample-accurate MIDI)
    wasmPluginHost.ts — Wasm plugin loader, IPlugin interface, JSON-RPC MessagePort protocol
    projectBranching.ts — CRDT fork/merge/diff, branch isolation, selective merge acceptance
    yjsCRDT.ts    — Operation-based CRDT with Lamport timestamps, WebSocket sync
    aiAutoMixAnalysis.ts — Stem analysis (LUFS, spectral balance, transient density), role-based suggestions
    chordTrackState.ts  — ChordRegion schema, chord-to-MIDI conversion, harmonic suggestion
    stateAssetSeparation.ts — OpenBandManifest v2 with S3 URL pointers, SHA-256 commit hashing
    supabaseRemote.ts — Push/pull/sync with asset deduplication via hash check
    modulationMatrix.ts — LFO/envelope/macro modulation routing (11 sources × 11 targets)
    audioTelemetry.ts — Ring buffer for underruns/CPU metrics with server reporting
    openbandFormat.ts  — .openband binary archive with CRC32 integrity
    previewEngine.ts  — Decoupled AudioContext for debounced sample preview, thumbnail generation
    hardwareIO.ts   — multi-channel hardware I/O enumeration, patchbay routing
    commandRegistry.ts — Centralized command registry, keyboard shortcut engine, Cmd+K palette
    universalAudio.ts — Singleton AudioContext, cross-platform mixdown, export to file (web + native)
  context/
    AuthContext.tsx    — Auth state context (session, user, loading, signOut)
  bridge/            — Desktop bridge (interface, electron, tauri stub, browser fallback, auto-detect)
  components/         — Design system (56 components, see table above)
  hooks/
    useUniversalAudio.ts — expo-audio wrapper with AudioContext resume

tests/
  components.test.tsx — Vitest component rendering + interaction tests (153 tests)
  components2.test.tsx — Vitest additional component tests (28 tests)
  components3.test.tsx — Vitest additional component tests (20 tests)
  screens.test.tsx  — Vitest screen-level tests (28 tests)
  lib.test.ts        — Vitest library function tests (66 tests)
  lib2.test.ts       — Vitest additional library tests (57 tests)
  lib3.test.ts       — Vitest additional library tests (77 tests)
  lib4.test.ts       — Vitest additional library tests (40 tests)
  lib5.test.ts       — Vitest universalAudio + hardwareIO tests (20 tests)
  responsive.test.ts — Vitest breakpoint & dimension tests (16 tests)
  types.test.ts      — Legacy node:test type structure tests (12 tests)
  presets.test.ts    — Legacy node:test preset count + structure tests (12 tests)

stories/              — Storybook stories for all 56 components (49 stories)
  *.stories.tsx       — Run: `npx storybook dev -p 6006`

.storybook/
  main.ts             — Vite + react-native-web alias
  preview.ts          — Dark theme, CSS import

backend/
  src/
    index.ts          — Express server entry (port 3001)
    routes/
      extract.ts      — POST /api/extract + GET /api/stems/:filename
      master.ts       — POST /api/master — master bounce processing
      presence.ts     — SSE presence endpoint (cursor broadcasting)
      collab.ts       — SSE collaboration endpoint (CRDT operation sync)
      generator.ts    — POST /api/generate — contextual MIDI generation
    services/
      demucs.ts       — Python Demucs subprocess (htdemucs, 4 stems)
      mock.ts         — Silent WAV fallback generator
      queue.ts        — In-memory job queue for async stem separation
    middleware/
      upload.ts       — Multer config (200MB, audio formats)
    types.ts          — Shared types

supabase/
  schema.sql          — DB tables: profiles, projects, tracks, stems, posts

Config:
  tailwind.config.js  — Design tokens (colors, spacing, fonts, radii)
  global.css          — Tailwind v3 directives + component layer
  babel.config.js     — Babel with expo preset + nativewind/babel + reanimated
  metro.config.js     — Metro with NativeWind + nativewind node_modules paths
  tsconfig.json       — Strict TS, @/ + @bridge path aliases
  .env.example        — Supabase env vars template
  docs/supabase.md    — Complete Supabase setup guide

electron/
  main.js             — Electron main process (BrowserWindow, IPC handlers, native menus)
  preload.js          — Context bridge exposing electronAPI methods to renderer
  package.json        — Electron + electron-builder deps
```

---

## Domain-Driven Agent Architecture

This project uses five specialized agents with strict domain boundaries to minimize context switching and prevent race conditions.

### A. UI & Rendering Agent
**Focus:** HTML5 Canvas, DOM, Timeline interactions, 60fps visual performance.
- Canvas-based waveform rendering and timeline zoom/scroll optimization
- Non-destructive visual editing (trimming/splitting regions)
- Pedalboard UI interactions and knob dragging
- Stripped of all audio math and state logic

### B. Audio Engine & DSP Agent
**Focus:** Web Audio API, AudioWorklets, WebAssembly, audio routing.
- Heavy DSP (distortion, delay, amp sims) in AudioWorklets
- Automatic delay compensation and phase alignment
- Track grouping, sub-mix bus routing, automation lane scheduling
- IndexedDB caching for heavy Impulse Response (IR) files
- Never touches UI thread — "headless" audio graph via MessagePort

### C. State & Collaboration Agent
**Focus:** Application state, multi-user synchronization, history.
- CRDTs (Conflict-free Replicated Data Types) for real-time project merging
- Infinite Undo/Redo history graph via Command Pattern
- WebSocket presence service (cursors, active users)
- Every action designed to be CRDT-compatible

### D. Media Processing & AI Agent
**Focus:** Asynchronous, CPU/GPU-intensive backend tasks.
- Decoupled queue for AI stem separation (Demucs/Spleeter)
- Pre-calculating waveform peak JSON data upon asset upload
- Audio normalization and orphaned file garbage collection

### E. Core Infrastructure & API Agent
**Focus:** Standard backend operations, database, storage.
- REST/GraphQL APIs, user authentication, database schema
- Object Storage (S3/R2) presigned URLs for fast audio uploads/downloads

### Inter-Agent Communication Patterns

1. **Headless Audio Engine:** UI Agent sends high-level commands via `MessagePort` (e.g., `AudioEngine.setParam('drive', 0.8)`). Never touches `AudioBuffer` directly.
2. **SharedArrayBuffer for Real-Time Sync:** Audio Engine writes playhead/VU positions to a shared buffer; UI Agent reads on animation frame — no message lag.
3. **Event-Driven Backend (Pub/Sub):** Media Processing Agent never called synchronously. Infrastructure Agent publishes events (e.g., `AssetUploaded`); Media Agent listens and triggers background work.
4. **Command Pattern + CRDT Integration:** Every action (e.g., `MoveRegionCommand`) has an inverse for Undo. State Agent broadcasts inverse operations to collaborators via WebSockets.
```
