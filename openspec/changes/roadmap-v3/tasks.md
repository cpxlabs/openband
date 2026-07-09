# Tasks: OpenBand V3 Roadmap

## Milestone 1: Cloud Sync (Supabase)
- [x] Connect Supabase client in `src/lib/supabase.ts` with real credentials.
- [x] Implement `Save to Cloud` logic in `ProjectMenu.tsx` (serializes state and pushes to DB).
- [x] Implement `Load from Cloud` logic in the `Library` tab.
- [x] Verify Auth flow.

## Milestone 2: Audio Recording
- [x] Create `RecordingWorklet.ts` for low-latency capture.
- [x] Integrate `navigator.mediaDevices` inside `universalAudio.ts`.
- [x] Add "Arm" button to Track Header in `app/studio/[id].tsx`.
- [x] Implement Live Waveform visualizer.
- [x] Convert captured buffers to `.wav` and add to project regions.tate.

## Milestone 3: Advanced MIDI
- [ ] Rewrite `PianoRoll.tsx` to support Drag-to-Resize notes and Velocity.
- [ ] Add "Snap to Grid" toggle in the UI (1/4, 1/8, 1/16 notes).
- [ ] Integrate a SoundFont parser for better instrument sounds.

## Milestone 4: Desktop Build
- [ ] Initialize Tauri or Electron project wrapper.
- [ ] Implement Node `fs` and dialog native methods in `src/bridge/electron.ts` or `tauri.ts`.
- [ ] Compile and verify the Desktop App bundle.

## Milestone 5: Internationalization (i18n)
- [ ] Install `i18next` and `react-i18next` packages.
- [ ] Create translation files for English (`en.json`), Portuguese (`pt.json`), and Spanish (`es.json`).
- [ ] Wrap the app root with `I18nextProvider`.
- [ ] Refactor UI components to use the `useTranslation` hook instead of hardcoded strings.
