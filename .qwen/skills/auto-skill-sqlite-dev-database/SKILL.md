---
name: sqlite-dev-database
description: Pattern for SQLite development database with Supabase-compatible fluent interface for production parity
source: auto-skill
extracted_at: '2026-07-03T11:12:19.296Z'
---

# SQLite Dev Database with Supabase Production Parity

## When to Use

- Local development without external database dependencies
- Quick prototyping before production Supabase setup
- Single-user development where RLS isn't needed
- Zero-config local database with production schema parity

## Setup Steps

1. **Install better-sqlite3** (native sync driver):
   ```bash
   npm install better-sqlite3
   npm install --save-dev @types/better-sqlite3
   ```

2. **Create SQLite adapter** (`backend/src/lib/sqlite.ts`) that replicates the Supabase fluent interface:
   ```ts
   import Database from "better-sqlite3"
   
   // Supabase-compatible query builder
   class SQLiteQueryBuilder {
     private state: { table, wheres, orderBy, limit, offset, insertData, updateData }
     
     select(cols = "*") { /* ... */ }
     eq(column, value) { this.state.wheres.push({ column, operator: "=", value }); return this }
     in(column, values) { /* ... */ }
     order(column, opts?) { /* ... */ }
     limit(n) { /* ... */ }
     insert(data) { /* ... */ }
     update(data) { /* ... */ }
     delete() { /* ... */ }
     async maybeSingle() { /* execute + return first row or null */ }
   }
   
   export const sqlite = {
     from(table: string) { return new SQLiteQueryBuilder(table) },
     auth: { /* stub — auth handled by Express routes */ }
   }
   ```

3. **Mirror Supabase schema** in SQLite:
   - UUID → TEXT with `crypto.randomUUID()`
   - TIMESTAMPTZ → TEXT with `new Date().toISOString()`
   - BOOLEAN → INTEGER (0/1)
   - JSONB → TEXT with `JSON.stringify()`/`JSON.parse()`
   - Use `CREATE TABLE IF NOT EXISTS` for auto-initialization

4. **Swap in supabase.ts** based on env var:
   ```ts
   const dbMode = process.env.DATABASE_MODE || "sqlite"
   export const supabase = dbMode === "supabase" 
     ? createSupabaseClient() 
     : sqlite
   ```

5. **Auto-create database file** on import:
   ```ts
   const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), "data", "openband.sqlite")
   const dataDir = path.dirname(DB_PATH)
   if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
   const db = new Database(DB_PATH)
   db.pragma("journal_mode = WAL")
   db.pragma("foreign_keys = ON")
   ```

6. **Add to .gitignore**:
   ```
   backend/data/*.sqlite
   backend/data/*.sqlite-wal
   backend/data/*.sqlite-shm
   ```

## Key Differences from Supabase

| Feature | Supabase (PostgreSQL) | SQLite (dev) |
|---------|----------------------|--------------|
| UUID | `gen_random_uuid()` | `crypto.randomUUID()` (JS) |
| Timestamps | `NOW()` (server) | `new Date().toISOString()` |
| JSON columns | Native `jsonb` | TEXT with JSON stringify/parse |
| Booleans | Native `boolean` | INTEGER (0/1) |
| RLS | Native policies | Not enforced (single-user) |
| Storage | Supabase Storage | Not implemented |

## Supported Methods

- `.from(table)` — Select table
- `.select(cols)` — Column selection (default: `*`)
- `.eq(col, val)` / `.neq(col, val)` — Filters
- `.in(col, vals)` — IN clause
- `.order(col, { ascending })` — ORDER BY
- `.limit(n)` / `.offset(n)` — Pagination
- `.insert(data)` — INSERT rows
- `.update(data)` — UPDATE rows
- `.delete()` — DELETE rows
- `.maybeSingle()` — Return 0 or 1 row
- `.single()` — Return exactly 1 row

## Not Supported in SQLite Mode

- `supabase.auth.*` methods (handled by Express auth routes)
- Storage bucket operations (use local filesystem)
- Realtime subscriptions (no WebSocket push)
- RPC functions (PostgreSQL-specific)
