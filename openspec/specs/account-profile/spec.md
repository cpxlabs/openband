# Account Profile

## Overview
The Account screen (`app/tabs/account.tsx`) lets an authenticated or visitor user view and edit their profile, see their plan/tier badge and tier limits, and sign out. It consumes the `useAuth` hook from `src/context/AuthContext.tsx` for `user`, `signOut`, `tier`, and `tierLimits`. The screen is localized through `react-i18next` (`useTranslation`).

## Implementation Notes
`app/tabs/account.tsx` imports `PageHeader`, `Avatar`, `Button`, `TextInput`, `Divider`, `Badge` from `src/components` (`:6-12`) and `LAYOUT_MAX_WIDTHS` from `src/lib/responsive` (`:13`). Display name derives from `user.user_metadata.name` or the email prefix (`:19-21`). Saving the name calls `supabase.auth.updateUser({ data: { name } })` (`:34`). Plan info renders a `Badge text={tier} variant="active"` (`:115`) and `tierLimits` fields (maxProjects, maxTracks, canExportVideo). Sign out confirms via `Alert` then calls `signOut()` (`:48-65`). Auth state (`PlanTier`, `TierLimits`, `signOut`) is defined in `src/context/AuthContext.tsx` (`PlanTier` at `:14`, `TierLimits` at `:16`, `signOut` at `:211`). There is no delete-account action wired in the current screen.

## Requirements

### Requirement: View Profile
The account screen MUST display the user's avatar (`Avatar`, `size="lg"`), display name, and email, plus a connection status indicator.

#### Scenario: Render profile header
- **Given** a logged-in user with `name = "João"` and `email = "joao@openband.app"`
- **When** the Account tab renders
- **Then** `Avatar` shows the name, the display name and email text appear (`:78-82`)
- **And** a "Conectado" status badge is shown (`:102-108`)

### Requirement: Edit Display Name
The account screen MUST allow editing the display name via a `TextInput` and saving it through `supabase.auth.updateUser`. The save button MUST be disabled when the input is empty or unchanged.

#### Scenario: Save a new name
- **Given** the name field shows the current name
- **When** the user types a new name and taps "Salvar"
- **Then** `supabase.auth.updateUser({ data: { name } })` is called (`:34`)
- **And** on error an `Alert` shows `account.error` (`:37-39`)

#### Scenario: Save disabled when unchanged
- **Given** the name field equals the current name
- **When** the screen renders
- **Then** the "Salvar" `Button` is `disabled` (`:97`)

### Requirement: Show Plan / Tier Badge
The account screen MUST display the current plan tier as a `Badge variant="active"` and MUST list the relevant `tierLimits` (max projects, max tracks, video export).

#### Scenario: Render tier info
- **Given** `useAuth()` returns `tier = "TIER1_LIVE"`
- **When** the Plan section renders
- **Then** a `Badge` shows `TIER1_LIVE` (`:115`)
- **And** `tierLimits.maxProjects`, `maxTracks`, `canExportVideo` are listed (`:118-131`)

### Requirement: Sign Out
The account screen MUST provide a sign-out action that confirms with an `Alert` and then calls `signOut()`. For visitor sessions, `signOut` clears the visitor session (`:212-218`).

#### Scenario: Confirm and sign out
- **Given** a connected user
- **When** the user taps "Sair" and confirms the destructive action
- **Then** `signOut()` is awaited (`:54-57`)
- **And** the `Button` shows a loading state via `signingOut` (`:139`)

## Test Requirements (Vitest)
- [ ] Account screen renders `Avatar`, display name, and email from `user`
- [ ] "Salvar" `Button` is disabled when name is empty or equals current name
- [ ] Saving calls `supabase.auth.updateUser` with `{ data: { name } }`
- [ ] Plan section renders a `Badge` with `tier` and `tierLimits` values
- [ ] Tapping "Sair" shows a confirm `Alert` then invokes `signOut`
- [ ] `useAuth` exposes `tier`, `tierLimits`, and `signOut` used by the screen
