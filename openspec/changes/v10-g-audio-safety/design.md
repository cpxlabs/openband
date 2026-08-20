# Design: V10 Section G — Audio / Resource Safety

## Module
New file `src/lib/audioResourceGuard.ts`. Self-contained; no dependency on other V10 sections.
Real audio is reached only through an injected `PreviewVoiceFactory` (UI wires to `UniversalAudioSystem`).

## Types
```ts
export interface AudioContextLike {
  readonly id: string;
  setVolume(v: number): void;
}
export interface PreviewParams {
  key?: string;
  bpm?: number;
  volume?: number;
  seed?: string;
}
export interface PreviewVoice {
  play(): void | Promise<void>;
  stop(): void;
  dispose(): void;   // release nodes / OfflineAudioContext
}
export interface PreviewVoiceFactory {
  create(ctx: AudioContextLike, params: PreviewParams): PreviewVoice;
}

export interface AudioResourceGuardOptions {
  context: AudioContextLike;
  factory: PreviewVoiceFactory;
  maxVoices?: number;       // default 4
  defaultVolume?: number;   // default 1
}
```

## Class
```ts
export class AudioResourceGuard {
  constructor(opts: AudioResourceGuardOptions);
  get activeCount(): number;          // currently managed voices
  get defaultVolume(): number;
  setDefaultVolume(v: number): void;  // G57
  preview(params: PreviewParams): number;   // returns token, creates+plays a voice
  play(token: number): void;          // G59 idempotent: no-op if stopped
  stop(token: number): void;          // G59 idempotent: no-op if already stopped
  invalidate(changed: { key?: string; bpm?: number }): void;  // G54
  stopAll(): void;                    // releases all + restores volume (G57/G58)
  restoreVolume(): void;              // ctx.setVolume(defaultVolume)
  dispose(): void;                    // stopAll + mark closed
}
```

## Semantics
- **G53 single context:** the guard is constructed with ONE `AudioContextLike`; every
  `preview` passes the SAME context to `factory.create`. No new context is ever allocated.
- **G54 invalidate on key/BPM:** `invalidate({key})`/`invalidate({bpm})` releases any voice
  whose stored params differ from the new value (released = stop + dispose).
- **G55 release nodes:** `release(token)` calls `voice.stop()` (guarded) then `voice.dispose()`
  (guarded). Called on stop / invalidate / stopAll / eviction / dispose.
- **G56 bounded voices:** after each `preview`, if `voices.size > maxVoices`, the OLDEST token
  is released until within bound. So at most `maxVoices` voices are live.
- **G57 restore volume:** `restoreVolume()` and `stopAll()` call `ctx.setVolume(defaultVolume)`.
- **G58 no orphans:** `dispose()`/`stopAll()` release every voice; the internal map empties.
- **G59 idempotent:** `stop(token)` on an already-stopped/unknown token is a no-op (does not
  call voice methods twice). `play(token)` is a no-op if the voice is stopped/unknown.
- **G60 error isolation:** if `voice.play()` throws inside `preview`, the guard catches, releases
  that voice, and remains usable for subsequent `preview` calls.

## Determinism / safety
No timers, no global state beyond the instance. `context` is caller-owned; the guard never
creates or destroys it (only calls `setVolume`). All voice calls wrapped in try/catch.
