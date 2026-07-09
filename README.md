# OpenBand

Open-source music production platform — multi-track DAW, guitar pedal board, amp/cab modeling, stem separation, social feed, and responsive web-first design.

Built with **Expo Router**, **TypeScript**, **NativeWind v4 (Tailwind CSS v3)**, and **Supabase**. Runs on Web, Android, iOS, and **Desktop (Electron)**.

## Stack

| Layer            | Technology                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Framework        | [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/) + [Expo Router](https://expo.github.io/router/) |
| Styling          | [NativeWind v4](https://www.nativewind.dev/) + Tailwind CSS v3                                         |
| Language         | TypeScript ~6.0                                                                                        |
| Auth / DB (dev)  | [SQLite](https://sqlite.org/) via `better-sqlite3` — zero-config local database                       |
| Auth / DB (prod) | [Supabase](https://supabase.com/) (PostgreSQL + Auth)                                                  |
| Audio            | [`expo-audio`](https://docs.expo.dev/versions/v56.0.0/sdk/audio/) (SDK 56) + HTML5 Audio (web)         |
| Audio Processing | [Demucs](https://github.com/facebookresearch/demucs) (HTDEMUCS model) via Python subprocess            |
| Desktop          | [Electron 35](https://www.electronjs.org/) with swappable bridge (`src/bridge/`)                       |
| 3D / WebGL       | [Three.js](https://threejs.org/) — Virtual Studio (Habbo-style)                                        |
| Backend          | FastAPI + Redis + Celery (Docker microservices, optional)                                              |
| Testing          | [Vitest](https://vitest.dev/) (505 tests with interactive dashboard) + [Playwright](https://playwright.dev/) (E2E) + legacy `node:test` (24 tests) |

## Getting Started

### Prerequisites

- Node.js >= 18
- Python 3.12 (optional, for stem separation)
- Expo CLI (`npx expo`)

### 1. Install frontend dependencies

```bash
npm install
```

### 2. (Optional) Install backend dependencies

```bash
cd backend
npm install
```

### 3. (Optional) Install Demucs for stem separation

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install demucs==4.0.1
```

If Demucs isn't installed, the backend falls back to mock WAV generation.

### 4. Configure database (SQLite by default)

The backend uses **SQLite** as the default development database — zero configuration needed:

```bash
cd backend
npm run dev
```

This auto-creates `backend/data/openband.sqlite` with the full schema on first run.

See **[docs/sqlite.md](docs/sqlite.md)** for SQLite management, inspection, and reset.

### 4b. (Optional) Configure Supabase for production

When ready to deploy with a real multi-user database:

```bash
cp backend/.env.example backend/.env
```

Fill in your Supabase credentials in `backend/.env` and set `DATABASE_MODE=supabase`.

Run `supabase/schema.sql` in your Supabase SQL editor.

See **[docs/supabase.md](docs/supabase.md)** for a complete setup guide.

### 5. Start the backend

```bash
cd backend
npm run dev
```

Server runs on `http://localhost:3001`.

### 6. Start the app

```bash
npm start        # Expo Go / web
npm run android  # Android
npm run ios      # iOS (macOS only)
npm run web      # Browser
npm run desktop  # Build web SPA then launch Electron desktop app
```

### 7. Desktop (Electron)

```bash
cd electron
npm install
cd ..
npm run desktop       # Build + launch
npm run desktop:dev   # Hot-reload dev (starts Expo + Electron concurrently)
```

The desktop app uses a **swappable bridge** (`src/bridge/`) — the frontend has zero knowledge of Electron. All native desktop I/O goes through `OpenBandNative` from `@bridge`. The same code runs in browser, Electron, or (future) Tauri without changes.

## Features

### Studio (`app/studio/[id].tsx`)

Multi-track DAW with real-time audio playback via `expo-audio`:

- Per-track volume sliders, mute/solo toggles, and pan controls
- Canvas-based waveform visualization with viewport culling devicePixelRatio
- Playhead cursor with real-time position tracking via rAF
- Play/pause/seek transport controls with pitch correction (±12 semitones)
- BPM readout, time signature display, metronome with count-in
- Audio recording via `useAudioRecorder` with direct monitoring (latencyMonitor)
- Piano roll MIDI note editor with snap, scale highlighting, note drag/resize/delete
- Sidechain routing per track (source selector + compressor sidechain filter)
- Looper with record/overdub/playback, 4 independent loop slots
- Chord track with 8 progression presets + Markov chain suggestions
- MIDI generation from chord progression via chordTrackState
- OneKnob Quick FX per track (19 knob types)
- Visual 8-band EQ on master with bypass and preset shapes
- AutoMix with 11 genre-based presets + track role classification
- Auto-pitch, noise gate, bass mono, stereo widener, reverb, delay, distortion plugins
- Pedalboard with 16 famous pedal presets + 20 amp + 10 cab models
- Mastering chain with 10 presets, 8-band EQ, compressor, limiter, LUFS
- Plugin rack per track + master bus (19 plugin types)
- Mix snapshot A/B comparison and save/load
- Sub-mix send buses (up to 20) with per-track send levels
- Track grouping with shared volume/mute
- Sample browser with 60+ curated samples and category filtering
- Sampler with velocity control (0-127), melodic mini-keyboard (C2-C4), transient slicing, stereo ADSR
- Synthesizer with 25 presets, 16-voice polyphony, 5-tab UI (OSC/FLT/ENV/LFO/ARP), 25-key piano
- CodeSampler token-based beat sequencer
- Command palette (Cmd+K) with 18 commands across Transport/Edit/Track/File/View/System
- Branch manager for CRDT fork/merge/diff
- Commit modal with push-to-cloud via supabaseRemote
- Undo/redo via useHistory (100-step, useReducer-based)
- Automation lanes per track with linear/exponential curves
- Bounce/export dialog (WAV/AIFF/FLAC, 16/24/32-bit, cross-platform)

### Stem Extraction (`app/extractor.tsx`)

3-phase separation pipeline:

1. **Select** — Pick an audio file or enter a URL
2. **Process** — Upload to backend for Demucs processing with progress feedback
3. **Results** — Play back 4 separated stems (bass, drums, vocals, other) with individual players

Backend (`POST /api/extract`):

- Accepts audio files (MP3, WAV, FLAC, M4A, OGG, AAC, WMA; up to 200 MB)
- Returns JSON with 4 stem URLs after processing

### Feed (`app/tabs/index.tsx`)

Global social feed of published projects:

- Audio cards with play/pause and progress bar
- Avatar, username, and post metadata
- Like, comment, and share action bar

### Library (`app/tabs/library.tsx`)

User's project collection:

- Project cards with gradient icons
- "Separar Stems" action button
- Empty state when no projects exist

### Authentication (`app/(auth)/login.tsx`)

- Email/password login via Supabase Auth
- Mock fallback: any email + any password works when Supabase env vars aren't set
- Session persistence via `expo-secure-store` (native) / `localStorage` (web)
- Visitor mode (anonymous exploration without sign-up)

### Settings (`app/tabs/settings.tsx`)

- Dark/light theme toggle
- Profile display, app version info
- Theme persisted via ThemeContext

### Feed (`app/tabs/moments.tsx`)

- Artist moments / social feed with audio previews
- Free sample pack store with 30+ curated samples
- One-tap sample import to new studio project

### Account (`app/tabs/account.tsx`)

- Display name editing with Supabase profile sync
- Sign-out with loading state
- Profile info (member since, location, bio)

### Bug-Fix Rounds (14 completed)

Ongoing hardening through periodic fix-and-verify cycles. Each round fixes verified bugs (stale closures, O(n²) maps, unused imports, missing error handlers, type gaps, CSP issues, stale state) and runs the full tsc + vitest + build suite before shipping.

**Round 10–13 — Previous code review sweeps (73 issues found and fixed):**

**Round 14 — Wire components + web player fix:**
- Wired CommandPalette with 18 commands (transport, edit, track, file, view, system)
- Wired BranchManager + CommitModal buttons in studio toolbar
- RecordOptions gets direct monitoring toggle via latencyMonitor
- Chord tab gets "Generate MIDI" button via chordTrackState
- universalAudio initialized in studio audio setup
- Fixed root calc for sharp/flat keys (used `[0]` which stripped accidentals)
- Fixed chord quality type cast (silent wrong voicings for min/7/sus4)
- Fixed useHistory impure nested setState → pure useReducer pattern
- Re-exported useHistory hook (was removed during semantic undo rewrite)
- Fixed web player autoplay policy block: remove eager AudioContext from mount effect, call ensureContext() synchronously in togglePlay before any await, try/catch around player.replace()/player.play()
- Added blob URL tracking (currentUrlRef) with cleanup on re-render/unmount

## Project Structure

```
openband/
├── app/
│   ├── _layout.tsx          # Root: SafeAreaProvider + AuthProvider + redirect
│   ├── (auth)/login.tsx     # Login screen
│   ├── tabs/
│   │   ├── _layout.tsx      # Tab navigator (Feed, Biblioteca, Momentos)
│   │   ├── index.tsx        # Global feed with audio playback
│   │   ├── library.tsx      # Project library
│   │   ├── moments.tsx      # Sample pack store / artist moments
│   │   ├── account.tsx      # Profile + sign-out
│   │   └── settings.tsx     # App settings
│   ├── extractor.tsx        # Stem separation page
│   ├── mastering/
│   │   └── index.tsx        # Mastering suite page (full chain)
│   └── studio/[id].tsx      # DAW multi-track mixer
├── src/
│   ├── lib/                 # Utilities: supabase, audio, midi, projectStore, etc.
│   ├── context/             # AuthContext, ThemeContext
│   ├── bridge/              # Desktop bridge (interface, Electron, Tauri stub, browser fallback)
│   │   ├── interface.ts     # NativeBridge contract
│   │   ├── electron.ts      # Electron impl → window.electronAPI
│   │   ├── tauri.ts         # Tauri stub for future migration
│   │   ├── browser.ts       # Browser fallback (localStorage, DOM APIs)
│   │   └── index.ts         # Auto-detect platform + re-export
│   └── components/          # Design system (51 components, see table below)
├── electron/
│   ├── main.js              # Electron main process (BrowserWindow, IPC, native menus)
│   ├── preload.js           # Context bridge (sandboxed electronAPI)
│   └── package.json         # Electron 35 + electron-builder 26
├── backend/
│   ├── src/
│   │   ├── index.ts         # Express server (port 3001)
│   │   ├── routes/extract.ts # POST /api/extract, GET /api/stems/:filename
│   │   ├── services/
│   │   │   ├── demucs.ts    # Python Demucs subprocess
│   │   │   └── mock.ts      # Silent WAV fallback
│   │   ├── middleware/upload.ts
│   │   └── types.ts
│   ├── .venv/               # Python venv with Demucs
│   └── package.json
├── supabase/
│   └── schema.sql           # DB schema (profiles, projects, tracks, stems, posts)
├── components/              # (global.css utilities: .card, .btn-primary, etc.)
├── global.css               # Tailwind directives + component layer
├── tailwind.config.js       # Design tokens
├── babel.config.js
├── metro.config.js
├── tsconfig.json            # Strict TS, @/ + @bridge path aliases
├── global.d.ts              # ElectronAPI window type declarations
├── .env.example
├── AGENTS.md                # Agent workflow instructions
├── CLAUDE.md                # Points to AGENTS.md
└── docs/
    ├── supabase.md          # Complete Supabase setup guide
    ├── features-analysis.md # Feature comparison vs BandLab/Cubasis
    ├── features-implementation.md # Implementation plan
    └── apk-build.md         # Android APK build guide
```

## Design System

56+ reusable components in `src/components/` (see `AGENTS.md` for full reference):

| Component                                                                           | Description                                                        |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Button`                                                                            | `variant: primary\|secondary\|ghost`, `loading`, `icon`            |
| `TextInput`                                                                         | Wraps RN TextInput with label + error                              |
| `Card` / `CardRow` / `CardIcon`                                                     | Dark surface containers, gradient icons                            |
| `Badge`                                                                             | `variant: default\|play\|active`, with optional icon               |
| `Avatar`                                                                            | `size: sm\|md\|lg`, displays initials                              |
| `Divider`                                                                           | Horizontal line with optional label                                |
| `Loading` / `EmptyState`                                                            | Spinner + message / centered empty state                           |
| `ProgressBar`                                                                       | 0–100 fill bar                                                     |
| `PageHeader` / `Sidebar`                                                            | Screen title + responsive drawer nav                               |
| `PedalRack` / `Tuner`                                                               | 6-slot pedalboard + chromatic tuner                                |
| `CodeSampler` / `PianoRoll` / `Looper`                                              | Token sequencer, MIDI editor, live loop recorder                   |
| `BounceDialog` / `MixManager`                                                       | Export dialog + A/B snapshot manager                               |
| `PluginRack` / `MasterRack` / `PluginEditor`                                        | Track/master plugin chains + full 19-type editor                   |
| `AutomationLane` / `WaveformCanvas`                                                 | Volume/param automation + canvas waveform viz with DPR, culling    |
| `VisualEQ` / `OneKnob` / `OneKnobProcessor`                                         | Visual equalizer + single-knob control (19 types)                  |
| `MiniMastering` / `LufsMeter`                                                       | Mastering chain presets + loudness meter                           |
| `MomentCard`                                                                        | Social feed post card                                              |
| `SampleBrowser` / `Sampler` / `Synth`                                               | Sample packs, audio player, synthesizer with 6 presets             |
| `Metronome` / `RecordOptions` / `NewProject`                                        | Click track, recording settings, project creator                   |
| `TrackGroupManager` / `ChordTrack`                                                  | Track grouping + chord progression timeline w/ Markov suggestions  |
| `MasteringSuite` / `MasteringChain` / `MasteringVersionManager` / `MasteringUpload` | Full mastering chain + A/B versioning + audio upload               |
| `PluginUI` / `BranchManager` / `Patchbay`                                           | Wasm plugin UI generator, git-like branch viewer, I/O patchbay    |
| `CommandPalette` / `CommitModal` / `VersionHistory`                                 | Cmd+K palette, commit/push modal, visual commit timeline           |

CSS utility classes (from `global.css`):

- `.card`, `.card-elevated` — containers
- `.btn-primary`, `.btn-secondary`, `.btn-ghost` — buttons
- `.input-field`, `.input-field-focused` — inputs
- `.badge`, `.section-header`, `.label` — text

## Audio API (expo-audio)

```ts
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

const player = useAudioPlayer(source); // source = require(...) | URL string
const status = useAudioPlayerStatus(player); // { playing, currentTime, duration, isLoaded }

player.play();
player.pause();
player.seekTo(seconds);
player.replace(newSource);
player.volume = 0.5; // 0.0 – 1.0
```

## Backend API

| Method | Endpoint                         | Description                                              |
| ------ | -------------------------------- | -------------------------------------------------------- |
| POST   | `/api/extract`                   | Upload audio file → returns stem URLs                    |
| GET    | `/api/stems/:filename`           | Download processed stem                                  |
| POST   | `/api/master/bounce`             | Upload audio → apply master processing → download result |
| GET    | `/api/master/download/:filename` | Download mastered audio file                             |

### POST /api/extract

- Content-Type: `multipart/form-data`
- Field: `file` (audio file, max 200 MB)
- Accepted formats: MP3, WAV, FLAC, M4A, OGG, AAC, WMA
- Response: `{ stems: { bass, drums, vocals, other }, taskId }`

## Scripts

```bash
npm start                 # Start Expo dev server
npm run web               # Start web-only dev server
npm run build             # Production web export (output: dist/)
npm run desktop           # Build + launch Electron desktop app
npm run desktop:dev       # Hot-reload dev (Expo + Electron concurrently)
npx tsc --noEmit          # TypeScript check
npx vitest run            # Run all component + lib tests (single run)
npx vitest --ui           # Open interactive test dashboard in browser (real-time)
npx vitest                # Run test suite in real-time watch mode
cd backend && npm run dev # Backend dev server (port 3001)

# Electron packaging (run from electron/ directory)
cd electron && npm run build:electron  # Package for current platform
cd electron && npm run build:linux     # Package Linux (AppImage + deb)
cd electron && npm run build:mac       # Package macOS (DMG)
cd electron && npm run build:win       # Package Windows (NSIS)
```

### Electron Desktop

**Development:**

```bash
cd electron
npm install
cd ..
npm run desktop:dev       # Hot-reload dev (Expo + Electron concurrently)
```

**Building distributable packages:**

```bash
# 1. Build the web export bundle first
npm run build

# 2. Package for your current platform
cd electron
npm run build:electron
```

The packaged output lands in `electron/out/`.

**Platform-specific builds:**

| Platform      | Command                      | Output format                      |
| ------------- | ---------------------------- | ---------------------------------- |
| **Linux**     | `npm run build:linux`        | AppImage + `.deb` (Debian/Ubuntu)  |
| **macOS**     | `npm run build:mac`          | `.dmg` installer                   |
| **Windows**   | `npm run build:win`          | NSIS `.exe` installer              |
| **All**       | `npm run build:electron`     | Current platform only              |

**Prerequisites per platform:**

| Platform    | Requirements                                                              |
| ----------- | ------------------------------------------------------------------------- |
| **Linux**   | `dpkg` (for `.deb`), `libfuse2` (for AppImage on some distros)            |
| **macOS**   | Xcode Command Line Tools, valid code signing identity (optional for dev)  |
| **Windows** | None — NSIS is bundled by electron-builder automatically                  |

**Cross-platform builds:**

To build for a different platform from your current machine, pass the `--` flag:

```bash
cd electron
npx electron-builder --linux --win   # Linux + Windows from any OS
npx electron-builder --mac           # macOS (macOS host required)
```

> **Note:** Cross-compiling macOS binaries requires a macOS host. Linux and Windows packages can be built from any platform.

Project files are persisted to `~/Documents/OpenBand/projects/` on desktop.

## Desktop Bridge

All native desktop capabilities go through a single swappable bridge:

```ts
import { OpenBandNative } from "@bridge";

// File dialogs
const file = await OpenBandNative.showOpenDialog({
  filters: [{ name: "Audio", extensions: ["wav", "mp3"] }],
});
await OpenBandNative.writeFile(path, data);

// Project persistence
await OpenBandNative.saveProject(id, JSON.stringify(project));
const data = await OpenBandNative.loadProject(id);
const projects = await OpenBandNative.listProjects();
```

The bridge auto-detects Electron, Tauri (future), or browser — swap the backend by replacing one file.

### Virtual Studio (`app/tabs/virtual-studio.tsx`)

3D "Habbo Hotel"-style collaborative studio environment:

- Three.js WebGL room with floor, walls, grid, and dynamic lighting
- 6 interactive furniture pieces (Mixer, Mastering, Tracks, Piano Roll, Looper, Sampler)
- WASD movement + right-click drag camera orbit + scroll zoom
- Click any furniture to open the corresponding tool
- Multi-user avatars synced via WebSocket (collaboration service)
- Each user has independent playback — no audio conflicts
- Glowing ring animations around furniture

### Docker Backend (`openband-backend/`)

Optional microservices backend for collaboration and AI features:

```bash
cd openband-backend
docker compose up --build
```

| Service | Port | Purpose |
|---------|------|---------|
| Redis | 6379 | Message broker + state cache |
| Collaboration | 8001 | WebSocket rooms for multi-user sync |
| AI Separation | 8002 | FastAPI + Celery for stem separation |
| Project Backup | 8003 | S3/R2 presigned URLs for cloud storage |

**The frontend works 100% offline** — the backend is optional for cloud features.

## Environment Variables

### Frontend (`.env` at project root)

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
EXPO_PUBLIC_API_URL=http://localhost:3001
```

No `.env` required for development — the app falls back to a mock auth client.

### Backend (`backend/.env`)

```env
DATABASE_MODE=sqlite              # sqlite (dev) or supabase (prod)
SQLITE_DB_PATH=data/openband.sqlite
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=your-google-client-id
PORT=3001
```

See **[docs/sqlite.md](docs/sqlite.md)** for full database configuration details.
