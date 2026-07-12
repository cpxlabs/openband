# OpenBand — Engineering Handoff Document (for next-session build)

> Audience: the model/engineer ("Hy3") picking up OpenBand to drive the next development phase.
> Goal: give a complete, accurate picture of the repo — what it is, how it is built, what works, what is broken/in-flight, and what to build next.

---

## 0. TL;DR

OpenBand is an **open-source, cross-platform DAW** (web-first, also Android/iOS/Electron desktop) built on **Expo Router + React Native Web + NativeWind (Tailwind v3) + TypeScript**, with a **Supabase** (prod) / **SQLite** (dev) backend, an **Express** audio backend (Demucs stem separation + mastering bounce), and a **swappable desktop bridge** (`src/bridge/`) so the same code runs in browser, Electron, or (future) Tauri.

The app already implements a remarkably complete DAW surface: multi-track studio, 19-type plugin DSP, mastering suite, stem extraction, piano roll, sampler, synth, looper, chord track, automation lanes, CRDT collaboration, command palette, project branching, i18n (en/es/pt), and a 56+ component design system. **~505 Vitest tests + legacy `node:test` suite + Playwright E2E** exist.

What is *not* done is the integration/hardening layer: several complete subsystems (modulation matrix, real LUFS meter, native hardware I/O, real plugin DSP, web playback pipeline) are **partially wired or stubbed**, and there are known correctness gaps (silent audio-region playback on web, leaky blob URLs, beat drift, param-id mismatches). The recommended next phase is to **close these gaps and ship the next-product pillars** (Video Export, MIDI Learn+MCU, DAWproject interop, AI Voice Cleaner) already specified in `openspec/changes/next-product-design`.

---

## 1. Tech Stack (verify before coding)

| Layer | Technology | Notes / discrepancies |
| --- | --- | --- |
| Framework | Expo Router (`expo ^57.0.4`, `expo-router ~57.0.4`) | ⚠️ `AGENTS.md` and `README.md` reference "Expo SDK 56" and the SDK-56 docs URL, but `package.json` is on **Expo 57**. Verify the correct SDK before using Expo API docs. |
| Styling | NativeWind v4 + Tailwind CSS v3 | Use Tailwind **v3** syntax (`@tailwind` directives in `global.css`). Do NOT switch to v4 `@import`. |
| Language | TypeScript ~6.0, strict | Path aliases: `@/` → root, `@bridge` → `src/bridge`. Defined in `tsconfig.json`. |
| UI runtime | `react-native-web` + `react-native` 0.86 + React 19.2 | Components render via RN primitives; design system in `src/components/`. |
| Auth/DB (dev) | SQLite via `better-sqlite3` | Backend auto-creates `backend/data/openband.sqlite`. |
| Auth/DB (prod) | Supabase (PostgreSQL + Auth) | Mock fallback when no env vars set. |
| Audio | `expo-audio` (~57.0.0) + HTML5 Audio (web) + Web Audio API | `expo-av` is NOT used. See §4. |
| Audio DSP | Web Audio node graphs + AudioWorklets + WASM (`wasm/`) | `wasm/` contains `plugin.ts`, `package.json`, `asconfig.json` (WASM plugin host in flight). |
| Stem separation | Demucs (HTDEMUCS) via Python subprocess | Mock silent-WAV fallback when Demucs absent. |
| Desktop | Electron 35 (`electron/`) | Bridge pattern: `OpenBandNative` from `@bridge`. |
| 3D | Three.js (`three ^0.160`, `@react-three/fiber`, `@react-three/drei`) | Virtual Studio (Habbo-style room). |
| Testing | Vitest 4 (~505 tests), Playwright, legacy `node:test` | See §7. |
| i18n | i18next + react-i18next | Locales: `src/locales/{en,es,pt}.json`. |

### Scripts (`package.json`)
```bash
npm start                  # Expo dev server
npm run web                # Web dev server
npm run build              # expo export --platform web --clear + scripts/post-export.js → dist/
npm run desktop            # build web bundle then launch Electron
npm run desktop:dev        # concurrently expo-web + electron
npx tsc --noEmit           # type check (treated as "lint")
npx vitest run             # all component + lib tests (single run)
npm run test:legacy        # node:test: presets.test.ts, types.test.ts
cd backend && npm run dev  # Express backend on :3001
```

---

## 2. Repository Layout (top-level)

```
openband/
├── app/                      # Expo Router screens
│   ├── _layout.tsx           # Root: SafeAreaProvider + AuthProvider + redirect logic
│   ├── (auth)/login.tsx      # Login/signup (Supabase + mock fallback + visitor mode)
│   ├── tabs/
│   │   ├── _layout.tsx       # Tab navigator + responsive Sidebar (router.push)
│   │   ├── index.tsx         # Feed (social, audio playback)
│   │   ├── library.tsx       # Project list + "Separar Stems"
│   │   ├── moments.tsx       # Sample pack store / artist moments
│   │   ├── account.tsx       # Profile + sign-out
│   │   ├── settings.tsx      # Theme/settings
│   │   └── modes.tsx         # Creative Modes hub (13 orphaned screens)
│   ├── extractor.tsx         # Stem separation page
│   ├── mastering/index.tsx   # Mastering suite
│   └── studio/[id].tsx       # DAW multi-track mixer (largest file)
├── src/
│   ├── components/           # 64 components (design system + DAW widgets)
│   ├── lib/                  # 75 modules: audio, midi, dsp, state, sync, etc.
│   ├── context/             # AuthContext, ThemeContext
│   ├── hooks/               # useUniversalAudio, useKeyboardShortcuts, etc.
│   ├── bridge/              # interface.ts, electron.ts, tauri.ts, browser.ts, index.ts
│   └── locales/             # en.json, es.json, pt.json
├── backend/                 # Express + SQLite + Demucs (Python venv)
│   └── src/{index.ts, routes/, services/, middleware/, lib/, types.ts}
├── electron/                # main.js, preload.js, package.json (electron-builder)
├── supabase/schema.sql      # DB schema (profiles, projects, tracks, stems, posts)
├── openband-backend/        # Optional Docker microservices (Redis/collab/AI/backup)
├── openspec/                # SDD loop: specs/ (43), changes/ (30 in-flight), archive/
├── docs/                    # supabase.md, sqlite.md, features-*.md, apk-build.md, ...
├── stories/                 # Storybook (49+ stories)
├── tests/                   # 52 Vitest/test files
├── wasm/                    # WASM plugin host source
├── android/ ios/            # Prebuilt native projects
├── AGENTS.md                # ← READ THIS FIRST (workflow rules)
├── CLAUDE.md                # @AGENTS.md
├── README.md, ROADMAP.md, BUILD.md
└── global.css, tailwind.config.js, babel.config.js, metro.config.js, tsconfig.json
```

---

## 3. Development Workflow (OpenSpec SDD Loop — from `AGENTS.md`)

Every change must go through three phases. **Do not skip or reorder.**

1. **Spec** — create `openspec/changes/<name>/{proposal,design,tasks}.md` (docs-only), commit & push *before* any code.
2. **Implement + test + code-review** — implement per `tasks.md`, write/update tests, run full verification, pass `code-review` subagent. Commit separately.
3. **Archive + commit** — move specs to `openspec/archive/` and commit.

Subagent-first rule: the main agent orchestrates; delegation of read/write/verify/review to subagents keeps the architect context clean. **Always run `code-review` before every commit.** Always commit & push after completing a change.

Verification order (run all, fix root cause on failure):
```bash
npx tsc --noEmit              # root, zero errors
cd backend && npx tsc --noEmit
npx vitest run
npm run test:legacy
npm run build
```

### ⚠️ Important conventions
- **No new dependencies** without approval (check `package.json` first).
- **No native desktop I/O in `src/`** — always through `OpenBandNative` from `@bridge`.
- **No comments in code.** Follow existing `View` + `className` patterns (no `StyleSheet.create`).
- Use the design system (`src/components/`); reuse components.
- Update `docs/ui-overhaul-v2-changes.md` when changing visual layouts/styles.
- Test output format: `▶ SuiteName` / `  ✔ test (Xms)` / `✔ SuiteName (Xms)`.

---

## 4. Audio Architecture (critical to understand)

Two distinct audio paths coexist — keep them straight:

**A. Playback API (`expo-audio`)** — `useAudioPlayer(source)` / `useAudioPlayerStatus(player)`. Used for feed/library/player previews and simple playback. `source` = `require(...)` or URL.

**B. Web Audio / offline render pipeline** — used by the **Studio** for multi-track playback:
- `src/lib/midiSynth.ts` → `renderTracksToUrl()` renders MIDI notes to a WAV blob (OfflineAudioContext).
- `src/lib/universalAudio.ts` → singleton `UniversalAudioSystem`: lazy `AudioContext`, `renderMixdown()` (handles both MIDI **and** audio-region `url`s), cross-platform export. **This is the canonical path** the studio should route through.
- `src/hooks/useUniversalAudio.ts` → `expo-audio` wrapper with `ensureContext()` resume on user gesture.

⚠️ **Known web-playback bugs** (see `openspec/changes/web-player-studio-audio`): audio-region tracks are silent on web, pitch-shift UI is not applied, blob URLs leak, beat drift (clock reads a different AudioContext than the `<audio>` element), and multiple independent contexts exist. The fix direction: funnel studio + feed playback through a single `audioSystem` pipeline and call `ensureContext()` synchronously in `togglePlay` before any `await`.

**DSP modules:**
- `src/lib/pluginChain.ts` → `applyPluginChain()` (19 track/bus plugin types)
- `src/lib/mastering.ts` → `applyMasteringChain()` (EQ, comp, limiter, LUFS)
- `src/lib/pedalboardDsp.ts` → tanh overdrive, delay/chorus/tremolo worklet factories
- `src/lib/timeStretch.ts` / `timeStretchVocoded.ts` → pitch-independent stretch (granular / phase vocoder)
- `src/lib/subtractiveSynth.ts`, `wasmInstrumentEngine.ts`, `wasmPluginHost.ts`
- `src/lib/modulationMatrix.ts` → 11-source × 11-target mod engine (`computeModulation`) — **now imported by `PluginEditor.tsx` and `OneKnob.tsx` but integration is in-flight** (see `wire-modulation-matrix`).

---

## 5. Design System (`src/components/` — 64 components)

Full reference table is in `AGENTS.md` (and `README.md`). Key families:
- **Primitives:** `Button`, `TextInput`, `Card`/`CardRow`/`CardIcon`, `Badge`, `Avatar`, `Divider`, `Loading`, `EmptyState`, `ProgressBar`, `PageHeader`, `Sidebar`.
- **DAW widgets:** `PedalRack`, `Tuner`, `PianoRoll`, `Looper`, `AutomationLane`, `WaveformCanvas`, `PluginRack`/`MasterRack`/`PluginEditor`, `MixManager`, `TrackGroupManager`, `ChordTrack`, `Sampler`, `Synth`, `Metronome`, `RecordOptions`, `NewProject`, `BounceDialog`.
- **Mastering:** `MasteringSuite`, `MasteringChain`, `MasteringVersionManager`, `MasteringUpload`, `MiniMastering`, `LufsMeter`, `VisualEQ`, `OneKnob`.
- **Collab/Version:** `BranchManager`, `CommitModal`, `VersionHistory`, `Patchbay`, `CommandPalette`, `ProjectMenu`, `QuickActions`, `QuickTools`, `MiniPlayer`.
- **New:** `OnboardingFlow.tsx` (untracked — first-run onboarding, in flight).

CSS utility classes in `global.css`: `.card`, `.card-elevated`, `.btn-primary/secondary/ghost`, `.input-field`, `.badge`, `.label`, `.section-header`.

---

## 6. Backend & Desktop

**Backend (`backend/src/index.ts`, port 3001):**
- `POST /api/extract` — upload audio → Demucs 4-stem separation (`services/demucs.ts`, mock fallback `services/mock.ts`, `services/queue.ts`).
- `GET /api/stems/:filename` — download stem.
- `POST /api/master` / `GET /api/master/download/:filename` — mastering bounce.
- `routes/feed.ts` (in-flight, `build-social-feed-backend`), `routes/presence.ts` (SSE), `routes/collab.ts` (CRDT sync), `routes/generator.ts` (MIDI gen).
- SQLite schema in `backend/src/lib/sqlite.ts` (`SCHEMA_SQL`); Supabase schema in `supabase/schema.sql`.

**Desktop bridge (`src/bridge/`):** `interface.ts` (contract) → `electron.ts` (delegates to `window.electronAPI`) / `tauri.ts` (stub) / `browser.ts` (localStorage/DOM). `electron/preload.js` exposes `electronAPI`; `electron/main.js` handles IPC. **`hardware-io-native` change already added 6 bridge methods** (enumerate devices, patchbay routes) — verify IPC handlers exist.

---

## 7. Testing

- **Vitest** (`tests/*.test.ts(x)` — 52 files): components (`components*.test.tsx`), lib (`lib*.test.ts`), plugins (`tests/plugins/dsp.test.ts` — new, audible-DSP assertions), bridge (`nativeBridge.test.ts`), modes, nav-shell, transport, telemetry, etc.
- **Legacy `node:test`**: `tests/presets.test.ts`, `tests/types.test.ts` (12+12 tests) via `npm run test:legacy`.
- **Playwright E2E**: `e2e/` + `playwright.config.ts`.
- **Storybook**: `stories/*.stories.tsx` (`npx storybook dev -p 6006`).
- **Vitest UI**: `npx vitest --ui` (dashboard screenshot via `scripts/screenshot-vitest-ui.mjs`).

⚠️ `tests/lib9.test.ts` only asserts "output differs from input" using a mock `OfflineAudioContext`, so current DSP stubs pass despite being wrong (see `real-plugin-dsp`).

---

## 8. Current Implementation Status

**✅ Solid / working:**
- Expo Router app shell, auth (Supabase + mock + visitor), responsive Sidebar, i18n (en/es/pt).
- Studio DAW: tracks, volume/pan/mute/solo, canvas waveforms, transport, metronome, piano roll, looper, chord track + Markov, sampler, synth, pedalboard, plugin rack (19 types), mastering suite, mix snapshots, track groups, sample browser, command palette, branching, undo/redo, automation lanes, bounce/export.
- Stem extraction (Demucs + mock), feed/library/moments/account/settings screens.
- CRDT (`src/lib/crdt.ts` — operation-based, Lamport), collaboration SSE, snapshot manager, project branching.
- Electron desktop build + swappable bridge; Android prebuild present.

**⚠️ Partial / in-flight (specs exist in `openspec/changes/`):**
- `web-player-studio-audio` — web multi-track playback correctness (silence, pitch, leaks, drift).
- `real-plugin-dsp` — 19 plugin types need correct DSP + canonical param ids (`PLUGIN_SPECS`).
- `wire-modulation-matrix` — `modulationMatrix.ts` math done, UI integration in progress.
- `real-lufs-meter` — `src/lib/lufs.ts` (BS.1770 K-weighting, true peak) not yet implemented.
- `hardware-io-native` — bridge methods added; need `electron/main.js` IPC + `Patchbay` wiring (`mount-patchbay`).
- `first-run-onboarding` — `OnboardingFlow.tsx` created; persistence helpers pending.
- `i18n-completeness` — pt-BR default + namespace extensions pending.
- `audio-transport` — unified transport functions (mixer-functions, transport).
- `build-social-feed-backend` — `posts`/`post_likes` schema + `routes/feed.ts` pending.
- `ci-pipeline` — `.github/workflows/ci.yml` not yet created (config written in `design.md`).
- `remove-dead-yjscrdt` — delete `src/lib/yjsCRDT.ts` (superseded by `crdt.ts`).
- `s3-project-storage`, `ship-wasm-binary`, `wire-collab-presence`, `wire-studio-telemetry`, `audio-recording` (recording worklet done), `accessibility-pass`, `comprehensive-test-suite`, `document-plugin-specs`, `polish-core-specs`, `surface-auth-tier-ui`, `resolve-orphaned-screens` (modes hub done), `unify-branching-crdt`, `native-builds`.

**❌ Dead / inconsistencies to resolve:**
- `src/lib/yjsCRDT.ts` — dead code, scheduled for deletion.
- `AGENTS.md`/`README.md` say "Expo SDK 56" but `package.json` is **Expo 57** — verify which is correct before relying on SDK docs.
- `README.md` lists backend as "FastAPI + Redis + Celery" and "SQLite" while `backend/` is actually **Express + better-sqlite3**. README is partly stale vs. reality.
- `PluginEditor`/`OneKnob` import `modulationMatrix` but modulation is not yet applied at playback time.

---

## 9. Recommended Next Steps (prioritized)

These consolidate `openspec/changes/roadmap-v3`, `next-product-design`, and the in-flight gaps. Order roughly by leverage:

1. **Fix the web playback pipeline** (`web-player-studio-audio`) — highest user-impact bug (silence/leaks/drift). Route studio + feed through `UniversalAudioSystem.renderMixdown` + single shared `AudioContext`.
2. **Real plugin DSP + canonical param ids** (`real-plugin-dsp`) — replaces stubs with correct Web Audio graphs; add audible-DSP tests in `tests/plugins/`.
3. **Wire modulation matrix** (`wire-modulation-matrix`) — make LFO/env/macro move plugin params during playback.
4. **Real LUFS meter** (`real-lufs-meter`) — implement `src/lib/lufs.ts`; power `LufsMeter`.
5. **Native hardware I/O + Patchbay** (`hardware-io-native`, `mount-patchbay`) — finish IPC handlers + UI wiring.
6. **First-run onboarding** (`first-run-onboarding`) — persistence helpers + gate; raise activation.
7. **Next-product pillars** (`next-product-design`) — additive, low-risk:
   - `src/lib/videoExport.ts` (Video Export via `MediaRecorder`, BounceDialog toggle)
   - `src/lib/midiLearn.ts` + `src/lib/mcu.ts` (MIDI Learn + MCU surface)
   - `src/lib/dawproject.ts` (DAWproject XML/zip interop)
   - AI Voice Cleaner (20th plugin type, `src/lib/plugins/voiceCleaner.ts` + bridge method) — see `openspec/specs/ai-voice-cleaner/spec.md`.
8. **Hardening / hygiene:** delete `yjsCRDT.ts`, add CI workflow, expand test suite, finish i18n pt-BR default, accessibility pass, write-backend feed schema, S3 project storage, ship WASM binary.
9. **Docs accuracy:** reconcile `README.md`/AGENTS SDK version and backend stack claims with `package.json`/actual `backend/`.

---

## 10. Quick Start

```bash
npm install
npm run web                 # or: npm start
# backend (optional, for stems/mastering):
cd backend && npm install && npm run dev   # :3001, SQLite auto-created
# desktop:
npm run desktop            # builds web bundle + launches Electron
```

No `.env` needed for dev (mock Supabase fallback). For real Supabase: copy `.env.example` → `.env` and run `supabase/schema.sql`.

---

## 11. Files to Read First (onboarding for the next session)

1. `AGENTS.md` — workflow + design-system reference (mandatory).
2. `README.md`, `ROADMAP.md`, `BUILD.md`.
3. `app/studio/[id].tsx` — the DAW (largest, most central screen).
4. `src/lib/universalAudio.ts`, `src/lib/midiSynth.ts`, `src/lib/pluginChain.ts`, `src/lib/mastering.ts` — audio core.
5. `src/components/index.ts` — component surface.
6. `openspec/changes/next-product-design/*` and `roadmap-v3/*` — the next-phase spec.
7. `src/bridge/{interface,index}.ts` — desktop contract.
8. `backend/src/index.ts` + `backend/src/routes/*`.
