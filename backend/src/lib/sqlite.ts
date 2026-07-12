import Database from "better-sqlite3"
import path from "path"
import fs from "fs"

// ─── Types ────────────────────────────────────────────────────────────────

type Operator = "=" | "!="

interface DbRow {
  [key: string]: unknown
}

interface WhereClause {
  column: string
  operator: Operator
  value: unknown
}

interface InClause {
  column: string
  values: unknown[]
}

interface OrderBy {
  column: string
  ascending: boolean
}

interface QueryResult<T = DbRow> {
  data: T | null
  error: Error | null
}

interface SingleResult<T = DbRow> {
  data: T
  error: Error | null
}

// JSON column names that need parsing
const JSON_COLUMNS = new Set([
  "chords",
  "details",
  "mixing_preferences",
  "creative_tags",
])

// ─── Factory: Database Connection ─────────────────────────────────────────

interface DatabaseConfig {
  path?: string
  walMode?: boolean
  foreignKeys?: boolean
}

function createDatabaseConnection(config: DatabaseConfig = {}): Database.Database {
  const dbPath = config.path || path.join(process.cwd(), "data", "openband.sqlite")

  const dataDir = path.dirname(dbPath)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const db = new Database(dbPath)

  if (config.walMode !== false) {
    db.pragma("journal_mode = WAL")
  }
  if (config.foreignKeys !== false) {
    db.pragma("foreign_keys = ON")
  }

  return db
}

// ─── Factory: Query Builder ───────────────────────────────────────────────

interface QueryBuilderConfig {
  table: string
  columns?: string
  where?: WhereClause[]
  inClause?: InClause
  orderBy?: OrderBy
  limit?: number
  offset?: number
}

function createQueryBuilder(config: QueryBuilderConfig): QueryBuilder {
  return new QueryBuilder(config)
}

class QueryBuilder {
  private table: string
  private columns: string
  private wheres: WhereClause[]
  private inClause: InClause | null
  private orderBy: OrderBy | null
  private limitVal: number | null
  private offsetVal: number | null
  private db: Database.Database

  constructor(config: QueryBuilderConfig) {
    this.table = config.table
    this.columns = config.columns || "*"
    this.wheres = config.where || []
    this.inClause = config.inClause || null
    this.orderBy = config.orderBy || null
    this.limitVal = config.limit ?? null
    this.offsetVal = config.offset ?? null
    this.db = getDb()
  }

  select(cols: string): QueryBuilder {
    this.columns = cols
    return this
  }

  eq(column: string, value: unknown): QueryBuilder {
    this.wheres.push({ column, operator: "=", value })
    return this
  }

  neq(column: string, value: unknown): QueryBuilder {
    this.wheres.push({ column, operator: "!=", value })
    return this
  }

  in(column: string, values: unknown[]): QueryBuilder {
    this.inClause = { column, values }
    return this
  }

  order(column: string, ascending = true): QueryBuilder {
    this.orderBy = { column, ascending }
    return this
  }

  limit(n: number): QueryBuilder {
    this.limitVal = n
    return this
  }

  offset(n: number): QueryBuilder {
    this.offsetVal = n
    return this
  }

  async execute(): Promise<DbRow[]> {
    return this.buildSelect()
  }

  async single(): Promise<SingleResult> {
    const rows = await this.execute()
    if (rows.length === 0) {
      return { data: {} as DbRow, error: new Error("Expected a single row but got none") }
    }
    return { data: rows[0], error: null }
  }

  async maybeSingle(): Promise<QueryResult> {
    const rows = await this.execute()
    return rows.length === 0 ? { data: null, error: null } : { data: rows[0], error: null }
  }

  private buildSelect(): DbRow[] {
    const selectCols =
      this.columns === "*"
        ? "*"
        : this.columns
            .split(",")
            .map((c) => c.trim())
            .map(toSnakeCase)
            .join(", ")

    let sql = `SELECT ${selectCols} FROM ${this.table}`
    const values: unknown[] = []
    const whereParts = buildWhereClauses(this.wheres, this.inClause, values)

    if (whereParts.length > 0) {
      sql += ` WHERE ${whereParts.join(" AND ")}`
    }

    if (this.orderBy) {
      const dir = this.orderBy.ascending ? "ASC" : "DESC"
      sql += ` ORDER BY ${toSnakeCase(this.orderBy.column)} ${dir}`
    }

    if (this.limitVal !== null) sql += ` LIMIT ${this.limitVal}`
    if (this.offsetVal !== null) sql += ` OFFSET ${this.offsetVal}`

    const rows = this.db.prepare(sql).all(...values)
    return (rows as DbRow[]).map(rowToCamel)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase()
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

function rowToCamel(row: DbRow): DbRow {
  const result: DbRow = {}
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "string" && JSON_COLUMNS.has(key)) {
      try {
        result[toCamelCase(key)] = JSON.parse(value) as unknown
      } catch {
        result[toCamelCase(key)] = value
      }
    } else {
      result[toCamelCase(key)] = value
    }
  }
  return result
}

function buildWhereClauses(
  wheres: WhereClause[],
  inClause: InClause | null | undefined,
  outValues: unknown[],
): string[] {
  const parts: string[] = []

  for (const w of wheres) {
    parts.push(`${toSnakeCase(w.column)} ${w.operator} ?`)
    outValues.push(w.value)
  }

  if (inClause) {
    const placeholders = inClause.values.map(() => "?").join(", ")
    parts.push(`${toSnakeCase(inClause.column)} IN (${placeholders})`)
    outValues.push(...inClause.values)
  }

  return parts
}

// ─── Singleton ────────────────────────────────────────────────────────────

let dbInstance: Database.Database | null = null

function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = createDatabaseConnection()
  }
  return dbInstance
}

// ─── Public API (Supabase-compatible) ─────────────────────────────────────

export const sqlite = {
  from(table: string): QueryBuilder {
    return createQueryBuilder({ table })
  },

  auth: {
    getSession: async (): Promise<{
      data: { session: null }
      error: null
    }> => ({ data: { session: null }, error: null }),

    onAuthStateChange: (): {
      data: { subscription: { unsubscribe: () => void } }
    } => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),

    signOut: async (): Promise<{ error: null }> => ({ error: null }),

    signInWithPassword: async (): Promise<{
      data: null
      error: Error
    }> => ({
      data: null,
      error: new Error("Not supported in SQLite mode"),
    }),

    signUp: async (): Promise<{
      data: null
      error: Error
    }> => ({
      data: null,
      error: new Error("Not supported in SQLite mode"),
    }),

    updateUser: async (): Promise<{
      data: null
      error: Error
    }> => ({
      data: null,
      error: new Error("Not supported in SQLite mode"),
    }),
  },
}

// ─── Schema initialization ────────────────────────────────────────────────

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  password_hash TEXT,
  google_id TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT,
  tier TEXT DEFAULT 'FREE',
  creative_tags TEXT DEFAULT '[]',
  mixing_preferences TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sem título',
  bpm INTEGER NOT NULL DEFAULT 120,
  time_signature TEXT NOT NULL DEFAULT '4/4',
  is_public INTEGER NOT NULL DEFAULT 0,
  mood TEXT,
  cover_url TEXT,
  chords TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  parent_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  is_published INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  deleted_at TEXT,
  genre TEXT DEFAULT '',
  band_id TEXT REFERENCES bands(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Nova Trilha',
  volume REAL NOT NULL DEFAULT 1.0,
  muted INTEGER NOT NULL DEFAULT 0,
  solo INTEGER NOT NULL DEFAULT 0,
  pan REAL NOT NULL DEFAULT 0.0,
  order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stems (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  start_time REAL NOT NULL DEFAULT 0.0,
  duration REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  master_audio_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  type TEXT DEFAULT 'post',
  genre TEXT DEFAULT '',
  key TEXT DEFAULT '',
  bpm INTEGER DEFAULT 120,
  duration INTEGER DEFAULT 0,
  color TEXT DEFAULT 'bg-brand-primary',
  plays INTEGER DEFAULT 0,
  caption TEXT,
  image_url TEXT,
  song_title TEXT,
  comments INTEGER DEFAULT 0,
  time_ago TEXT DEFAULT 'now'
);

CREATE TABLE IF NOT EXISTS post_likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  device_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS remixes (
  id TEXT PRIMARY KEY,
  original_project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  remixed_project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES profiles(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(original_project_id, remixed_project_id)
);

CREATE TABLE IF NOT EXISTS project_reactions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, user_id, reaction)
);

CREATE TABLE IF NOT EXISTS project_activity (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS band_members (
  id TEXT PRIMARY KEY,
  band_id TEXT NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'VIEWER',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(band_id, user_id)
);
`

export function initializeSchema(): void {
  getDb().exec(SCHEMA_SQL)
  migratePostsColumns()
}

function migratePostsColumns(): void {
  const db = getDb()
  const columns = db.prepare("PRAGMA table_info(posts)").all() as { name: string }[]
  const existing = new Set(columns.map((c) => c.name))
  const additions: [string, string][] = [
    ["type", "TEXT DEFAULT 'post'"],
    ["genre", "TEXT DEFAULT ''"],
    ["key", "TEXT DEFAULT ''"],
    ["bpm", "INTEGER DEFAULT 120"],
    ["duration", "INTEGER DEFAULT 0"],
    ["color", "TEXT DEFAULT 'bg-brand-primary'"],
    ["plays", "INTEGER DEFAULT 0"],
    ["caption", "TEXT"],
    ["image_url", "TEXT"],
    ["song_title", "TEXT"],
    ["comments", "INTEGER DEFAULT 0"],
    ["time_ago", "TEXT DEFAULT 'now'"],
  ]
  for (const [col, def] of additions) {
    if (!existing.has(col)) {
      db.prepare(`ALTER TABLE posts ADD COLUMN ${col} ${def}`).run()
    }
  }
}

initializeSchema()

export { getDb as db }
