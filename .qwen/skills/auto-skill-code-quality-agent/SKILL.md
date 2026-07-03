---
name: code-quality-agent
description: Unified code quality agent — enforces clean code (no `any`, explicit types, factory patterns), DDD architecture separation, offline-first defaults, and Three.js isometric studio patterns (project)
---

## Rule

This is the unified code quality agent. It enforces all standards below on every code review and implementation.

### 1. Clean Code

| Rule | Enforcement |
|------|-------------|
| **No `any`** | Use explicit interfaces, generics, or `unknown` + narrowing |
| **Factory functions** | `createX(config)` over `new X()` for object creation |
| **Single Responsibility** | One purpose per function/module |
| **Descriptive names** | `createDatabaseConnection` not `initDb` |
| **Remove dead code** | No unused imports, variables, functions |

### 2. Domain-Driven Architecture

| Layer | Path | Purpose |
|-------|------|---------|
| Domain | `src/lib/`, `src/types/` | Business logic, entities, value objects |
| Application | `src/context/`, `src/hooks/` | Use cases, orchestration |
| Infrastructure | `src/bridge/`, adapters | External services, I/O |
| Interface | `app/`, `src/components/` | UI, routing |

### 3. Offline-First Default

- All features work without backend
- WebSocket/collaboration is optional enhancement
- CDN dependencies must have graceful fallback
- No hardcoded backend URLs (use env vars with empty fallback)

### 4. Three.js Isometric Studio

```ts
// Camera (orthographic for isometric)
const camera = new THREE.OrthographicCamera(-d*a, d*a, d, -d, 0.1, 100)
camera.position.set(10, 10, 10)

// Renderer (no antialias for crisp look)
const renderer = new THREE.WebGLRenderer({ antialias: false })

// Furniture (MeshToonMaterial for flat shading)
const mat = new THREE.MeshToonMaterial({ color })
mesh.userData = { furnitureId: id, route }

// Raycaster selection
const raycaster = new THREE.Raycaster()
raycaster.setFromCamera(mouse, camera)
const hits = raycaster.intersectObjects(furnitureMeshes)

// HTML overlays (don't navigate away from 3D)
// Show overlay div on furniture click, keep scene running
```

### 5. Patterns

| Pattern | When | Example |
|---------|------|---------|
| Factory | Creating objects | `createQueryBuilder({ table })` |
| Repository | Data access | `sqlite.from("projects").eq("id", id)` |
| Adapter | External services | `supabase.ts` → SQLite fallback |
| Strategy | Swappable algorithms | Web vs native audio playback |
| Overlay | Tool UI in 3D scene | HTML div on canvas click |

### 6. Forbidden

- `any` type (use `unknown` + narrowing)
- God classes / files > 500 lines
- Mixed concerns (UI + business logic same file)
- Implicit `any` from missing types
- Hardcoded backend URLs
- Blocking network calls without fallback

### How to apply

Check every file against these rules during review. Fix violations directly — don't just comment.
