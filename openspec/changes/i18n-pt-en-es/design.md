# Design: Milestone 5 - i18n (PT / EN / ES)

## Libraries
We will install the following packages:
- `i18next`: Core translation engine.
- `react-i18next`: React bindings for `useTranslation` hook.
- `expo-localization`: To detect the user's system language seamlessly.

## Architecture

1. **i18n Setup (`src/lib/i18n.ts`)**
   - Initializes `i18next` with `react-i18next`.
   - Uses `expo-localization.getLocales()[0].languageCode` for initial detection.
   - Configures 3 languages: `en`, `pt`, `es`.
   - English will be the default fallback (`fallbackLng: 'en'`).

2. **Translation Files (`src/locales/`)**
   - `en.json`: English strings
   - `pt.json`: Portuguese strings
   - `es.json`: Spanish strings

3. **Language Switcher UI**
   - Location: `app/tabs/settings.tsx`.
   - Component: A group of toggle buttons (similar to theme toggles) for "English", "Português", "Español".
   - State: The selected language will be persisted (e.g., in `expo-secure-store` or `localStorage` via a simple wrapper, or handled automatically by user preferences if we attach it to the profile).

4. **Component Updates**
   - Major screens like `app/tabs/index.tsx`, `library.tsx`, `settings.tsx`, `account.tsx`, and `app/studio/[id].tsx` will be refactored to use `const { t } = useTranslation()`.
   - Hardcoded strings like "Configurações", "Sair", "Nova extração" will be replaced by keys like `t('settings.title')`.
