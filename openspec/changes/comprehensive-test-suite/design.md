# OpenSpec Design: Comprehensive Feature Test Suite

This document defines the test plan, file organization, and coverage targets for every untested feature in the application.

---

## 1. Test File Organization

New test files will follow the existing naming convention under `tests/`:

| File | Target |
|------|--------|
| `tests/screens2.test.tsx` | Remaining app screens (login, library, feed, moments, layout, 3D scenes) |
| `tests/studio.test.tsx` | `app/studio/[id].tsx` (DAW Studio — largest screen, isolated file) |
| `tests/components4.test.tsx` | Untested components (RightSidebar, OutputSelector, VoiceCommandButton, MiniPlayer, QuickActions, QuickTools, ProjectMenu, LightControls, VuMeter, TrackColorPicker, TrapScene) |
| `tests/lib6.test.ts` | Untested/mostly-untested lib modules (deep tests) |
| `tests/lib7.test.ts` | Additional lib edge cases and integration tests |
| `tests/e2e-scenarios.test.ts` | Cross-module integration scenarios (optional) |

**Total:** up to 6 new test files, ~500–800 new tests.

---

## 2. Screen-Level Test Plan

### 2.1. `app/(auth)/login.tsx` — Login Screen
| Test | Description |
|------|-------------|
| Renders login form | Email + password fields visible, "Entrar" button present |
| Toggles to signup | Press "Criar conta" shows name field, "Criar Conta" button |
| Toggles back to login | Press "Já tenho conta" returns to login form |
| Validates empty fields | Shows error when submitting with empty email/password |
| Validates password length | Shows error for <8 char password |
| Validates password uppercase | Shows error for password without uppercase letter |
| Validates password digit | Shows error for password without digit |
| Calls signInWithPassword on login | Valid email/password triggers supabase auth |
| Calls signUp on signup | Valid signup triggers supabase signUp |
| Shows loading state | Loading indicator while auth request in flight |
| Shows error from server | Displays error message returned by supabase |
| Renders visitor entry | "Entrar como visitante" button visible |
| Calls signInAsVisitor on visitor press | Visitor button triggers visitor auth |
| Responsive layout | Renders within LAYOUT_MAX_WIDTHS constraint |
| Clears error on mode switch | Error clears when toggling login/signup |

### 2.2. `app/tabs/index.tsx` — Feed Tab (704 lines)
| Test | Description |
|------|-------------|
| Renders PageHeader | "Feed" header rendered |
| Renders post list | FlatList renders 5 mock posts |
| Renders audio player | Play/pause button for each post |
| Plays audio preview | Press play calls player.play() |
| Pauses audio preview | Press pause calls player.pause() |
| Tracks play progress | ProgressBar renders with correct progress |
| Shows like button | Like button renders per post |
| Toggles like state | Like count increments on press |
| Shows share button | Share button renders per post |
| Shows comment section placeholder | Comment button present |
| Opens NewProject dialog | FAB or button triggers NewProject modal |
| Handles empty state | Empty message when no posts loaded |
| Responsive layout | Adapts to mobile/tablet/desktop breakpoints |

### 2.3. `app/tabs/library.tsx` — Library Tab
| Test | Description |
|------|-------------|
| Renders PageHeader | "Biblioteca" header rendered |
| Shows filter tabs | All/favorites/collabs/trash tabs rendered |
| Defaults to "all" filter | All projects shown initially |
| Switches to favorites | Only favorite projects shown after filter change |
| Shows empty state for no projects | EmptyState rendered when no projects |
| Shows NewProject dialog | "Novo Projeto" button opens NewProject modal |
| Creates project via handleCreate | NewProject onCreate triggers navigation to studio |
| Shows project cards | Existing project cards rendered from listProjectIndex |
| Handles import button | Import triggers OpenBandNative.showOpenDialog |
| Handles export button | Export triggers on each project |
| Shows project menu | ProjectMenu on long-press per card |
| Favorites toggle | Star button toggles favorite state |
| Responsive layout | Adapts to breakpoints |

### 2.4. `app/tabs/moments.tsx` — Moments Tab
| Test | Description |
|------|-------------|
| Renders PageHeader | "Momentos" header rendered |
| Shows artist moments | 3 MomentCard components rendered |
| Artist info displayed | Name, handle, time ago per card |
| Caption rendered | Song caption displayed per card |
| Like toggle works | Heart button toggles liked state |
| Shows sample packs section | "Sample Packs Gratuitos" section rendered |
| Sample pack cards rendered | 3 sample pack cards visible |
| Shows badge for each pack | Badge with "Download" label per pack |
| Responsive layout | Adapts to breakpoints |

### 2.5. `app/_layout.tsx` — Root Layout
| Test | Description |
|------|-------------|
| Renders providers | SafeAreaProvider + ThemeProvider + AuthProvider + AudioEngineProvider present |
| Shows loading state | Loading component during auth load |
| Redirects unauthenticated to /login | Segments not in (auth) and no session → redirect |
| Redirects authenticated to /tabs | Has session and in (auth) → redirect |
| Allows auth screens without session | (auth) group accessible without session |
| Allows tabs with session | Session present, tabs accessible |
| Initializes audio system on web | Keydown/pointerdown triggers audioSystem.initialize() |
| Cleans up audio on unmount | disposeAllAudio called on unmount |

### 2.6. 3D Scene Screens (live-room, lofi-tape, beatmaker, dj-stage)
| Test | Description |
|------|-------------|
| Renders container div | Scene container div present |
| Shows LightControls component | LightControls rendered in all 3D scenes |
| Uses correct accent color | Each scene uses its unique accent color |
| Initializes Three.js | Three.js imported and scene created |
| Handles CDN load failure | Graceful fallback when Three.js CDN unavailable |

### 2.7. Standalone Screens (explorer, virtual-studio)
| Test | Description |
|------|-------------|
| Renders without crashing | Screen mounts without error |
| Renders correct header | PageHeader with correct title |
| Passes props correctly | Wraps child component with expected props |

---

## 3. DAW Studio Test Plan (`app/studio/[id].tsx`)

The studio screen (2,813 lines) is the most complex. Tests will focus on rendering, state transitions, and key interactions rather than full audio integration.

### 3.1. Rendering & Structure
| Test | Description |
|------|-------------|
| Renders transport controls | Play/pause, stop, rewind, FF buttons visible |
| Renders time display | Current time / duration shows `00:00 / 00:00` |
| Renders BPM display | BPM value visible |
| Renders track list | At least one track row renders |
| Renders bottom tab bar | Mixer, FX, Mastering, Groups etc. tabs visible |
| Renders sidebar on desktop | Sidebar rendered when resp.isDesktop |
| Shows hamburger on mobile | ☰ button visible when not desktop |

### 3.2. Transport Controls
| Test | Description |
|------|-------------|
| Play button calls startPlayback | Pressing ▶ triggers play |
| Pause button calls pausePlayback | Pressing ⏸ triggers pause |
| Stop button seeks to 0 | Pressing ⏹ resets currentTime to 0 |
| Rewind seeks -5s | Pressing ⏮ calls seekRelative(-5) |
| FF seeks +5s | Pressing ⏭ calls seekRelative(5) |

### 3.3. Track Operations
| Test | Description |
|------|-------------|
| Adds new track | "Add Track" button creates a new track |
| Removes track | Delete button removes a track |
| Mutes track | Mute button toggles mute state |
| Solos track | Solo button toggles solo state |
| Adjusts volume | Volume slider changes track volume |
| Adjusts pan | Pan slider changes track pan |
| Selects track color | TrackColorPicker changes track color |

### 3.4. Bottom Tab Panels
| Test | Description |
|------|-------------|
| Mixer tab shows LufsMeter | Mixer tab contains LUFS meter |
| FX tab shows PluginRack | FX tab renders plugin rack for selected track |
| Mastering tab shows MiniMastering | Mastering tab contains MiniMastering |
| Groups tab shows TrackGroupManager | Groups tab renders group manager |
| Buses tab shows bus list | Buses tab shows send buses |
| Mixes tab shows MixManager | Mixes tab renders mix manager |
| Chords tab shows ChordTrack | Chords tab renders chord track |

### 3.5. Modal Overlays
| Test | Description |
|------|-------------|
| Opens Metronome settings | Metronome button opens metronome panel |
| Opens RecordOptions | Record button opens recording options |
| Opens BounceDialog | Export button opens bounce dialog |
| Opens SampleBrowser | Sample button opens sample browser |
| Opens PianoRoll | MIDI button opens piano roll |
| Opens Looper | Looper button opens looper |
| Opens Synth | Synth button opens synthesizer |
| Opens Tuner | Tuner button opens tuner |
| Opens CommandPalette | Cmd+K opens command palette |

### 3.6. Integration & Edge Cases
| Test | Description |
|------|-------------|
| Loads project from URL params | Parses numBars, timeSignature, scratch from searchParams |
| Saves project on interval | Auto-save triggers periodically |
| Handles audio context resume | User interaction resumes suspended AudioContext |
| Clock tick updates beat position | clockManager tick increments currentBeat |
| Automation rerender on playback | Automation lanes update during play |

---

## 4. Component Test Plan (Untested Components)

### 4.1. Each untested component gets:
| Test Pattern | Count |
|-------------|-------|
| Renders without crashing | 1 |
| Renders with required props | 1 |
| Renders with optional props | 1 |
| Fires callbacks on interaction | 2 |
| Updates state on interaction | 1 |
| Renders testID correctly | 1 |
| Handles null/undefined props gracefully | 1 |
| **Total per component** | **8** |

### 4.2. Component-specific tests:

| Component | Special Tests |
|-----------|---------------|
| `RightSidebar` | Renders panel items, expand/collapse, close button |
| `OutputSelector` | Lists output devices, selection triggers onChange |
| `VoiceCommandButton` | Record start/stop, visual feedback |
| `MiniPlayer` | Play/pause, progress display, close button |
| `QuickActions` | All action buttons render, each fires correct callback |
| `QuickTools` | Tool buttons render, tool selection fires onChange |
| `ProjectMenu` | Menu items (save/export/share), each fires callback |
| `LightControls` | Intensity/brightness sliders, color picker |
| `VuMeter` | Level display updates with value prop |
| `TrackColorPicker` | Color swatches render, selection fires callback |
| `TrapScene` | 3D scene container, Three.js initialization |

---

## 5. Library Module Test Plan

### 5.1. Deep behavioral tests for shallowly-tested modules

| Module | Current Depth | Target Depth | New Tests |
|--------|--------------|--------------|-----------|
| `hardwareIO` | Exports only | Full | enumerate devices, get/set output, open/close input, patchbay state |
| `wasmPluginHost` | Exports only | Full | load plugin, process audio, param get/set, dispose |
| `yjsCRDT` | Exports only | Full | create doc, apply operations, sync, merge conflicts |
| `collaboration` | Exports only | Full | connect/disconnect, send/receive ops, presence events |
| `timeStretch` | Exports only | Full | stretch audio, preserve pitch, boundary rates |
| `openbandFormat` | Shallow | Full | create archive, extract archive, CRC32 validation, integrity check |

### 5.2. New module coverage

| Module | Key Tests |
|--------|-----------|
| `apiUrl.ts` | API_BASE_URL resolution, override via env |
| `arrangement.ts` | Track arrangement ordering, region manipulation |
| `arrangementGenerator.ts` | Generate arrangement from genre/mood |
| `audioNodeGraph.ts` | Node creation, connection, disconnection, cleanup |
| `cloudSync.ts` | Upload/download project, conflict resolution |
| `crashRecovery.ts` | Auto-save detection, recovery state restoration |
| `flags.ts` | Feature flag get/set, default values, override |
| `harmony.ts` | Chord construction, key detection, voice leading |
| `keyboard.ts` | Shortcut registration, key combos, conflict detection |
| `latencyMonitor.ts` | Measure/record latency, threshold alerts |
| `lazyDrumKit.ts` | Lazy load drum samples, playback triggers |
| `midiLearn.ts` | MIDI CC mapping, learn mode toggle, persist mappings |
| `midiParser.ts` | Parse SMF, extract tracks/notes, time division |
| `pedalboardDsp.ts` | DSP chain building, pedal parameter modulation |
| `presence.ts` | SSE connection, cursor broadcasting, user join/leave |
| `projectEncryption.ts` | Encrypt/decrypt project, key management |
| `sceneLighting.ts` | Light creation, color temperature, intensity |
| `subtractiveSynth.ts` | Oscillator types, filter modes, ADSR envelope |
| `supabase.ts` | Client init, mock fallback behavior, session handling |
| `supabaseRemote.ts` | Push/pull project, asset dedup, conflict resolution |
| `timelineGestures.ts` | Pinch-zoom delta calculation, scroll boundaries |
| `videoExport.ts` | Export video from timeline, format options |
| `voiceCommands.ts` | Command parsing, confidence scoring, action dispatch |
| `wasmInstrumentEngine.ts` | Instrument loading, MIDI note on/off, polyphony |

---

## 6. Edge Case & Cross-Cutting Tests

### 6.1. Boundary values
| Module | Boundary Tests |
|--------|---------------|
| BPM ranges | 1, 999, negative, 0 (Metronome, clockManager) |
| Volume extremes | -inf, +12dB, mute (mixer, tracks) |
| MIDI note range | C-1 (0), G9 (127), out-of-range |
| Plugin parameters | Min/max/step validation across 19 plugin types |
| Track count | 0, 1, 64 (max), overflow |
| Automation points | 0, 1, 1000, duplicate timestamps |
| Project length | 1 bar, 999 bars, 0 bars |
| Sample rates | 8000, 96000, 192000, unsupported |

### 6.2. Error handling
| Scenario | Expected Behavior |
|----------|------------------|
| Network failure on supabase call | Graceful error message shown |
| Invalid project file on import | Error toast + no-op |
| Web Audio API unavailable | Feature degrades gracefully |
| AudioContext in suspended state | Resumed on user interaction |
| MIDI file with no tracks | Empty track created gracefully |
| Demucs (stem separation) unavailable | Mock fallback generates silent WAVs |
| File exceeds size limit | Error message, prevented upload |

### 6.3. Platform-specific
| Platform | Tests |
|----------|-------|
| Web | AudioContext autoplay policy, blob URL lifecycle, localStorage persistence |
| Native (mock) | expo-audio player lifecycle, Platform.OS branching |
| Electron (mock) | OpenBandNative IPC calls, native file dialogs |
| No .env (mock Supabase) | Mock fallback active, visitor mode by default |

---

## 7. Legacy Test Preservation

The node:test suite (`tests/presets.test.ts`, `tests/types.test.ts`) must continue passing after all changes:
- New tests must not modify any source code that affects preset counts or type structures
- If preset/type counts change as part of other tasks, `presets.test.ts` and `types.test.ts` must be updated in lockstep
