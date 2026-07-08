# Reverted Features (saved in stash)

Master was reset to `91d33a1` (last working Vercel build). All subsequent changes are saved in a stash with message:

```
All post-91d33a1 changes: UI polish, Toast, 3D scenes, Vercel fix attempts, PWA, build script wrapper
```

To apply: `git stash pop` or `git stash apply stash@{0}`

To cherry-pick individual features:

## 1. UI Polish + Skeleton Loading + Animations
**Commits:** `257da29`, `b1701e3`
- `global.css` — skeleton classes, shimmer animation, toast styles, glow-border, pressable-scale
- `tailwind.config.js` — custom animations (shimmer, pulse-soft, fade-in, slide-up, scale-in), box-shadow presets (glow, elevated), transition easings (spring, out-quart)
- `src/components/Loading.tsx` — skeleton-line, skeleton-shimmer variants
- 15+ components — pressable-scale class, transition-all, animation classes
- `app/_layout.tsx` — added Toast component
- `src/components/Toast.tsx` (new) — toast notification system with showToast()

## 2. 3D Scene Guidelines + Screen Polish
**Commit:** `b4349b7`
- `docs/3d-scene-guidelines.md` — 3D scene documentation
- Various 3D scene screens polished (virtual-studio, acoustics, autotune, etc.)
- `scripts/polish-screens.mjs` — screenshot script

## 3. Vercel Fixes (all post-257da29)
**Commits:** `d8e82d9` through `64e4ec5`, then our recent fixes `7661b6f` through `432d4dc`
- Various Vercel config changes (rewrites, cleanUrls, framework, outputDir, buildCommand)
- `scripts/build.js` — Metro export wrapper with PWA asset copy + validation
- `scripts/build.js` — dist/index.html + JS bundle existence checks
- `public/sw.js` — service worker with SPA fallback
- `public/manifest.json` — PWA manifest
- `public/assets/` — PWA icons (favicon, icon-192, icon-512)
- `package-lock.json` — dependency changes

## Why master was reverted
The Expo web export (`expo export --platform web`) hangs during Metro bundling on Node 24 (local) and produces no output on Vercel (Node 22). The root cause is believed to be a Metro deadlock during `app/_layout.tsx` bundling, possibly related to NativeWind CSS processing or a circular dependency introduced in the UI polish commits.

## To cherry-pick a specific feature
```bash
# Example: cherry-pick just the Toast component
git cherry-pick b1701e3 --no-commit
# Then manually resolve the export/Metro issue
```

## To restore full feature branch
```bash
git checkout feature/vercel-fixes
# Rebase onto current master
git rebase master
```
