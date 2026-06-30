import type { CrdtOperation } from "./crdt";

export interface SnapshotData {
  id: string;
  projectId: string;
  timestamp: number;
  state: Record<string, unknown>;
  operationCount: number;
  version: number;
}

export interface SnapshotConfig {
  maxOperationsBeforeSnapshot: number;
  maxTimeBetweenSnapshotsMs: number;
  maxSnapshotHistory: number;
}

const DEFAULT_CONFIG: SnapshotConfig = {
  maxOperationsBeforeSnapshot: 100,
  maxTimeBetweenSnapshotsMs: 5 * 60 * 1000,
  maxSnapshotHistory: 10,
};

const SNAPSHOT_STORE = new Map<string, SnapshotData[]>();
const OPERATION_COUNTER = new Map<string, { count: number; lastSnapshot: number }>();

function generateSnapshotId(): string {
  return `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSnapshot(
  projectId: string,
  state: Record<string, unknown>,
  operationCount: number,
  version: number,
): SnapshotData {
  const snapshot: SnapshotData = {
    id: generateSnapshotId(),
    projectId,
    timestamp: Date.now(),
    state: JSON.parse(JSON.stringify(state)),
    operationCount,
    version,
  };

  if (!SNAPSHOT_STORE.has(projectId)) {
    SNAPSHOT_STORE.set(projectId, []);
  }

  const snapshots = SNAPSHOT_STORE.get(projectId)!;
  snapshots.push(snapshot);

  if (snapshots.length > DEFAULT_CONFIG.maxSnapshotHistory) {
    snapshots.splice(0, snapshots.length - DEFAULT_CONFIG.maxSnapshotHistory);
  }

  OPERATION_COUNTER.set(projectId, {
    count: 0,
    lastSnapshot: Date.now(),
  });

  return snapshot;
}

export function getLatestSnapshot(
  projectId: string,
): SnapshotData | null {
  const snapshots = SNAPSHOT_STORE.get(projectId);
  if (!snapshots || snapshots.length === 0) return null;
  return snapshots[snapshots.length - 1];
}

export function getSnapshotHistory(
  projectId: string,
): SnapshotData[] {
  return SNAPSHOT_STORE.get(projectId) ?? [];
}

export function shouldSnapshot(
  projectId: string,
  config: Partial<SnapshotConfig> = {},
): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const counter = OPERATION_COUNTER.get(projectId);

  if (!counter) return true;

  if (counter.count >= cfg.maxOperationsBeforeSnapshot) return true;

  if (Date.now() - counter.lastSnapshot >= cfg.maxTimeBetweenSnapshotsMs) {
    return true;
  }

  return false;
}

export function incrementOperationCount(projectId: string): void {
  const counter = OPERATION_COUNTER.get(projectId);
  if (counter) {
    counter.count++;
  } else {
    OPERATION_COUNTER.set(projectId, {
      count: 1,
      lastSnapshot: Date.now(),
    });
  }
}

export function compactOperations(
  operations: CrdtOperation[],
  snapshot: SnapshotData,
): CrdtOperation[] {
  return operations.filter((op) => op.timestamp > snapshot.version);
}

export function mergeSnapshotIntoState(
  snapshot: Record<string, unknown>,
  operations: CrdtOperation[],
): Record<string, unknown> {
  let state = JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;

  for (const op of operations) {
    state = applyOperationToState(state, op);
  }

  return state;
}

function applyOperationToState(
  state: Record<string, unknown>,
  op: CrdtOperation,
): Record<string, unknown> {
  const parts = op.path.split(".");
  const result = { ...state };

  let current: Record<string, unknown> = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (Array.isArray(current[key])) {
      current[key] = [...(current[key] as unknown[])];
    } else {
      current[key] = { ...(current[key] as Record<string, unknown>) };
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = parts[parts.length - 1];

  switch (op.type) {
    case "track.add":
    case "note.add":
    case "chord.update":
      if (Array.isArray(current[lastKey])) {
        current[lastKey] = [...(current[lastKey] as unknown[]), op.value];
      } else {
        current[lastKey] = op.value;
      }
      break;
    case "track.remove":
    case "note.remove":
      if (Array.isArray(current[lastKey])) {
        const arr = current[lastKey] as { id: string }[];
        current[lastKey] = arr.filter(
          (item) => item.id !== (op.value as { id: string }).id,
        );
      }
      break;
    case "track.update":
    case "note.update":
    case "mix.update":
      if (Array.isArray(current[lastKey])) {
        const arr = current[lastKey] as { id: string }[];
        const val = op.value as { id: string; [key: string]: unknown };
        current[lastKey] = arr.map((item) =>
          item.id === val.id ? { ...item, ...val } : item,
        );
      } else {
        current[lastKey] = {
          ...(current[lastKey] as Record<string, unknown>),
          ...(op.value as Record<string, unknown>),
        };
      }
      break;
  }

  return result;
}

export function clearSnapshotStore(projectId?: string): void {
  if (projectId) {
    SNAPSHOT_STORE.delete(projectId);
    OPERATION_COUNTER.delete(projectId);
  } else {
    SNAPSHOT_STORE.clear();
    OPERATION_COUNTER.clear();
  }
}
