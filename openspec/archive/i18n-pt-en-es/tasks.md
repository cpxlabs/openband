# Tasks: Milestone 5 - i18n (PT / EN / ES)

## Phase 1: Setup & Configuration
- [ ] Install dependencies: `npm install i18next react-i18next expo-localization`
- [ ] Create `src/locales/en.json`, `pt.json`, and `es.json` with initial placeholder structures.
- [ ] Create `src/lib/i18n.ts` to configure and export the `i18next` instance.
- [ ] Import `src/lib/i18n.ts` into `app/_layout.tsx` to ensure it loads at app startup.

## Phase 2: Translation Extraction
- [ ] Update `app/tabs/settings.tsx` to use `t('...')` and add the Language Switcher UI (calling `i18n.changeLanguage`).
- [ ] Update `app/tabs/account.tsx` and `app/tabs/library.tsx` to use translations.
- [ ] Update `app/tabs/index.tsx` (Feed) to use translations.
- [ ] Update `app/studio/[id].tsx` (and core components like `PianoRoll`, `TrackGroupManager` where feasible) to use translations.

## Phase 3: Verification
- [ ] Verify TypeScript compiles without errors (`npx tsc --noEmit`).
- [ ] Verify test suites pass (`npx vitest run`).
- [ ] Check if the language actually switches live without restarting the app.
