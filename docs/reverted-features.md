# Reverted Features (saved in stash)

Master was reset to `91d33a1` (last working Vercel build). All subsequent changes are in a stash:

```
git stash list  # → stash@{0}: All post-91d33a1 changes...
```

To restore fully: `git stash pop`.

To cherry-pick individual features:

## 1. UI Polish + Skeleton Loading + Animations + Toast
- `global.css` — skeleton classes, shimmer animation, toast styles, glow-border, pressable-scale
- `tailwind.config.js` — custom animations (shimmer, pulse-soft, fade-in, slide-up, scale-in), box-shadow presets (glow, elevated), transition easings (spring, out-quart)
- `src/components/Loading.tsx` — skeleton-line, skeleton-shimmer variants
- 15+ components — pressable-scale class, transition-all, animation classes
- `app/_layout.tsx` — added Toast component
- `src/components/Toast.tsx` (new) — toast notification system

## 2. 3D Scene Guidelines + Polish
- `docs/3d-scene-guidelines.md` — 3D scene documentation
- Various 3D scene screens polished (virtual-studio, acoustics, autotune, etc.)
- `scripts/polish-screens.mjs` — screenshot script

## 3. Vercel Fixes (all post-257da29)
- Various Vercel config changes (rewrites, cleanUrls, framework, outputDir, buildCommand)
- `scripts/build.js` — Metro export wrapper with PWA asset copy + validation
- `public/sw.js` — service worker with SPA fallback
- `public/manifest.json` + `public/assets/` icons — PWA manifest for Vercel
- `package-lock.json` — dependency changes

## Why master was reverted
The Expo web export (`expo export --platform web`) hangs during Metro bundling of `app/_layout.tsx` on both Node 24 (local) and Node 22 (Vercel). Root cause is likely a Metro deadlock in the dependency graph — possibly NativeWind CSS processing on new animation classes or a circular import from the UI polish commits.
