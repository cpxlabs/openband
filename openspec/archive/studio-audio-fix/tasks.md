# Tasks: Studio Web Audio Autoplay Fix

- [ ] Add `if (isWeb) webAudio.unlock();` at the very beginning of the `togglePlay` function in `app/studio/[id].tsx`.
- [ ] Run `npx tsc --noEmit` to verify type safety.
- [ ] Run `npx vitest run` to ensure tests still pass.
