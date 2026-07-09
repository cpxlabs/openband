# Tasks: Web Audio Autoplay Fix

- [ ] Add `unlock()` method to `src/hooks/useWebAudioPlayer.ts`.
- [ ] Export `unlock` from the `useWebAudioPlayer` hook.
- [ ] Call `webAudioRef.current.unlock()` synchronously at the top of `handlePlay` in `app/tabs/index.tsx`.
- [ ] Run `npx tsc --noEmit` to verify type safety.
- [ ] Run `npx vitest run` to verify tests pass.
