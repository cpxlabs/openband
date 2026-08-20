export type RecordKind = "preview" | "approved" | "lock" | "history" | "meta";

export interface StoredProject {
  id: string;
  contentHash: string;
  locks?: unknown;
  history?: unknown[];
  [k: string]: unknown;
}

export interface LogEntry {
  level: string;
  message: string;
  meta?: Record<string, unknown>;
}

export const SECRET_KEYS: readonly string[] = [
  "token",
  "password",
  "secret",
  "authToken",
  "apiKey",
];

const EPHEMERAL_KINDS: ReadonlySet<RecordKind> = new Set<RecordKind>(["preview"]);

export function isEphemeral(kind: RecordKind): boolean {
  return EPHEMERAL_KINDS.has(kind);
}

export function shouldPersist(kind: RecordKind): boolean {
  return !isEphemeral(kind);
}

export function sanitizeLog(entry: LogEntry): LogEntry {
  if (!entry.meta) return { ...entry };
  const meta: Record<string, unknown> = {};
  for (const key of Object.keys(entry.meta)) {
    if (SECRET_KEYS.includes(key)) {
      meta[key] = "[redacted]";
    } else {
      meta[key] = entry.meta[key];
    }
  }
  return { ...entry, meta };
}

export function boundedHistory<T>(items: T[], keep: number): T[] {
  if (keep <= 0) return [];
  if (items.length <= keep) return items.slice();
  return items.slice(items.length - keep);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}

export function computeProjectHash(project: {
  id: string;
  recipe?: unknown;
  locks?: unknown;
}): string {
  const payload = stableStringify({
    id: project.id,
    recipe: project.recipe ?? null,
    locks: project.locks ?? null,
  });
  let h = 2166136261 >>> 0;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return ("0000000" + h.toString(16)).slice(-8);
}

export function validateStoredProject(project: StoredProject): boolean {
  if (!project || typeof project.contentHash !== "string") return false;
  const recomputed = computeProjectHash({
    id: project.id,
    recipe: project.recipe,
    locks: project.locks,
  });
  return recomputed === project.contentHash;
}

export class PrivacyWipe {
  private onWipe: (scope: "ephemeral" | "all") => void;
  constructor(opts: { onWipe: (scope: "ephemeral" | "all") => void }) {
    this.onWipe = opts.onWipe;
  }
  wipeEphemeral(): void {
    this.onWipe("ephemeral");
  }
  wipeAll(): void {
    this.onWipe("all");
  }
}
