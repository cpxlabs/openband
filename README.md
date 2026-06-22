# OpenBand

Open-source music production platform — multi-track DAW, guitar pedal board, amp/cab modeling, stem separation, social feed, and responsive web-first design.

Built with **Expo Router**, **TypeScript**, **NativeWind v4 (Tailwind CSS v3)**, and **Supabase**. Runs on Web, Android, iOS, and **Desktop (Electron)**.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/) + [Expo Router](https://expo.github.io/router/) |
| Styling | [NativeWind v4](https://www.nativewind.dev/) + Tailwind CSS v3 |
| Language | TypeScript ~6.0 |
| Auth / DB | [Supabase](https://supabase.com/) (PostgreSQL + Auth) |
| Audio | [`expo-audio`](https://docs.expo.dev/versions/v56.0.0/sdk/audio/) (SDK 56) |
| Audio Processing | [Demucs](https://github.com/facebookresearch/demucs) (HTDEMUCS model) via Python subprocess |
| Desktop | [Electron 35](https://www.electronjs.org/) with swappable bridge (`src/bridge/`) |
| Testing | [Vitest](https://vitest.dev/) (173 tests) + legacy `node:test` (39 tests) |

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

### 4. Configure Supabase

Copy `.env.example` to `.env` and fill in your project credentials:

```bash
cp .env.example .env
```

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
- Waveform visualization using viewport-measured bar heights
- Playhead cursor with real-time position tracking
- Play/pause/seek transport controls
- BPM readout and time signature display
- Audio recording via `useAudioRecorder` with configurable quality/sample rate
- Piano roll MIDI note editor with snap, scale highlighting, note drag/resize/delete
- Sidechain routing per track (source selector + compressor sidechain filter)
- Looper with record/overdub/playback, 4 loop slots

### Stem Extraction (`app/extractor.tsx`)
3-phase separation pipeline:
1. **Select** — Pick an audio file or enter a URL
2. **Process** — Upload to backend for Demucs processing with progress feedback
3. **Results** — Play back 4 separated stems (bass, drums, vocals, other) with individual players

Backend (`POST /api/extract`):
- Accepts audio files (MP3, WAV, FLAC, M4A, OGG, AAC, WMA; up to 200 MB)
- Returns JSON with 4 stem URLs after processing

### Feed (`app/(tabs)/index.tsx`)
Global social feed of published projects:
- Audio cards with play/pause and progress bar
- Avatar, username, and post metadata
- Like, comment, and share action bar

### Library (`app/(tabs)/library.tsx`)
User's project collection:
- Project cards with gradient icons
- "Separar Stems" action button
- Empty state when no projects exist

### Authentication (`app/(auth)/login.tsx`)
- Email/password login via Supabase Auth
- Mock fallback: any email + any password works when Supabase env vars aren't set
- Session persistence via `expo-secure-store` (native) / `localStorage` (web)
- Visitor mode (anonymous exploration without sign-up)

### Settings (`app/(tabs)/settings.tsx`)
- Dark/light theme toggle
- Profile display, app version info
- Theme persisted via ThemeContext

### Feed (`app/(tabs)/moments.tsx`)
- Artist moments / social feed with audio previews
- Free sample pack store with 30+ curated samples
- One-tap sample import to new studio project

### Account (`app/(tabs)/account.tsx`)
- Display name editing with Supabase profile sync
- Sign-out with loading state
- Profile info (member since, location, bio)

## Project Structure

```
openband/
├── app/
│   ├── _layout.tsx          # Root: SafeAreaProvider + AuthProvider + redirect
│   ├── (auth)/login.tsx     # Login screen
│   ├── (tabs)/
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
│   └── components/          # Design system (38 components, see table below)
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

38 reusable components in `src/components/` (see `AGENTS.md` for full reference):

| Component | Description |
|-----------|-------------|
| `Button` | `variant: primary\|secondary\|ghost`, `loading`, `icon` |
| `TextInput` | Wraps RN TextInput with label + error |
| `Card` / `CardRow` / `CardIcon` | Dark surface containers, gradient icons |
| `Badge` | `variant: default\|play\|active`, with optional icon |
| `Avatar` | `size: sm\|md\|lg`, displays initials |
| `Divider` | Horizontal line with optional label |
| `Loading` / `EmptyState` | Spinner + message / centered empty state |
| `ProgressBar` | 0–100 fill bar |
| `PageHeader` / `Sidebar` | Screen title + responsive drawer nav |
| `PedalRack` / `Tuner` | 6-slot pedalboard + chromatic tuner |
| `CodeSampler` / `PianoRoll` / `Looper` | Token sequencer, MIDI editor, live loop recorder |
| `BounceDialog` / `MixManager` | Export dialog + A/B snapshot manager |
| `PluginRack` / `MasterRack` / `PluginEditor` | Track/master plugin chains + full 19-type editor |
| `AutomationLane` / `WaveformClip` | Volume/param automation + audio waveform viz |
| `VisualEQ` / `OneKnob` | Visual equalizer + single-knob control (19 types) |
| `MiniMastering` / `LufsMeter` | Mastering chain presets + loudness meter |
| `MomentCard` | Social feed post card |
| `SampleBrowser` / `Sampler` / `Synth` | Sample packs, audio player, synthesizer |
| `Metronome` / `RecordOptions` / `NewProject` | Click track, recording settings, project creator |
| `TrackGroupManager` / `SampleBrowser` | Track grouping + sample library |
| `MasteringSuite` / `MasteringChain` / `MasteringVersionManager` / `MasteringUpload` | Full mastering chain + A/B versioning + audio upload |

CSS utility classes (from `global.css`):
- `.card`, `.card-elevated` — containers
- `.btn-primary`, `.btn-secondary`, `.btn-ghost` — buttons
- `.input-field`, `.input-field-focused` — inputs
- `.badge`, `.section-header`, `.label` — text

## Audio API (expo-audio)

```ts
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

const player = useAudioPlayer(source);          // source = require(...) | URL string
const status = useAudioPlayerStatus(player);     // { playing, currentTime, duration, isLoaded }

player.play();
player.pause();
player.seekTo(seconds);
player.replace(newSource);
player.volume = 0.5;                            // 0.0 – 1.0
```

## Backend API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/extract` | Upload audio file → returns stem URLs |
| GET | `/api/stems/:filename` | Download processed stem |
| POST | `/api/master/bounce` | Upload audio → apply master processing → download result |
| GET | `/api/master/download/:filename` | Download mastered audio file |

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
npx vitest run            # Run 173 component + lib tests
cd backend && npm run dev # Backend dev server (port 3001)
```

### Electron Desktop

```bash
cd electron
npm install
npm run start             # Launch Electron (loads dist/ or dev server)
npm run build:linux       # Package Linux AppImage / deb
npm run build:mac         # Package macOS DMG
npm run build:win         # Package Windows NSIS installer
```

Project files are persisted to `~/Documents/OpenBand/projects/` on desktop.

## Desktop Bridge

All native desktop capabilities go through a single swappable bridge:

```ts
import { OpenBandNative } from '@bridge';

// File dialogs
const file = await OpenBandNative.showOpenDialog({
  filters: [{ name: 'Audio', extensions: ['wav', 'mp3'] }],
});
await OpenBandNative.writeFile(path, data);

// Project persistence
await OpenBandNative.saveProject(id, JSON.stringify(project));
const data = await OpenBandNative.loadProject(id);
const projects = await OpenBandNative.listProjects();
```

The bridge auto-detects Electron, Tauri (future), or browser — swap the backend by replacing one file.

## Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

No `.env` required for development — the app falls back to a mock auth client.
