# SQLite Development Database

OpenBand uses **SQLite** as the default development database and **Supabase** for production. This gives you a zero-config local dev experience with full production parity when you're ready to deploy.

---

## How It Works

| Mode       | Database  | Use case                          |
| ---------- | --------- | --------------------------------- |
| `sqlite`   | Local file (`backend/data/openband.sqlite`) | Development, testing, prototyping |
| `supabase` | Cloud PostgreSQL (Supabase)     | Production, staging, multi-user   |

The switch is controlled by a single environment variable:

```env
DATABASE_MODE=sqlite    # Local SQLite (default)
DATABASE_MODE=supabase  # Cloud Supabase
```

When `DATABASE_MODE=sqlite`, the backend uses a **Supabase-compatible adapter** (`backend/src/lib/sqlite.ts`) that replicates the Supabase fluent query interface:

```ts
// Same code works in both modes:
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .eq("owner_id", userId)
  .order("updated_at", { ascending: false })
```

---

## Schema Parity

The SQLite schema (`backend/src/lib/sqlite.ts`) mirrors the Supabase schema (`supabase/schema.sql`) with all 11 tables:

| Table                | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `profiles`           | User accounts with auth fields           |
| `projects`           | Music projects (songs)                   |
| `tracks`             | Audio tracks within projects             |
| `stems`              | Audio clips on the timeline              |
| `posts`              | Published projects on the global feed    |
| `user_sessions`      | JWT session tracking                     |
| `remixes`            | Remix/derivative relationship graph      |
| `project_reactions`  | Likes/reactions on projects              |
| `project_activity`   | Audit trail / activity log               |
| `bands`              | Shared band accounts (RBAC)              |
| `band_members`       | Band membership with roles               |

### Key Differences

| Feature                | Supabase (PostgreSQL)   | SQLite (dev)                 |
| ---------------------- | ----------------------- | ---------------------------- |
| UUID generation        | `gen_random_uuid()`     | `crypto.randomUUID()` (JS)   |
| Timestamps             | `NOW()` (server)        | `new Date().toISOString()`   |
| JSON columns           | Native `jsonb`          | TEXT with JSON stringify     |
| Boolean columns        | Native `boolean`        | INTEGER (0/1)                |
| Row Level Security     | Native RLS policies     | Not enforced (single-user)   |
| Storage buckets        | Supabase Storage        | Not implemented (use local)  |
| Auth triggers          | `auth.users` trigger    | Handled by Express routes    |

---

## Getting Started

### 1. Install dependencies

```bash
cd backend
npm install
```

This installs `better-sqlite3` (native SQLite binding with sync API).

### 2. Start the backend

```bash
cd backend
npm run dev
```

The database file is auto-created at `backend/data/openband.sqlite` on first run. No additional setup needed.

### 3. Verify

The backend starts on `http://localhost:3001`. All API endpoints work immediately with the SQLite database.

---

## Database File Management

### Location

```
backend/data/openband.sqlite          # Main database
backend/data/openband.sqlite-wal      # WAL journal (auto-managed)
backend/data/openband.sqlite-shm      # Shared memory (auto-managed)
```

### Reset the database

```bash
rm backend/data/openband.sqlite*
npm run dev   # Auto-recreates with fresh schema
```

### Inspect with CLI

```bash
# Using sqlite3 CLI
sqlite3 backend/data/openband.sqlite ".tables"
sqlite3 backend/data/openband.sqlite "SELECT * FROM profiles;"

# Using DB Browser for SQLite (GUI)
# Open: backend/data/openband.sqlite
```

### Backup

```bash
cp backend/data/openband.sqlite backup.sqlite
```

---

## Switching to Supabase (Production)

When you're ready to deploy:

### 1. Set up Supabase

Follow the guide in [docs/supabase.md](supabase.md).

### 2. Update environment

```env
DATABASE_MODE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Restart

```bash
npm run dev
```

The backend now connects to Supabase. The same API routes work without code changes.

---

## Environment Variables

See `backend/.env.example` for all available variables:

| Variable                | Default                | Description                           |
| ----------------------- | ---------------------- | ------------------------------------- |
| `DATABASE_MODE`         | `sqlite`               | `sqlite` or `supabase`                |
| `SQLITE_DB_PATH`        | `data/openband.sqlite` | Path to SQLite database file          |
| `SUPABASE_URL`          | `http://localhost:54321` | Supabase project URL                |
| `SUPABASE_SERVICE_ROLE_KEY` | (empty)          | Supabase service role key             |
| `JWT_SECRET`            | `openband_jwt_secret_dev` | JWT signing secret                 |
| `GOOGLE_CLIENT_ID`      | (empty)                | Google OAuth client ID                |
| `PORT`                  | `3001`                 | Backend server port                   |

---

## Adapter Interface

The SQLite adapter (`backend/src/lib/sqlite.ts`) implements a Supabase-compatible fluent query builder:

### Supported Methods

| Method             | Description                          | Example                                |
| ------------------ | ------------------------------------ | -------------------------------------- |
| `.from(table)`     | Select table                         | `sqlite.from("profiles")`              |
| `.select(cols)`    | Column selection (default: `*`)      | `.select("id, email, name")`           |
| `.eq(col, val)`    | Equals filter                        | `.eq("owner_id", userId)`              |
| `.neq(col, val)`   | Not equals filter                    | `.neq("is_deleted", true)`             |
| `.in(col, vals)`   | IN clause                            | `.in("id", ["a", "b"])`                |
| `.order(col, opts)`| ORDER BY                             | `.order("updated_at", { ascending: false })` |
| `.limit(n)`        | LIMIT                                | `.limit(10)`                           |
| `.offset(n)`       | OFFSET                               | `.offset(20)`                          |
| `.insert(data)`    | INSERT row(s)                        | `.insert({ email, name })`             |
| `.update(data)`    | UPDATE row(s)                        | `.update({ title: "New" })`            |
| `.delete()`        | DELETE row(s)                        | `.delete().eq("id", projectId)`        |
| `.maybeSingle()`   | Return 0 or 1 row                    | `await .maybeSingle()`                 |
| `.single()`        | Return exactly 1 row (throws if 0)   | `await .single()`                      |

### Not Supported (SQLite mode)

| Method                   | Reason                          |
| ------------------------ | ------------------------------- |
| `supabase.auth.*`        | Auth handled by Express routes  |
| Storage operations       | Use local file system instead   |
| Realtime subscriptions   | No WebSocket push in SQLite     |
| RPC functions            | PostgreSQL-specific             |

---

## Troubleshooting

| Problem                              | Solution                                              |
| ------------------------------------ | ----------------------------------------------------- |
| `SQLITE_CANTOPEN`                    | Check `SQLITE_DB_PATH` — directory must exist         |
| `no such table: profiles`            | Delete `backend/data/openband.sqlite*` and restart    |
| `better-sqlite3 native build failed` | Run `npm rebuild better-sqlite3` or reinstall Node    |
| Auth works but DB queries fail       | Verify `DATABASE_MODE` — should be `sqlite` for dev   |
| JSON columns return strings          | Adapter auto-parses JSON for known columns            |
