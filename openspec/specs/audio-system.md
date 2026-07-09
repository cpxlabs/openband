# OpenSpec: Audio Engine & System Specification

This document serves as the Source of Truth for how audio playback, multi-track mixing, and exporting are processed across web, mobile, and desktop environments.

---

## 1. Core Architecture

The audio architecture operates on a unified model using a mix of `expo-audio` (for native playback) and HTML5 Web Audio API (for web-first features and offline rendering).

---

## 2. API References & Hooks

- **Native Playback**: Uses `expo-audio` (SDK 56).
  - Hook: `useAudioPlayer(source)`
  - Hook: `useAudioPlayerStatus(player)` returning `{ playing, currentTime, duration, isLoaded }`
  - Control methods: `player.play()`, `player.pause()`, `player.seekTo(seconds)`, `player.replace(source)`
  - Volume range: `0.0` to `1.0`
- **Universal Audio System (`src/lib/universalAudio.ts`)**:
  - Singleton `UniversalAudioSystem` coordinating cross-platform audio channels.
  - Controls offline multi-track mixdown via `OfflineAudioContext` (web) or bridge filesystem calls (desktop).
- **Web Player Autoplay Policy Bypass**:
  - `ensureContext()` must be executed synchronously on user click/interaction before executing any asynchronous network requests or `player.replace()`/`player.play()` calls.
  - Blob URLs for preview audio are tracked in `currentUrlRef` and explicitly revoked on unmount or re-render to prevent memory leaks.
