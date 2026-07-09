# OpenSpec: System Architecture Specification

This document serves as the Source of Truth for the high-level architecture of the OpenBand project.

---

## 1. Project Directory Structure

```text
openband/
├── app/                  # Expo Router navigation screens
│   ├── (auth)/           # Authentication group
│   ├── tabs/             # Primary app tabs (Feed, Library, Moments, etc.)
│   ├── studio/[id].tsx   # Multi-track DAW Studio workspace
│   └── mastering/        # Mastering Suite
├── src/                  # Core frontend business logic & components
│   ├── components/       # Design System UI components
│   ├── lib/              # Audio engine, parser, responsive helper, store, automation
│   ├── context/          # Global React context (Auth, Theme)
│   └── bridge/           # Desktop native bridge (Electron, stub, browser fallback)
├── electron/             # Desktop packaging wrapper (Electron 35)
├── backend/              # Node/Express backend server for stem separation (port 3001)
├── docs/                 # General documentation & changelogs
└── openspec/             # OpenSpec SDD workflow directory
```

---

## 2. Technology Stack

- **Framework**: Expo SDK 56 + Expo Router (Static SPA Single-Page Export).
- **Styling**: NativeWind v4 (Tailwind CSS v3) + CSS variable variables in `global.css`.
- **Database/Auth**: Local zero-config SQLite (`better-sqlite3`) in development, Supabase (PostgreSQL) in production.
- **Audio Engine**: `expo-audio` + Web Audio API (`UniversalAudioSystem` + lazy AudioContext resume).
- **Desktop Wrapper**: Electron 35 utilizing contextBridge (`preload.js`) and IPC menus/dialogs.

---

## 3. Desktop Bridge Architecture

To keep the frontend decoupled from Electron or Tauri, all native I/O (file open/save, file systems, dialogues) goes through a unified bridge at `src/bridge/`:
1. `interface.ts`: Defines the `NativeBridge` interface.
2. `electron.ts`: Preloads `window.electronAPI`.
3. `tauri.ts`: Stub for future cross-compilation.
4. `browser.ts`: Standard browser fallback using local storage and download Blobs.
5. `index.ts`: Auto-detects the host platform and exports the appropriate bridge implementation.

**Standard Rule:** Frontend code must *never* reference `require('fs')`, Electron APIs, or Tauri APIs directly. Always use `import { OpenBandNative } from "@bridge"`.
