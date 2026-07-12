# Settings

## Overview
The Settings screen (`app/tabs/settings.tsx`) lets the user configure app preferences: language (i18n), appearance/theme, and view plan/tier limits. It consumes `useTheme` (`src/context/ThemeContext`) for theme state, `useTranslation`/`i18n` for language, and `useAuth` for `tier`/`tierLimits`. The screen is localized via `react-i18next` and `changeLanguage` from `src/lib/i18n`.

## Implementation Notes
`app/tabs/settings.tsx` imports `PageHeader`, `Avatar`, `Divider`, `Badge` from `src/components` (`:2`), `useTheme` (`:3`), `changeLanguage` (`:7`). Language selection renders a row of `Pressable` chips for `['en','pt','es']`, highlighting the active `i18n.language` and calling `changeLanguage(lng)` on press (`:61-81`). Appearance renders two `Pressable` cards calling `setTheme("dark")` / `setTheme("light")` with the active theme highlighted (`:83-117`). The "Plano" section lists `tier` as a `Badge variant="active"` and `tierLimits.canPublishToFeed` / `canCreateRemixes` / `canExportVideo` (`:138-160`). A mock profile (`MOCK_PROFILE`, `:9`) is shown for display only. There is no persisted "reset" action wired in the current screen.

## Requirements

### Requirement: Language Selection (i18n)
The settings screen MUST offer language options (English / Português / Español) and MUST switch the active language through `changeLanguage` when a chip is pressed. The selected language MUST be visually highlighted.

#### Scenario: Switch language
- **Given** the current `i18n.language` is `"en"`
- **When** the user taps the "Português" chip
- **Then** `changeLanguage("pt")` is called (`:68`)
- **And** the "pt" chip shows the `border-brand-primary` active style (`:69-73`)

### Requirement: Theme / Appearance
The settings screen MUST let the user toggle between dark and light theme via `useTheme().setTheme`, with the active theme visually highlighted.

#### Scenario: Select light theme
- **Given** the current theme is `"dark"`
- **When** the user taps the "Claro" (light) card
- **Then** `setTheme("light")` is called (`:103`)
- **And** the light card shows the `border-brand-accent` active style (`:102-108`)

### Requirement: Tier / Plan Display
The settings screen MUST display the user's current plan tier as a `Badge variant="active"` and MUST list feature gates derived from `tierLimits` (publish to feed, create remixes, export video).

#### Scenario: Render plan info
- **Given** `useAuth()` returns `tier = "TIER2_STUDIO"`
- **When** the "Plano" section renders
- **Then** a `Badge` shows `TIER2_STUDIO` (`:143`)
- **And** `canPublishToFeed`, `canCreateRemixes`, `canExportVideo` are shown as Sim/Não (`:146-159`)

### Requirement: App Information
The settings screen MUST display static app information (version, framework, engine) under an "Informações" divider.

#### Scenario: Show app metadata
- **Given** the screen renders
- **When** the "Informações" section is shown (`:119-136`)
- **Then** "Versão do App = 1.0.0", "Framework = Expo SDK 56", "Engine = React Native 0.85" are displayed

## Test Requirements (Vitest)
- [ ] Settings renders language chips for `en`/`pt`/`es` and highlights `i18n.language`
- [ ] Tapping a language chip calls `changeLanguage` with the selected code
- [ ] Settings renders dark/light theme cards and calls `setTheme` on press
- [ ] Theme cards highlight the active `theme` from `useTheme`
- [ ] "Plano" section renders a `Badge` with `tier` and `tierLimits` feature gates
- [ ] "Informações" section shows app version, framework, and engine strings
