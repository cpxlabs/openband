---
name: clean-code-violation-fix
description: Workflow for systematically fixing P0-P3 code quality violations using parallel subagents — security, type safety, dead code elimination, and offline-first patterns
source: auto-skill
extracted_at: '2026-07-03T15:48:29.007Z'
---

## Rule

Systematic approach to fixing code quality violations organized by priority (P0 = critical → P3 = improvement).

### Priority Levels

| Priority | Category | Examples |
|----------|----------|----------|
| **P0** | Security | Hardcoded JWT secrets, API keys in source |
| **P1** | Type safety / URLs | `any` types, hardcoded localhost URLs |
| **P2** | Dead code / SRP | Unused modules, files >500 lines, DDD layer leaks |
| **P3** | Naming / Patterns | Opaque numeric types, missing factories, no offline fallback |

### Fix Workflow

1. **Run code review** via subagent to catalog all violations by priority
2. **Launch parallel subagents** for independent fix groups:
   - P0+P1: Security fixes (env-var-only secrets) + type fixes + URL extraction
   - P2: Delete dead code modules (grep for imports first, skip if used by tests)
   - P3: Naming clarity, factory functions, offline fallbacks
3. **Fix cascading test failures**:
   - Remove imports for deleted modules from test files
   - Remove test describe blocks for deleted modules
   - Add missing type fields to test object literals
4. **Verify**: `tsc --noEmit`, `vitest run`, `npm run build`
5. **Commit** with bullet-list description of each fix category

### P0: Hardcoded Secrets

Create `backend/src/config/jwt.ts`:
```ts
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET environment variable is required")
  return secret
}
```
Replace all `process.env.X || "fallback"` patterns with imports of the getter function.

### P1: Shared URL Constant

Create `src/lib/apiUrl.ts`:
```ts
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || ""
```
Import this in all files that previously had hardcoded `"http://localhost:3001"`.

### P2: Dead Code Detection

Before deleting, grep for imports:
```bash
grep -r "from.*module_name" --include="*.ts" --include="*.tsx" .
```
If only tests import it, either delete tests too or integrate the module.

### P3: Offline Patterns

**Presence**: Cache cursors in localStorage, exponential backoff reconnect (1s→30s), `navigator.onLine` listener.
**Collaboration**: IndexedDB queue for operations when offline, flush on reconnect.

### How to apply

When user says "fix violations" or "clean code ddd agent": run review → launch parallel subagents → fix test fallout → verify → commit.
