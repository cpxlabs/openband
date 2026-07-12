# Design — i18n Completeness

## Current State (verified)
- `src/lib/i18n.ts:1-57` — complete i18next init. Resources keyed `en` / `pt` / `es`. `changeLanguage(lng)` persists to `localStorage["openband_language"]`. Imported for side-effect in `app/_layout.tsx:3`.
- `src/locales/{en,pt,es}.json` — only `settings`, `feed`, `library`, `account` namespaces (~14 keys each).
- `app/tabs/settings.tsx:60-79` — language toggle maps `['en','pt','es']` and calls `changeLanguage`. Mock profile + "Aparência"/"Escuro" still hardcoded.
- Only 4 files use `useTranslation`: `app/tabs/{index,account,library,settings}.tsx`.

## File / Namespace Mapping

| Namespace (new/extended) | Files to extract from | Notes |
|---|---|---|
| `settings` | `app/tabs/settings.tsx` | add mock-profile fields (`profileName`, `profileEmail`, `profileBio`, `profileLocation`, `memberSince`), appearance (`appearance`, `themeDark`, `themeLight`), info section (`info`) |
| `feed` | `app/tabs/index.tsx`, `app/tabs/feed.tsx` | already partial; add share/copy toasts, genre list labels, error alerts |
| `library` | `app/tabs/library.tsx` | already partial; add confirm/sheet strings |
| `account` | `app/tabs/account.tsx` | already partial; add sign-out confirm |
| `newProject` (new) | `src/components/NewProject.tsx` | "Novo Projeto", "Escolha o mood", genre/mood labels, back/next/done, scratch option |
| `studio` (new) | `app/studio/[id].tsx` | permission alert, record/generate/MIDI import errors, command-palette labels (`Play`,`Record`,`Undo`,`Redo`,`Delete`,`Add Track`,…), track menu, "Salvo ✓", compare/mix labels |
| `extractor` (new) | `app/extractor.tsx` | "Exportação iniciada (demo)", preset labels, status strings |
| `mastering` (new) | `app/mastering/index.tsx` | chain labels, export strings, LUFS labels |
| `mixer` (new) | `app/mixing-console.tsx` | transport glyphs are unicode (keep), but any text labels |
| `moments` (new) | `app/tabs/moments.tsx` | store/sample-pack strings |
| `explorer` (new) | `app/tabs/explorer.tsx` | browse strings |

## Locale Strategy
- Canonical default locale: `pt-BR`. Update `src/lib/i18n.ts` resources to key `pt-BR` (keep `pt` as an alias mapping to the same `pt` JSON so the existing settings toggle keeps working), set `lng` default to `'pt-BR'` and `fallbackLng: 'en'`.
- `getLocales()[0].languageCode` may return `pt`/`en`/`es` — normalize `pt`→`pt-BR` in the init resolver.

## `useT` Convenience Hook
Add to `src/lib/i18n.ts`:
```
export const useT = () => useTranslation().t;
```
Migrated screens call `const t = useT();` and use `t("namespace.key", "English fallback")` so missing keys still render readable English instead of the key string. This keeps the existing `t(key, fallback)` pattern already used in `app/tabs/index.tsx`.

## Provider / Wiring
react-i18next is global; no React context provider is required. `app/_layout.tsx:3` already imports `src/lib/i18n` for side-effect initialization, which runs before the tree renders. No structural change to `_layout.tsx` is needed beyond optionally gating the first paint on `i18n.isInitialized` (defensive, not required). The settings toggle (`app/tabs/settings.tsx:60-79`) is extended to the `pt-BR` key and keeps `changeLanguage`.

## Extraction Approach (manual)
There is no i18n lint or auto-extractor in this repo (no `i18next-scanner`, no babel plugin). Extraction is **manual**:
1. For each target screen, grep visible string literals (JSX text, `Alert.alert` titles/messages, `Toast`/`console`-facing user strings).
2. Add a namespaced key + English default to `en.json`; mirror to `pt.json` (pt-BR) and `es.json`.
3. Replace the literal with `t("namespace.key", "English default")`.
4. Keep code/identifier strings (e.g. command IDs `"transport.play"`, MIDI tokens `"REST"`, canvas glyphs) out of the dictionary — they are not user-visible.

## Verification
- `npx tsc --noEmit` clean (new keys are plain JSON; hook signature typed).
- `npx vitest run` passes, including the new coverage test.
- Visual smoke: switch language in Settings → all migrated screens reflect pt-BR / en / es with no leftover hardcoded English/Portuguese in the migrated batch.
