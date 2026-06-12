# OpenBand

Open-source BandLab clone — a music production platform with multi-track DAW, stem separation, social feed, and cloud sync.

Built with **Expo Router**, **TypeScript**, **NativeWind v4 (Tailwind CSS v3)**, and **Supabase**. Runs on Web, Android, and iOS.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/) + [Expo Router](https://expo.github.io/router/) |
| Styling | [NativeWind v4](https://www.nativewind.dev/) + Tailwind CSS v3 |
| Language | TypeScript ~6.0 |
| Auth / DB | [Supabase](https://supabase.com/) (PostgreSQL + Auth) |
| Audio | [`expo-audio`](https://docs.expo.dev/versions/v56.0.0/sdk/audio/) (SDK 56) |
| Audio Processing | [Demucs](https://github.com/facebookresearch/demucs) (HTDEMUCS model) via Python subprocess |

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
```

## Features

### Studio (`app/studio/[id].tsx`)
Multi-track DAW with real-time audio playback via `expo-audio`:
- Per-track volume sliders, mute/solo toggles, and pan controls
- Waveform visualization using viewport-measured bar heights
- Playhead cursor with real-time position tracking
- Play/pause/seek transport controls
- BPM readout and time signature display

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

## Project Structure

```
openband/
├── app/
│   ├── _layout.tsx          # Root: SafeAreaProvider + AuthProvider + redirect
│   ├── (auth)/login.tsx     # Login screen
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigator (Feed, Biblioteca)
│   │   ├── index.tsx        # Global feed with audio playback
│   │   └── library.tsx      # Project library
│   ├── extractor.tsx        # Stem separation page
│   └── studio/[id].tsx      # DAW multi-track mixer
├── src/
│   ├── lib/supabase.ts      # Supabase client + mock fallback
│   ├── context/AuthContext.tsx
│   └── components/          # Design system (12 components)
│       ├── index.ts
│       ├── Button.tsx
│       ├── TextInput.tsx
│       ├── Card.tsx
│       ├── CardRow.tsx
│       ├── CardIcon.tsx
│       ├── Badge.tsx
│       ├── Avatar.tsx
│       ├── Divider.tsx
│       ├── Loading.tsx
│       ├── EmptyState.tsx
│       ├── ProgressBar.tsx
│       └── PageHeader.tsx
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
├── tsconfig.json
├── .env.example
├── AGENTS.md                # Agent workflow instructions
├── CLAUDE.md                # Points to AGENTS.md
└── docs/
    └── supabase.md          # Complete Supabase setup guide
```

## Design System

12 reusable components in `src/components/`:

| Component | Props |
|-----------|-------|
| `Button` | `title, onPress, variant(primary\|secondary\|ghost), loading, disabled, icon` |
| `TextInput` | `label, error, ...TextInputProps` |
| `Card` | `children, onPress, activeBorder, elevated` |
| `CardRow` | `children, onPress` |
| `CardIcon` | `icon: string` |
| `Badge` | `text, icon, variant(default\|play\|active)` |
| `Avatar` | `name, size(sm\|md\|lg)` |
| `Divider` | `label?, className?` |
| `Loading` | `message?, fullScreen?` |
| `EmptyState` | `icon, title, subtitle?, action?` |
| `ProgressBar` | `progress, className?` |
| `PageHeader` | `title, subtitle?` |

CSS utility classes (from `global.css`):
- `.card`, `.card-elevated`
- `.btn-primary`, `.btn-secondary`, `.btn-ghost`
- `.input-field`, `.input-field-focused`
- `.badge`, `.section-header`, `.label`

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

### POST /api/extract

- Content-Type: `multipart/form-data`
- Field: `file` (audio file, max 200 MB)
- Accepted formats: MP3, WAV, FLAC, M4A, OGG, AAC, WMA
- Response: `{ stems: { bass, drums, vocals, other }, taskId }`

## Scripts

```bash
npm start            # Start Expo dev server
npm run web          # Start web-only dev server
npm run build        # Production web export
npx tsc --noEmit     # TypeScript check
cd backend && npm run dev   # Backend dev server
```

## Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

No `.env` required for development — the app falls back to a mock auth client.
