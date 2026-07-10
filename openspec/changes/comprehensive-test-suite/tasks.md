# OpenSpec Tasks: Comprehensive Feature Test Suite

Step-by-step checklist for implementing the full feature test suite. Each task produces a new test file that must pass before moving to the next.

---

## Phase 1: Screen Tests (Round 1)

### Task 1: Login Screen Tests
- [ ] Create `tests/screens2.test.tsx` with mock setup for `supabase`, `AuthContext`, `useResponsive`
- [ ] **Login form rendering** — email field, password field, "Entrar" button visible
- [ ] **Signup toggle** — "Criar conta" switches to signup mode with name field
- [ ] **Login toggle back** — "Já tenho conta" switches back to login
- [ ] **Empty field validation** — Submit with empty fields shows error message
- [ ] **Password length validation** — Password <8 chars shows "mínimo 8 caracteres"
- [ ] **Password uppercase validation** — Password without uppercase shows error
- [ ] **Password digit validation** — Password without digit shows error
- [ ] **SignInWithPassword call** — Valid email/password triggers supabase auth
- [ ] **SignUp call** — Valid signup triggers supabase signUp
- [ ] **Loading state** — Loading indicator during auth request
- [ ] **Server error display** — Error message rendered from supabase response
- [ ] **Visitor entry** — "Entrar como visitante" button visible
- [ ] **Visitor auth call** — Visitor button calls signInAsVisitor
- [ ] **Error clears on mode toggle** — Switching login/signup clears error text

### Task 2: Feed Tab Tests
- [ ] Add `app/tabs/index.tsx` tests to `tests/screens2.test.tsx`
- [ ] **Render header** — "Feed" PageHeader rendered
- [ ] **Render 5 mock posts** — FlatList renders all 5 posts
- [ ] **Post metadata** — Each post shows title, artist, genre badge
- [ ] **Audio play** — Play button calls player.play() via expo-audio mock
- [ ] **Audio pause** — Pause button calls player.pause()
- [ ] **Play progress** — ProgressBar shows currentTime/duration ratio
- [ ] **Like toggle increment** — Like count +1 on heart press
- [ ] **Like toggle decrement** — Unlike returns to original count
- [ ] **Share button** — Share button present per post
- [ ] **NewProject dialog** — FAB triggers NewProject modal
- [ ] **Responsive layout** — Adapts width per LAYOUT_MAX_WIDTHS

### Task 3: Library Tab Tests
- [ ] Add `app/tabs/library.tsx` tests to `tests/screens2.test.tsx`
- [ ] **Render header** — "Biblioteca" PageHeader rendered
- [ ] **Filter tabs** — All 4 filter tabs visible (all/favorites/collabs/trash)
- [ ] **Default filter** — "all" tab active by default
- [ ] **Empty state** — EmptyState when no projects exist
- [ ] **NewProject dialog** — Button opens NewProject modal
- [ ] **Project cards from listProjectIndex** — Mock projects render as cards
- [ ] **Import button** — Calls OpenBandNative.showOpenDialog
- [ ] **Export per project** — Export button on each project card
- [ ] **Favorites toggle** — Star button toggles via toggleProjectFavorite
- [ ] **Filter switch** — Pressing "favorites" tab filters shown projects

### Task 4: Moments Tab Tests
- [ ] Add `app/tabs/moments.tsx` tests to `tests/screens2.test.tsx`
- [ ] **Render header** — "Momentos" PageHeader rendered
- [ ] **3 MomentCards** — Artist moments rendered with MomentCard
- [ ] **Artist info** — Name, handle, timeAgo displayed per card
- [ ] **Caption visible** — Song caption per moment card
- [ ] **Like toggle** — Heart button toggles liked state
- [ ] **Sample packs section** — "Sample Packs Gratuitos" rendered
- [ ] **Sample pack cards** — 3 sample pack cards visible
- [ ] **Download badge** — Badge with "Download" on each pack card
- [ ] **Responsive layout** — Adapts to breakpoints

---

## Phase 2: Root Layout & 3D Scenes

### Task 5: Root Layout Tests
- [ ] Create `tests/layout.test.tsx` for `app/_layout.tsx`
- [ ] **Provider nesting** — SafeAreaProvider > ThemeProvider > AuthProvider > AudioEngineProvider structure
- [ ] **Loading state** — Loading component shown during auth loading
- [ ] **Unauthenticated redirect** — No session + not in (auth) → redirect to /login
- [ ] **Authenticated redirect** — Session + in (auth) → redirect to /tabs
- [ ] **Auth screens accessible** — (auth) group without session renders login
- [ ] **Tabs with session** — Session present renders tabs
- [ ] **Web audio init** — Keydown/pointerdown triggers audioSystem.initialize()
- [ ] **Audio cleanup** — unmount calls disposeAllAudio
- [ ] **Stack screen route structure** — All routes registered (index, tabs, extractor, studio, mastering)

### Task 6: 3D Scene Tests
- [ ] Add to `tests/screens2.test.tsx` or create `tests/scenes.test.tsx`
- [ ] **live-room renders container** — Container div with LightControls
- [ ] **live-room uses red accent** — Accent color #ef4444
- [ ] **lofi-tape renders container** — Container div with LightControls
- [ ] **lofi-tape uses orange accent** — Accent color #ff5500
- [ ] **beatmaker renders container** — Container div with LightControls
- [ ] **beatmaker uses pink accent** — Accent color #ff0055
- [ ] **dj-stage renders container** — Container div with LightControls
- [ ] **dj-stage uses green accent** — Accent color #10b981
- [ ] **Three.js CDN fallback** — Scene degrades gracefully when CDN fails
- [ ] **LightControls integration** — Lighting intensity/color controls render

---

## Phase 3: DAW Studio Tests

### Task 7: Studio Rendering & Structure
- [ ] Create `tests/studio.test.tsx` with mocks for clockManager, busRouter, automationEngine, expo-audio, all 28+ child components
- [ ] **Transport controls** — Play/pause, stop, rewind, FF buttons visible
- [ ] **Time display** — Shows "00:00 / 00:00" initially
- [ ] **BPM display** — BPM value rendered
- [ ] **Track list** — At least one track row rendered
- [ ] **Bottom tab bar** — All 7 tabs visible (mixer, fx, mastering, groups, buses, mixes, chords)
- [ ] **Responsive sidebar** — Sidebar rendered when resp.isDesktop is true
- [ ] **Mobile hamburger** — ☰ button visible when resp.isDesktop is false

### Task 8: Studio Transport Controls
- [ ] **Play triggers playback** — ▶ button calls startPlayback or play()
- [ ] **Pause triggers pause** — ⏸ button calls pausePlayback or pause()
- [ ] **Stop resets to 0** — ⏹ sets currentTime to 0 and stops
- [ ] **Rewind seeks -5s** — ⏮ calls seekRelative(-5)
- [ ] **Fast forward seeks +5s** — ⏭ calls seekRelative(5)

### Task 9: Studio Track Operations
- [ ] **Add track** — "Add Track" button adds new track to state
- [ ] **Remove track** — Delete button removes track
- [ ] **Mute toggle** — Mute button toggles track mute state
- [ ] **Solo toggle** — Solo button toggles track solo state
- [ ] **Volume slider** — Volume change calls track update
- [ ] **Pan slider** — Pan change calls track update
- [ ] **Track color picker** — Color selection updates track color

### Task 10: Studio Bottom Tab Panels
- [ ] **Mixer tab** — LufsMeter + track faders render
- [ ] **FX tab** — PluginRack renders for active track
- [ ] **Mastering tab** — MiniMastering renders with EQ
- [ ] **Groups tab** — TrackGroupManager renders
- [ ] **Buses tab** — Bus list renders
- [ ] **Mixes tab** — MixManager renders
- [ ] **Chords tab** — ChordTrack renders

### Task 11: Studio Modal Overlays
- [ ] **Metronome** — Opens when metronome button pressed
- [ ] **RecordOptions** — Opens when record button pressed
- [ ] **BounceDialog** — Opens when export button pressed
- [ ] **SampleBrowser** — Opens when sample button pressed
- [ ] **PianoRoll** — Opens when MIDI/notes button pressed
- [ ] **Looper** — Opens when looper button pressed
- [ ] **Synth** — Opens when synth button pressed
- [ ] **Tuner** — Opens when tuner button pressed
- [ ] **CommandPalette** — Opens on Cmd+K

### Task 12: Studio Edge Cases
- [ ] **URL params parsed** — numBars, timeSignature, scratch parsed from searchParams
- [ ] **Auto-save triggers** — saveProject called on interval
- [ ] **AudioContext resume** — User interaction resumes suspended context
- [ ] **Clock tick** — onClockTick increments currentBeat
- [ ] **Empty project** — Studio renders with 0 tracks gracefully

---

## Phase 4: Untested Components

### Task 13: RightSidebar, OutputSelector, VoiceCommandButton
- [ ] Create `tests/components4.test.tsx`
- [ ] **RightSidebar** — Renders panel items, expand/collapse, close button, testID
- [ ] **OutputSelector** — Lists output options, selection fires onChange, testID
- [ ] **VoiceCommandButton** — Record start/stop, visual feedback, testID

### Task 14: MiniPlayer, QuickActions, QuickTools
- [ ] **MiniPlayer** — Play/pause, progress, close button, visible/hidden toggle, testID
- [ ] **QuickActions** — All action buttons render, each fires callback, testID
- [ ] **QuickTools** — Tool buttons render, selection fires onChange, testID

### Task 15: ProjectMenu, LightControls, TrapScene
- [ ] **ProjectMenu** — Save/export/share items, each fires callback, testID
- [ ] **LightControls** — Intensity slider, color picker, switches, testID
- [ ] **TrapScene** — 3D container renders, scene init, testID

### Task 16: VuMeter, TrackColorPicker
- [ ] **VuMeter** — Level display, color changes with value, clipping indicator, testID
- [ ] **TrackColorPicker** — Color swatches render, selection fires onColorChange, testID

---

## Phase 5: Library Module Deep Tests

### Task 17: Deep Behavioral Tests (Round 1)
- [ ] Create `tests/lib6.test.ts`
- [ ] **hardwareIO** — enumerateAudioDevices returns expected shape, setAudioOutputDevice, getCurrentOutputDevice, openHardwareInput returns null correctly, closeHardwareInput safe, getPatchbayState
- [ ] **wasmPluginHost** — Instantiate plugin, load wasm, send/receive JSON-RPC, process audio frame, dispose
- [ ] **yjsCRDT** — Create doc, apply insert/delete operations, merge conflicting edits, observe changes
- [ ] **collaboration** — Connect to room, broadcast operation, receive operation from peer, handle disconnect
- [ ] **timeStretch** — Stretch by 0.5x, 2.0x, preserve pitch, boundary rate (0.1x, 10x), handle empty buffer
- [ ] **openbandFormat** — Archive roundtrip (create → extract), CRC32 integrity check, malformed data handling

### Task 18: New Module Tests (Round 1)
- [ ] **midiParser** — Parse valid SMF, extract tempo/channel/notes, handle empty track, malformed MIDI
- [ ] **subtractiveSynth** — Create synth, set oscillator type (saw/square/sine/noise), set filter frequency/resonance, trigger note on/off, ADSR envelope
- [ ] **harmony** — Build chord from root + quality, detect key from note set, voice leading between chords
- [ ] **keyboard** — Register shortcut for "cmd+s", trigger callback, unregister, conflict detection
- [ ] **sceneLighting** — addSceneBulb returns light object, set intensity, set color

### Task 19: New Module Tests (Round 2)
- [ ] Create `tests/lib7.test.ts`
- [ ] **apiUrl** — API_BASE_URL default, override via __OPENBAND_API_URL, trailing slash handling
- [ ] **arrangement** — Create arrangement, add regions, reorder, remove, get duration
- [ ] **arrangementGenerator** — Generate from genre, respect numBars, create correct track count
- [ ] **audioNodeGraph** — Create node, connect source → destination, disconnect, cleanup
- [ ] **cloudSync** — Upload returns id, download returns data, conflict resolution strategy
- [ ] **flags** — Get flag (default), set flag, get flag (updated), unset flag
- [ ] **lazyDrumKit** — Trigger lazy load, return samples on demand, cache loaded samples

### Task 20: New Module Tests (Round 3)
- [ ] **midiLearn** — Enter learn mode, receive CC, create mapping, persist/recall mapping
- [ ] **pedalboardDsp** — Build chain, set pedal parameter, bypass pedal, remove pedal
- [ ] **presence** — SSE connection established, cursor broadcast, user join/leave event
- [ ] **projectEncryption** — Encrypt project data, decrypt with correct key, fail with wrong key
- [ ] **supabaseRemote** — Push project, pull project, asset dedup via hash, conflict resolution
- [ ] **timelineGestures** — Pinch-zoom delta, scroll distance, boundary clamping
- [ ] **videoExport** — Export frame sequence, format metadata, duration calculation
- [ ] **voiceCommands** — Parse "play track 1", confidence scoring, dispatch correct action
- [ ] **wasmInstrumentEngine** — Load instrument, note on with velocity, note off, polyphony limit

### Task 21: Edge Case & Boundary Tests
- [ ] Add edge cases to existing test files where applicable
- [ ] **BPM boundaries** — Metronome with BPM=1, BPM=999, BPM=0
- [ ] **Volume extremes** — Track volume at 0, 100, >100 clamped
- [ ] **MIDI note range** — Note numbers 0, 127, 128 clamped
- [ ] **Plugin params** — Min/max clamping across all 19 types
- [ ] **Automation** — Empty points list, single point, 1000 points, duplicate timestamps
- [ ] **Project length** — 0 bars, 999 bars
- [ ] **Sample rate** — 8000, 96000, 192000 in RecordOptions

---

## Phase 6: Verification

### Task 22: Run All Tests
- [ ] `npx tsc --noEmit` — TypeScript passes with zero errors
- [ ] `npx vitest run` — All Vitest tests pass (new + existing)
- [ ] `npm run test:legacy` — Legacy node:test suite passes
- [ ] `npm run build` — Production build succeeds

### Task 23: Code Review
- [ ] Run `code-review` subagent on all new test files
- [ ] Verify no unused imports, variables, or mocks
- [ ] Verify all tests follow existing patterns (describe/it/fireEvent/testID)
- [ ] Verify no source code was modified (tests only)
