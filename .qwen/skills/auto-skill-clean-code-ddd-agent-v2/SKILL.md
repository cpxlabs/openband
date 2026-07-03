---
name: clean-code-ddd-agent-v2
description: Clean code and domain-driven architecture review agent — enforces SOLID, factory patterns, no `any`, explicit types, separation of concerns
source: auto-skill
extracted_at: '2026-07-03T14:30:44.759Z'
---

## Rule

This skill MUST be invoked during every code review. It enforces:

### Clean Code
- **No `any` types** — use explicit interfaces, generics, or `unknown` with narrowing
- **Factory functions** over classes with constructors when creating objects
- **Single Responsibility** — one purpose per function/module
- **Descriptive names** — `createDatabaseConnection` not `initDb`
- **Remove unused code** — dead imports, variables, functions

### Domain-Driven Architecture
- **Domain layer** (`src/lib/`, `src/types/`) — business logic, entities, value objects
- **Application layer** (`src/context/`, `src/hooks/`) — use cases, orchestration
- **Infrastructure layer** (`src/bridge/`, `src/lib/supabase.ts`) — external services, adapters
- **Interface layer** (`app/`, `src/components/`) — UI, routing

### Patterns
| Pattern | When to use | Example |
|---------|-------------|---------|
| Factory | Creating objects with config | `createQueryBuilder({ table })` |
| Repository | Data access abstraction | `sqlite.from("projects").eq("id", id)` |
| Adapter | External service integration | `supabase.ts` → SQLite fallback |
| Strategy | Swappable algorithms | Audio playback: web vs native |

### Forbidden
- `any` type (use `unknown` + narrowing)
- God classes / files > 500 lines
- Mixed concerns (UI + business logic in same file)
- Implicit `any` from missing type declarations
- Direct `new Class()` — use factory functions

### How to apply
When reviewing code, check each file against these rules. Flag violations with specific suggestions.
