import Database from "better-sqlite3"
import path from "path"
import fs from "fs"

const DB_PATH =
  process.env.SQLITE_DB_PATH ||
  path.join(process.cwd(), "data", "openband.sqlite")

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db: import("better-sqlite3").Database = new Database(DB_PATH)

// WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL")
db.pragma("foreign_keys = ON")

// ─── Helpers ───────────────────────────────────────────────────────────────

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function rowToCamel(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    // JSON columns stay as-is
    if (typeof value === "string" && (key === "chords" || key === "details" || key === "mixing_preferences" || key === "creative_tags")) {
      try {
        result[toCamelCase(key)] = JSON.parse(value)
      } catch {
        result[toCamelCase(key)] = value
      }
    } else {
      result[toCamelCase(key)] = value
    }
  }
  return result
}

function rowsToCamel(rows: unknown[]): Record<string, unknown>[] {
  return rows.map((r) => rowToCamel(r as Record<string, unknown>))
}

function camelizeKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase()
    if (value !== undefined) {
      result[snakeKey] =
        typeof value === "object" && value !== null ? JSON.stringify(value) : value
    }
  }
  return result
}

// ─── Supabase-compatible fluent query builder ──────────────────────────────

type OrderDirection = "asc" | "desc"

interface QueryState {
  table: string
  selects: string
  wheres: { column: string; operator: string; value: unknown }[]
  orderBy: { column: string; ascending: boolean } | null
  limitVal: number | null
  offsetVal: number | null
  insertData: Record<string, unknown> | Record<string, unknown>[] | null
  updateData: Record<string, unknown> | null
  deleteAll: boolean
  inClause: { column: string; values: unknown[] } | null
}

class SQLiteQueryBuilder {
  private state: QueryState

  constructor(table: string) {
    this.state = {
      table,
      selects: "*",
      wheres: [],
      orderBy: null,
      limitVal: null,
      offsetVal: null,
      insertData: null,
      updateData: null,
      deleteAll: false,
      inClause: null,
    }
  }

  select(columns = "*"): this {
    this.state.selects = columns
    return this
  }

  eq(column: string, value: unknown): this {
    this.state.wheres.push({ column, operator: "=", value })
    return this
  }

  neq(column: string, value: unknown): this {
    this.state.wheres.push({ column, operator: "!=", value })
    return this
  }

  in(column: string, values: unknown[]): this {
    this.state.inClause = { column, values }
    return this
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    this.state.orderBy = {
      column,
      ascending: opts?.ascending ?? true,
    }
    return this
  }

  limit(n: number): this {
    this.state.limitVal = n
    return this
  }

  offset(n: number): this {
    this.state.offsetVal = n
    return this
  }

  insert(data: Record<string, unknown> | Record<string, unknown>[]): this {
    this.state.insertData = data
    return this
  }

  update(data: Record<string, unknown>): this {
    this.state.updateData = data
    return this
  }

  delete(): this {
    this.state.deleteAll = true
    return this
  }

  // ─── Result modifiers ─────────────────────────────────────────────────

  async single(): Promise<{ data: Record<string, unknown>; error: Error | null }> {
    const result = await this.maybeSingle()
    if (!result.data) {
      return { data: null as unknown as Record<string, unknown>, error: new Error("Expected a single row but got none") }
    }
    return { data: result.data, error: null }
  }

  async maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
    try {
      const rows = await this.execute()
      if (rows.length === 0) return { data: null, error: null }
      return { data: rows[0] as Record<string, unknown>, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }

  // ─── Execution ────────────────────────────────────────────────────────

  async execute(): Promise<unknown[]> {
    const { table } = this.state

    // INSERT
    if (this.state.insertData) {
      return this.executeInsert()
    }

    // UPDATE
    if (this.state.updateData) {
      return this.executeUpdate()
    }

    // DELETE
    if (this.state.deleteAll) {
      return this.executeDelete()
    }

    // SELECT
    return this.executeSelect()
  }

  private executeInsert(): unknown[] {
    const { table, insertData } = this.state
    const rows = Array.isArray(insertData) ? insertData : [insertData]
    const inserted: unknown[] = []

    for (const row of rows) {
      const data = camelizeKeys(row as Record<string, unknown>)
      const columns = Object.keys(data)
      const values = Object.values(data)
      const placeholders = values.map(() => "?").join(", ")
      const colList = columns.join(", ")

      // Auto-generate UUIDs for id columns
      const finalColumns = [...columns]
      const finalValues = [...values]
      if (!data.id) {
        finalColumns.unshift("id")
        finalValues.unshift(crypto.randomUUID())
      }
      if (!data.created_at) {
        finalColumns.push("created_at")
        finalValues.push(new Date().toISOString())
      }
      if (!data.updated_at && db.prepare(`PRAGMA table_info(${table})`).all().some((c: any) => c.name === "updated_at")) {
        finalColumns.push("updated_at")
        finalValues.push(new Date().toISOString())
      }

      const placeholdersFull = finalValues.map(() => "?").join(", ")
      const sql = `INSERT INTO ${table} (${finalColumns.join(", ")}) VALUES (${placeholdersFull})`

      const stmt = db.prepare(sql)
      stmt.run(...finalValues)

      // Return inserted row
      const id = finalValues[finalColumns.indexOf("id")]
      const fetched = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id)
      if (fetched) {
        inserted.push(rowToCamel(fetched as Record<string, unknown>))
      }
    }

    return inserted
  }

  private executeUpdate(): unknown[] {
    const { table, updateData, wheres, inClause } = this.state

    if (!updateData) return []

    const data = camelizeKeys(updateData)
    const entries = Object.entries(data)

    if (!entries.length) return []

    // Auto-update updated_at
    if (!data.updated_at && db.prepare(`PRAGMA table_info(${table})`).all().some((c: any) => c.name === "updated_at")) {
      entries.push(["updated_at", new Date().toISOString()])
    }

    const setClause = entries.map(([col]) => `${col} = ?`).join(", ")
    const values = entries.map(([, v]) => v)

    let sql = `UPDATE ${table} SET ${setClause}`
    const whereClauses: string[] = []
    const whereValues: unknown[] = []

    for (const w of wheres) {
      const snakeCol = w.column.replace(/([A-Z])/g, "_$1").toLowerCase()
      whereClauses.push(`${snakeCol} ${w.operator} ?`)
      whereValues.push(w.value)
    }

    if (inClause) {
      const snakeCol = inClause.column.replace(/([A-Z])/g, "_$1").toLowerCase()
      const placeholders = inClause.values.map(() => "?").join(", ")
      whereClauses.push(`${snakeCol} IN (${placeholders})`)
      whereValues.push(...inClause.values)
    }

    if (whereClauses.length) {
      sql += " WHERE " + whereClauses.join(" AND ")
      values.push(...whereValues)
    }

    db.prepare(sql).run(...values)

    // Return updated rows
    const idCol = whereClauses.length ? wheres[0]?.column : null
    if (idCol) {
      const snakeIdCol = idCol.replace(/([A-Z])/g, "_$1").toLowerCase()
      const idVal = wheres[0]?.value
      const rows = db.prepare(`SELECT * FROM ${table} WHERE ${snakeIdCol} = ?`).all(idVal)
      return rowsToCamel(rows as Record<string, unknown>[])
    }

    return []
  }

  private executeDelete(): unknown[] {
    const { table, wheres, inClause } = this.state

    let sql = `DELETE FROM ${table}`
    const values: unknown[] = []
    const whereClauses: string[] = []

    for (const w of wheres) {
      const snakeCol = w.column.replace(/([A-Z])/g, "_$1").toLowerCase()
      whereClauses.push(`${snakeCol} ${w.operator} ?`)
      values.push(w.value)
    }

    if (inClause) {
      const snakeCol = inClause.column.replace(/([A-Z])/g, "_$1").toLowerCase()
      const placeholders = inClause.values.map(() => "?").join(", ")
      whereClauses.push(`${snakeCol} IN (${placeholders})`)
      values.push(...inClause.values)
    }

    if (whereClauses.length) {
      sql += " WHERE " + whereClauses.join(" AND ")
    }

    db.prepare(sql).run(...values)
    return []
  }

  private executeSelect(): unknown[] {
    const { table, selects, wheres, inClause } = this.state

    // Column selection
    const selectCols = selects === "*" ? "*" : selects.split(",").map((c) => c.trim()).map((c) => c.replace(/([A-Z])/g, "_$1").toLowerCase()).join(", ")

    let sql = `SELECT ${selectCols} FROM ${table}`
    const values: unknown[] = []
    const whereClauses: string[] = []

    for (const w of wheres) {
      const snakeCol = w.column.replace(/([A-Z])/g, "_$1").toLowerCase()
      whereClauses.push(`${snakeCol} ${w.operator} ?`)
      values.push(w.value)
    }

    if (inClause) {
      const snakeCol = inClause.column.replace(/([A-Z])/g, "_$1").toLowerCase()
      const placeholders = inClause.values.map(() => "?").join(", ")
      whereClauses.push(`${snakeCol} IN (${placeholders})`)
      values.push(...inClause.values)
    }

    if (whereClauses.length) {
      sql += " WHERE " + whereClauses.join(" AND ")
    }

    // ORDER BY
    if (this.state.orderBy) {
      const snakeCol = this.state.orderBy.column.replace(/([A-Z])/g, "_$1").toLowerCase()
      const dir = this.state.orderBy.ascending ? "ASC" : "DESC"
      sql += ` ORDER BY ${snakeCol} ${dir}`
    }

    // LIMIT / OFFSET
    if (this.state.limitVal !== null) {
      sql += ` LIMIT ${this.state.limitVal}`
    }
    if (this.state.offsetVal !== null) {
      sql += ` OFFSET ${this.state.offsetVal}`
    }

    const rows = db.prepare(sql).all(...values)
    return rowsToCamel(rows as Record<string, unknown>[])
  }
}

// ─── Public API (Supabase-compatible) ──────────────────────────────────────

export const sqlite = {
  from(table: string) {
    return new SQLiteQueryBuilder(table)
  },

  // Auth stub — SQLite doesn't manage auth sessions like Supabase
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: null, error: new Error("Not supported in SQLite mode") }),
    signUp: async () => ({ data: null, error: new Error("Not supported in SQLite mode") }),
    updateUser: async () => ({ data: null, error: new Error("Not supported in SQLite mode") }),
  },
}

// ─── Schema initialization ────────────────────────────────────────────────

const SCHEMA_SQL = `
-- Profiles
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

-- Projects
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

-- Tracks
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

-- Stems
CREATE TABLE IF NOT EXISTS stems (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  start_time REAL NOT NULL DEFAULT 0.0,
  duration REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  master_audio_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User Sessions
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

-- Remixes
CREATE TABLE IF NOT EXISTS remixes (
  id TEXT PRIMARY KEY,
  original_project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  remixed_project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES profiles(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(original_project_id, remixed_project_id)
);

-- Project Reactions
CREATE TABLE IF NOT EXISTS project_reactions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, user_id, reaction)
);

-- Project Activity
CREATE TABLE IF NOT EXISTS project_activity (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bands
CREATE TABLE IF NOT EXISTS bands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Band Members
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
  db.exec(SCHEMA_SQL)
}

// Initialize schema on import
initializeSchema()

// Graceful shutdown
process.on("beforeExit", () => {
  db.close()
})

export { db }
