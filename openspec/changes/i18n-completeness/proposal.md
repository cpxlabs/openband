# Proposal — i18n Completeness

## Context
OpenBand is a music-production product with a primary market in Brazil (pt-BR), plus meaningful English- and Spanish-speaking user bases. The app already has a working i18next wiring in `src/lib/i18n.ts` (it imports `react-i18next`, reads `expo-localization`, persists the choice to `localStorage`, and exposes `changeLanguage`). A language toggle already exists in `app/tabs/settings.tsx` (calls `changeLanguage`, maps `en/pt/es`).

However, the **translation dictionaries are stubs**. `src/locales/en.json`, `pt.json`, and `es.json` each contain only ~14 keys covering just four screens: `settings`, `feed`, `library`, `account`. Grep shows only four files import `useTranslation` (`app/tabs/index.tsx`, `app/tabs/account.tsx`, `app/tabs/library.tsx`, `app/tabs/settings.tsx`).

Every other surface — `app/studio/[id].tsx` (dozens of `Alert.alert` strings and command-palette labels), `app/extractor.tsx`, `app/mastering/index.tsx`, `app/tabs/moments.tsx`, `app/tabs/explorer.tsx`, `app/tabs/feed.tsx`, `src/components/NewProject.tsx`, `app/mixing-console.tsx`, and the remaining `app/*.tsx` screens — hardcodes mixed pt-BR / English strings directly in JSX. The archived `i18n-pt-en-es` OpenSpec change that was meant to finish this was never completed.

## Problem Description
- Dictionaries cover only 4 of ~30 screens; the rest are hardcoded and silently untranslated.
- `app/tabs/settings.tsx` still hardcodes a mock profile ("João Produtor", bio, "São Paulo, BR", "Março 2026") and appearance-section labels ("Aparência", "Escuro"), so even the "localized" settings screen leaks pt-BR.
- Several screens (`studio/[id].tsx`, `extractor.tsx`) hardcode *Portuguese* error/info strings regardless of the selected language — a correctness bug, not just a coverage gap.
- Resource key is `pt` while the brief targets `pt-BR`; device-language detection maps `languageCode` (e.g. `pt`) which works, but the canonical locale should be `pt-BR` to match regional pluralization/labels.

## Objectives
- Expand the three locale dictionaries (`en.json`, `pt.json`, `es.json`) to cover every user-visible string across `app/` and the shared `src/components/` used by those screens.
- Promote `pt-BR` to the default/primary resource locale (`fallbackLng: 'en'`, default `lng: 'pt-BR'`), keeping a `pt` alias for the existing settings toggle.
- Introduce a thin `useT()` convenience hook in `src/lib/i18n.ts` (wraps `useTranslation().t` with safe fallbacks) so migrated screens need less boilerplate.
- Migrate screens in batches, starting with the highest-traffic surfaces: `app/tabs/*` (index, account, library, settings, feed, moments, explorer), `src/components/NewProject.tsx`, then `app/studio/[id].tsx`, `app/extractor.tsx`, `app/mastering/index.tsx`, and `app/mixing-console.tsx`.
- Add a coverage test that asserts no remaining hardcoded visible strings in the migrated batch and counts extracted keys per locale.

## Out of Scope
- Adding new languages beyond pt-BR / en / es.
- Pluralization/runtime interpolation beyond the simple `{var}` already supported by i18next.
- Backend string localization (API error messages stay server-side English for now).
- Right-to-left layout or locale-driven number/date formatting (future change).
