# Tasks: Audio Playback, Mastering, Export, and Loading Overhaul

## Phase 1: Web Playback Fixes

- [x] **1.1** `app/studio/[id].tsx` — Added `autoplayBlocked` state, wrapped `ensureContext()` in try/catch, show `LoadingModal` on failure (title "Reprodução bloqueada"), call `markBlobActive()` on successful play (also in `rerenderAfterMuteSolo`)
- [x] **1.2** `app/tabs/index.tsx` — Imported `audioSystem`, call `await audioSystem.ensureContext()` before `webAudio.replace/play()` in `handlePlay()`
- [x] **1.3** `src/lib/universalAudio.ts` — Increased `MAX_AGE_MS` to 900000 (15 min), added `markBlobActive(url)` export (committed earlier)
- [x] **1.4** `src/components/MasteringSuite.tsx` — `fetchAndRenderAudio` now uses shared `audioSystem.ensureContext()` instead of a throwaway `new AudioContext()` (must not be closed); guarded with null-check

## Phase 2: Mastering Chain DSP

- [x] **2.1** `src/lib/masteringBridge.ts` — Input validation already provided by `takeMasteringInput`/`MasteringInput` schema; no new function required
- [x] **2.2** `src/lib/mastering.ts` — Added `applyMasteringChain(buffer, plugins, sampleRate)` with real Web Audio DSP node wiring: eq (lowpass/high-cut), compressor (DynamicsCompressor), limiter + truePeakLimiter (Gain + WaveShaper soft-clip curves), multibandCompressor (3-band split + per-band comp + makeup merger), stereoImager (M/S matrix with width), tapeSaturator (WaveShaper tanh curve), deesser (notch). Disabled plugins are skipped.
- [x] **2.3** `src/components/MasteringSuite.tsx` — `handleExport` now calls `applyMasteringChain(rendered, plugins, sr)` before encoding; progress callback preserved

## Phase 3: MP3 Export

- [x] **3.1** Installed `lamejs` (`npm install lamejs`) for real MP3 encoding (lightweight, no native deps)
- [x] **3.2** `src/lib/audio.ts` — `audioBufferToMp3BlobAsync(buffer, kbps, onProgress?)` already implemented (lamejs Mp3Encoder, 1152-sample frames, progress ticks)
- [x] **3.3** MP3 encoding routed through `audioBufferToMp3BlobAsync` in `MasteringSuite`/`BounceDialog` export paths
- [x] **3.4** `src/components/BounceDialog.tsx` — MP3 already supported as a format with bitrate selector (existing)
- [x] **3.5** `src/components/MasteringSuite.tsx` — Real MP3 encoding via `audioBufferToMp3BlobAsync` (replaced fake rename); applies mastering DSP chain first

## Phase 4: LoadingModal Component

- [x] **4.1** `src/components/LoadingModal.tsx` — Created modal with title/message, indeterminate (ActivityIndicator) or progress bar, phase label, sub-progress bar, cancel button (custom label), auto-close 1.5s after 100%, "Concluído" state
- [x] **4.2** `src/components/index.ts` — Exported `LoadingModal`
- [x] **4.3** Integrated `LoadingModal` into `app/studio/[id].tsx` for autoplay-blocked state. NOTE: `BounceDialog`, `MasteringSuite`, and `extractor.tsx` already have inline progress UIs (ProgressBar + disabled buttons); replacing them with `LoadingModal` would be a regression, so left as-is.

## Phase 5: Tests

- [x] **5.1** `tests/lib8.test.ts` — 47 tests: `audioBufferToWavBlob` (16/24/32-bit, headers, size), `audioBufferToMp3BlobAsync` (mocked lamejs, mono/stereo, onProgress), `generateWaveform` (range/cache/length), `djb2Hash` (consistency/hashing), `MASTERING_CHAIN_PRESETS`/`buildMasteringChain`/`getOversampleLabel`, `applyMasteringChain` (all 9 plugin types render valid AudioBuffer, disabled skip, multi-chain), `markBlobActive` (safe no-throw)
- [x] **5.2** `tests/components6.test.tsx` — 12 tests: `LoadingModal` all states (hidden/visible/indeterminate/progress/phase/subProgress/cancel/auto-close/complete)
- [ ] **5.3** `tests/studio.test.tsx` — Pre-existing untracked file from another session; not extended (would require rewriting against new autoplay guard)
- [ ] **5.4** `tests/screens2.test.tsx` — Pre-existing untracked file from another session; not extended

## Phase 6: Verification

- [x] **6.1** `npx vitest run` — all tracked tests + new tests pass (427 + 59 new = green); remaining failures are pre-existing broken `components2.test.tsx` (syntax) + leftover untracked files from a prior session
- [x] **6.2** `npm run test:legacy` — 24 legacy tests pass
- [x] **6.3** `npx tsc --noEmit` — zero errors in changed files (errors confined to untracked leftover test files)
- [x] **6.4** Code review via `code-review` subagent — dead DSP nodes in `stereoImager` fixed (removed `midGain`/`sideGain` + overwritten `sGain.gain`)
- [x] **6.5** Commit and push to `master`
