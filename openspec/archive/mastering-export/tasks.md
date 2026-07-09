# Tasks: Mastering Suite Audio Export Polish

## Checklist

### Phase 1: Dependency Setup (Pending Approval)
- [x] Install `lamejs` via npm (`npm install lamejs`) + `@types/lamejs`.
- [x] If `lamejs` is denied, update the UI to remove MP3 or switch to a backend API call.

### Phase 2: Implementation
- [x] **`src/lib/universalAudio.ts`**:
  - [x] Extract `audioBufferToWavBlob` (if it doesn't already fully support 16/24 bit cleanly).
  - [x] Implement `audioBufferToMp3Blob` using `lamejs`.
- [x] **`src/components/MasteringSuite.tsx`**:
  - [x] Update `handleExport` to call the correct Blob generator based on `exportFormat`.
  - [x] Ensure correct file extension (`.mp3` vs `.wav`) is passed to `OpenBandNative.showSaveDialog`.
- [x] **`app/studio/[id].tsx`**:
  - [x] Wrap the center tool buttons in a `ScrollView` with `horizontal` and `showsHorizontalScrollIndicator={false}`.
  - [x] Ensure the right-side controls (Save, Export, Rate, Pitch) don't overlap by allowing the header to flex properly.
  - [x] Connect the Mixer bottom tab to properly control track `muted` and `solo` toggles.
  - [x] Connect the Mixer bottom tab to properly control track volume and pan sliders.

### Phase 3: Testing & Verification
- [x] Create `tests/audioExport.test.ts` for WAV and MP3 export.
- [x] Create `tests/mixer.test.ts` to verify track solo/mute/volume state updates correctly.
- [x] Run `npx vitest run` to verify.
- [x] Run `npx tsc --noEmit` to verify typings.
