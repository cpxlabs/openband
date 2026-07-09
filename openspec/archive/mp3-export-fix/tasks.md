# Tasks: MP3 Export Crash Fix

- [x] Rename `audioBufferToMp3Blob` to `audioBufferToMp3BlobAsync` and make it async in `src/lib/audio.ts`.
- [x] Add `await new Promise(resolve => setTimeout(resolve, 0))` inside the encoding loop in `src/lib/audio.ts`.
- [x] Update imports in `src/components/MasteringSuite.tsx`.
- [x] Add `await` to the `audioBufferToMp3BlobAsync` call in `MasteringSuite.tsx`.
- [x] Pass progress callback and update button text in `MasteringSuite.tsx`.
- [x] Run `npx tsc --noEmit` to verify.
- [x] Run `npx vitest run` to verify.
