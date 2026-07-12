# Tasks — i18n Completeness

Docs-only change spec. No source code is committed in this change; the checklist below is the implementation contract for a follow-up Apply phase.

## 1. Locale defaults (src/lib/i18n.ts)
- [x] Promote `pt-BR` to the canonical default locale: add `pt-BR` resource key (alias `pt` → same JSON), set `lng` default to `'pt-BR'`, `fallbackLng: 'en'`.
- [x] Normalize device `languageCode` (`pt`→`pt-BR`) in the init resolver (`src/lib/i18n.ts:28-30`).
- [x] Export `useT` convenience hook: `export const useT = () => useTranslation().t;`

## 2. Expand dictionaries (src/locales/{en,pt,es}.json)
- [x] Extend `settings` namespace: mock-profile fields (`profileName`, `profileBio`, `profileLocation`, `memberSince`), `local`, `memberSinceLabel`, `appearance`, `themeDark`, `themeLight`, `info`, `appVersion`, `framework`, `engine`, `plan`, `planCurrent`, `publishFeed`, `createRemixes`, `exportVideo`, `yes`, `no`.
- [x] Extend `feed` namespace: `errorTitle`, `playbackError`, `shareTitle`, `shareCopied`, `loadingFeed`, `upgradeRequired`, `remixUpgrade`.
- [x] Extend `account` namespace: `error`, `saveError`, `signOut`, `signOutConfirm`, `cancel`, `editProfile`, `displayName`, `namePlaceholder`, `save`, `session`, `status`, `connected`, `plan`, `planTier`, `maxProjects`, `maxTracks`, `exportVideo`, `yes`, `no`.
- [x] Add `newProject` namespace (from `src/components/NewProject.tsx`): `title`, `moodPrompt`, `chooseGenre`, `selectedGenre`, `startFromScratch`, `startFromScratchDesc`, `back`, `skip`, `projectName`, `genre`, `change`, `bars`, `timeSignature`, `key`, `suggestedTracks`, `create`, `defaultName`.
- [ ] Add `studio` namespace (from `app/studio/[id].tsx`) — DEFERRED to next batch (out of scope for this tabs+settings+NewProject batch).
- [ ] Add `extractor` namespace (from `app/extractor.tsx`) — DEFERRED.
- [ ] Add `mastering` namespace (from `app/mastering/index.tsx`) — DEFERRED.
- [x] Add `moments` namespace (from `app/tabs/moments.tsx`): `title`, `subtitle`, `tabMoments`, `tabPacks`, `credits`, `creditNote`, `freePacksIntro`.
- [ ] Add `explorer` namespace (from `app/tabs/explorer.tsx`) — DEFERRED (explorer.tsx not part of this batch).
- [x] Mirror every new key into all three files (en default + pt-BR + es).

## 3. Migrate screens (replace literals with t())
- [x] `app/tabs/settings.tsx` — mock profile, appearance labels, info section (keep language toggle; update to `pt-BR` key).
- [x] `app/tabs/index.tsx` (feed) — share toast, genre "all" label, error alerts, loading message. (Note: `app/tabs/feed.tsx` is a separate file not yet migrated — DEFERRED.)
- [x] `app/tabs/library.tsx` — already fully uses `t()` (verified); no literals remaining.
- [x] `app/tabs/account.tsx` — already fully uses `t()` (verified); no literals remaining.
- [x] `app/tabs/moments.tsx` — title, subtitle, tab labels, credits, credit note, free-packs intro.
- [ ] `app/tabs/explorer.tsx` — DEFERRED.
- [x] `src/components/NewProject.tsx` — all visible strings migrated.
- [ ] `app/studio/[id].tsx` — DEFERRED to next batch.
- [ ] `app/extractor.tsx`, `app/mastering/index.tsx`, `app/mixing-console.tsx` — DEFERRED.
- [ ] Swap `useTranslation()` → `useT()` where it simplifies calls (optional, non-breaking) — partially available via exported `useT`; not force-swapped to keep diff minimal.

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
