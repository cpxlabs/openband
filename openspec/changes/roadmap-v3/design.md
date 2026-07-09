# Design: OpenBand V3 Roadmap

## Architecture Overview

### 1. Supabase Cloud Sync
- **State Integration**: Use `ProjectStore` to serialize the current React state (`tracks`, `buses`, `mastering`) into a JSON blob.
- **Database Schema**: 
  - `projects (id, user_id, title, state_json, updated_at)`
  - `assets (id, project_id, file_path)` (For recorded audio/samples)
- **Auth**: Supabase Auth (Email/GitHub) integrated into `app/(auth)/login.tsx`.

### 2. Audio Recording Engine
- **AudioWorklet**: Offload audio input processing to an `AudioWorkletProcessor` to avoid main-thread UI jank.
- **Buffer Management**: Stream Float32 chunks into memory, and draw waveforms using an off-screen canvas or SVG path updates.
- **Storage**: Convert recorded chunks to WAV blobs and save locally via bridge or IndexedDB for persistence.

### 3. MIDI & Sequencing Engine
- **Data Structure**: `MIDINote { start, duration, pitch, velocity }`.
- **UI**: Canvas-based piano roll for high-performance rendering of thousands of notes.
- **Synth**: Extend `midiSynth.ts` to support `.sf2` soundfonts or sampled WebAudio instruments.

### 4. Desktop Packaging
- **Tauri / Electron**: Wrap the Expo Web build inside a native shell.
- **Bridge API**: Implement `window.electronAPI.showOpenDialog`, `.readFile`, and `.writeFile` to replace web-based File/Blob fallbacks.

### 5. Internationalization (i18n)
- **Library**: Use `i18next` and `react-i18next` for robust translation management.
- **Dictionaries**: Store JSON dictionaries for `en`, `pt`, and `es`.
- **Context**: Create a Settings toggle to instantly switch app language context.
