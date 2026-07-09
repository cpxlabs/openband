# Proposal: Milestone 5 - i18n (PT / EN / ES)

## Context
OpenBand aims to be a global platform. Currently, the application text is primarily hardcoded (often in Portuguese, given previous iterations). To reach a wider audience, we need to introduce internationalization (i18n) supporting English, Portuguese, and Spanish.

## Objectives
- Integrate standard React Native localization libraries (`i18next`, `react-i18next`, `expo-localization`).
- Extract hardcoded strings from core screens (Feed, Library, Studio, Settings, Account).
- Provide a language switcher in the Settings screen so users can override the system default.

## Constraints
- Do not introduce massive bundle size increases.
- Fallback to English if the user's system locale is unsupported.
- Use `useTranslation` hooks natively in functional components to ensure reactive re-renders when language changes.
