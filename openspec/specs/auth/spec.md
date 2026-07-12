# Auth

## Overview
OpenBand supports both anonymous **visitor** sessions and full authenticated accounts (email/password, Google OAuth, and in-app magic links). A visitor session can be **converted into a real account** without losing the visitor id. Subscription **tiers** (`FREE`, `TIER1_LIVE`, `TIER2_STUDIO`) gate features on the backend; the frontend `AuthContext` tracks visitor state but does not yet surface tier to the UI.

## Implementation Notes
- `src/context/AuthContext.tsx` — `AuthProvider` exposes `{ session, user, loading, isVisitor, visitorId, signOut, signInAsVisitor, convertVisitorToAccount }`. Visitor sessions are persisted in `localStorage` (`openband_visitor_session`) and synthesized into a `Session`/`User` with `is_anonymous: true`, provider `"visitor"`. `convertVisitorToAccount` POSTs to `/api/auth/convert-visitor` and, on success, clears the visitor session and installs the returned real session.
- `backend/src/routes/auth.ts` — `register`, `login` (bcrypt + JWT), `google` (Google OAuth token exchange), `me` (token introspection), `convert-visitor` (creates an account from a visitor id, bcrypt-hashing the password and issuing a JWT).
- `backend/src/routes/magicLink.ts` — issues and verifies **signed** magic-link tokens (HMAC/JWT), delivered in-app (no SMTP). Verification returns a session/JWT.
- `backend/src/routes/tier.ts` + `backend/src/middleware/tierGuard.ts` — `getTierLimits(tier)`, `checkTierAccess(tier, feature)`, `requireFeature(feature)`, `requireTier(minimumTier)`. Tier is read from the `x-user-tier` request header (default `FREE`). `requireFeature` returns `403` when the feature is disabled for the tier.

## Requirements

### Requirement: Visitor / Anonymous Session
The system MUST allow a user to start a session without credentials, persisted locally and represented as an anonymous `User` (`is_anonymous: true`, provider `"visitor"`).

#### Scenario: Start visitor session
- **Given** no Supabase session exists
- **When** `signInAsVisitor()` is called
- **Then** `isVisitor` is `true`, a `visitorId` is generated, and the session is stored in `localStorage`
- **And** `user.is_anonymous` is `true`

### Requirement: Convert Visitor to Account
The system MUST let a visitor upgrade to a real account, POSTing email/password/name + `visitorId` to `/api/auth/convert-visitor`, then replacing the visitor session with the returned authenticated session.

#### Scenario: Convert keeps the visitor id linkage
- **Given** an active visitor session with `visitorId`
- **When** `convertVisitorToAccount(email, password)` succeeds
- **Then** the visitor session is cleared and `isVisitor` becomes `false`
- **And** the new `user` is authenticated with the supplied email

### Requirement: Email / Password Authentication
The system MUST register and log in users with email + password, hashing passwords with bcrypt and issuing a JWT.

#### Scenario: Login with correct password
- **Given** a registered user
- **When** `POST /api/auth/login` with valid credentials
- **Then** a JWT is returned and `POST /api/auth/me` resolves the user

### Requirement: Google OAuth
The system MUST support Google sign-in by exchanging a Google OAuth token server-side (`/api/auth/google`) and issuing an OpenBand JWT.

#### Scenario: Google token exchange
- **Given** a valid Google ID token
- **When** `POST /api/auth/google` is called
- **Then** a session/JWT is returned for the corresponding Google identity

### Requirement: In-App Magic Link
The system MUST issue a signed magic-link token and verify it in-app (no email delivery), returning a session/JWT on verification.

#### Scenario: Magic-link verify
- **Given** a valid signed magic-link token
- **When** the verification endpoint is called
- **Then** a session/JWT is returned

### Requirement: Tier Gating (Backend-Enforced)
The backend MUST gate features by tier via `requireFeature` / `requireTier` (read from `x-user-tier`), returning `403` when the tier lacks the feature.

#### Scenario: Free tier blocked from video export
- **Given** request header `x-user-tier: FREE`
- **When** a `canExportVideo`-gated route is hit
- **Then** the response is `403`

#### Scenario: Higher tier allowed
- **Given** request header `x-user-tier: TIER1_LIVE`
- **When** a `canExportVideo`-gated route is hit
- **Then** the request proceeds (not `403`)

### Requirement: Tier Surfacing (UI)
The frontend `AuthContext` MUST expose the active `tier` (defaulting to `FREE`) and `tierLimits`, fetch them from `GET /api/user/tier` on session load and after a visitor-to-account conversion (fail-closed to FREE on error), render the tier in the account/settings screens, and MUST gate the remix/publish action when `canCreateRemixes` / `canPublishToFeed` is false with an upgrade prompt.

#### Scenario: Default tier is FREE
- **Given** no tier data is available yet
- **When** `AuthProvider` mounts
- **Then** `tier` is `FREE` and `tierLimits.canCreateRemixes` is `false`

#### Scenario: Visitor sees upgrade prompt on remix
- **Given** the active `tier` is `FREE`
- **When** the remix action is triggered
- **Then** an upgrade `Alert` is shown and navigation is blocked

#### Scenario: Higher tier can remix
- **Given** a successful `/api/user/tier` fetch returns `TIER1_LIVE`
- **When** the remix action is triggered
- **Then** navigation proceeds (not blocked by the gate)

## Test Requirements (Vitest)
- [ ] `getTierLimits("FREE")` disables `canExportVideo` while `TIER1_LIVE` enables it
- [ ] `checkTierAccess` returns the boolean limit for a feature
- [ ] visitor session round-trips through `localStorage`
- [ ] `convertVisitorToAccount` clears the visitor session on success
- [ ] `AuthProvider` defaults to `FREE` tier with `canCreateRemixes: false` and updates `tierLimits` after a successful `/api/user/tier` fetch
