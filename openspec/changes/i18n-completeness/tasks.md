# Tasks — i18n Completeness

Docs-only change spec. No source code is committed in this change; the checklist below is the implementation contract for a follow-up Apply phase.

## 1. Locale defaults (src/lib/i18n.ts)
- [ ] Promote `pt-BR` to the canonical default locale: add `pt-BR` resource key (alias `pt` → same JSON), set `lng` default to `'pt-BR'`, `fallbackLng: 'en'`.
- [ ] Normalize device `languageCode` (`pt`→`pt-BR`) in the init resolver (`src/lib/i18n.ts:28-30`).
- [ ] Export `useT` convenience hook: `export const useT = () => useTranslation().t;`

## 2. Expand dictionaries (src/locales/{en,pt,es}.json)
- [ ] Extend `settings` namespace: mock-profile fields (`profileName`, `profileEmail`, `profileBio`, `profileLocation`, `memberSince`), `appearance`, `themeDark`, `themeLight`, `info`.
- [ ] Extend `feed` namespace: share/copy toast, genre filter labels, audio-preview error.
- [ ] Extend `library` namespace: confirm/sheet strings used by `app/tabs/library.tsx`.
- [ ] Extend `account` namespace: sign-out confirmation.
- [ ] Add `newProject` namespace (from `src/components/NewProject.tsx`): title, mood prompt, genre/mood option labels, back/next/done, start-from-scratch.
- [ ] Add `studio` namespace (from `app/studio/[id].tsx`): mic-permission alert, record/MIDI/generate errors, command-palette labels (`play`,`record`,`undo`,`redo`,`delete`,`addTrack`), "saved" label, mix/compare labels.
- [ ] Add `extractor` namespace (from `app/extractor.tsx`): demo-export toast, preset labels, status strings.
- [ ] Add `mastering` namespace (from `app/mastering/index.tsx`): chain labels, export, LUFS.
- [ ] Add `moments` namespace (from `app/tabs/moments.tsx`) and `explorer` namespace (from `app/tabs/explorer.tsx`).
- [ ] Mirror every new key into all three files (en default + pt-BR + es).

## 3. Migrate screens (replace literals with t())
- [ ] `app/tabs/settings.tsx` — mock profile, appearance labels, info section (keep language toggle; update to `pt-BR` key).
- [ ] `app/tabs/index.tsx` + `app/tabs/feed.tsx` — share toast, genre labels, error alerts.
- [ ] `app/tabs/library.tsx`, `app/tabs/account.tsx`, `app/tabs/moments.tsx`, `app/tabs/explorer.tsx`.
- [ ] `src/components/NewProject.tsx` — all visible strings.
- [ ] `app/studio/[id].tsx` — all `Alert.alert` strings + command-palette labels + status labels.
- [ ] `app/extractor.tsx`, `app/mastering/index.tsx`, `app/mixing-console.tsx` (text labels only).
- [ ] Swap `useTranslation()` → `useT()` where it simplifies calls (optional, non-breaking).

## 4. Coverage test (new)
- [ ] Create `tests/i18n-coverage.test.ts`:
  - Asserts `en.json`, `pt.json`, `es.json` have identical key sets (deep key parity).
  - Counts extracted keys per namespace and asserts growth vs. the ~14-key baseline.
  - Greps the migrated batch (`app/tabs/*`, `src/components/NewProject.tsx`) for leftover user-visible hardcoded string literals and fails if any remain outside `t(...)`.

## 5. Verification
- [ ] `npx tsc --noEmit` clean
- [ ] `cd backend && npx tsc --noEmit` clean (no backend i18n changes, sanity only)
- [ ] `npx vitest run` passes
- [ ] `npm run test:legacy` passes
- [ ] `npm run build` succeeds
- [ ] Manual: Settings language toggle flips pt-BR / en / es across migrated screens with no hardcoded leakage.
