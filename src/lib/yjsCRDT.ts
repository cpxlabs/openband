export interface CRDTOperation {
  id: string;
  lamport: number;
  author: string;
  timestamp: number;
  path: string;
  action: "set" | "delete" | "insert" | "move";
  value?: unknown;
  oldValue?: unknown;
}

export interface CRDTDocument {
  id: string;
  operations: CRDTOperation[];
  stateVector: Map<string, number>;
  conflicts: CRDTOperation[];
  version: number;
}

export interface CRDTSyncMessage {
  type: "sync" | "update" | "ack" | "request" | "state_vector";
  documentId: string;
  operations?: CRDTOperation[];
  stateVector?: Map<string, number> | Record<string, number>;
  fromAuthor: string;
  timestamp: number;
}

interface DocumentStore {
  documents: Map<string, CRDTDocument>;
  pendingOps: CRDTOperation[];
  ackedVersions: Map<string, number>;
}

let store: DocumentStore = {
  documents: new Map(),
  pendingOps: [],
  ackedVersions: new Map(),
};

let lamportClock = 0;
let ws: WebSocket | null = null;
let syncCallback: ((docId: string, ops: CRDTOperation[]) => void) | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let wsUrl = "ws://localhost:3001/collab";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nextLamport(remote?: number): number {
  lamportClock = Math.max(lamportClock, remote ?? 0) + 1;
  return lamportClock;
}

function getStateVector(): Map<string, number> {
  const sv = new Map<string, number>();
  for (const [docId, doc] of store.documents) {
    sv.set(docId, doc.version);
  }
  return sv;
}

function mergeOperations(target: CRDTDocument, ops: CRDTOperation[]): CRDTOperation[] {
  const existingIds = new Set(target.operations.map((o) => o.id));
  const newOps = ops.filter((o) => !existingIds.has(o.id));

  newOps.sort((a, b) => {
    if (a.lamport !== b.lamport) return a.lamport - b.lamport;
    return a.author.localeCompare(b.author);
  });

  for (const op of newOps) {
    target.operations.push(op);
    target.version = Math.max(target.version, op.lamport);
  }

  return newOps;
}

function applyToState(
  state: Record<string, unknown>,
  ops: CRDTOperation[],
): Record<string, unknown> {
  const result = { ...state };

  for (const op of ops) {
    const pathParts = op.path.split("/").filter(Boolean);

    if (pathParts.length === 0) continue;

    if (op.action === "set") {
      let current: Record<string, unknown> = result;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]] || typeof current[pathParts[i]] !== "object") {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]] as Record<string, unknown>;
      }
      current[pathParts[pathParts.length - 1]] = op.value;
    } else if (op.action === "delete") {
      let current: Record<string, unknown> = result;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) break;
        current = current[pathParts[i]] as Record<string, unknown>;
      }
      delete current[pathParts[pathParts.length - 1]];
    } else if (op.action === "insert" && Array.isArray(op.value)) {
      let current: Record<string, unknown> = result;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]] || typeof current[pathParts[i]] !== "object") {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]] as Record<string, unknown>;
      }
      const key = pathParts[pathParts.length - 1];
      const arr = Array.isArray(current[key]) ? current[key] as unknown[] : [];
      current[key] = [...arr, ...op.value];
    }
  }

  return result;
}

export function initCRDT(url?: string): void {
  if (url) wsUrl = url;
  store = {
    documents: new Map(),
    pendingOps: [],
    ackedVersions: new Map(),
  };
  lamportClock = 0;
}

export function createDocument(docId: string): CRDTDocument {
  if (store.documents.has(docId)) {
    return store.documents.get(docId)!;
  }

  const doc: CRDTDocument = {
    id: docId,
    operations: [],
    stateVector: new Map(),
    conflicts: [],
    version: 0,
  };

  store.documents.set(docId, doc);
  return doc;
}

export function getDocument(docId: string): CRDTDocument | null {
  return store.documents.get(docId) ?? null;
}

export function createOperation(
  docId: string,
  path: string,
  action: CRDTOperation["action"],
  value?: unknown,
  oldValue?: unknown,
  author: string = "local",
): CRDTOperation {
  const doc = store.documents.get(docId);
  const remoteVersion = doc?.version ?? 0;

  const op: CRDTOperation = {
    id: generateId(),
    lamport: nextLamport(remoteVersion),
    author,
    timestamp: Date.now(),
    path,
    action,
    value,
    oldValue,
  };

  return op;
}

export function applyOperation(
  docId: string,
  op: CRDTOperation,
): CRDTOperation | null {
  const doc = store.documents.get(docId);
  if (!doc) return null;

  const newOps = mergeOperations(doc, [op]);
  if (newOps.length === 0) return null;

  store.pendingOps.push(op);

  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "update",
      documentId: docId,
      operations: [op],
      fromAuthor: op.author,
      timestamp: op.timestamp,
    } satisfies CRDTSyncMessage));
  }

  if (syncCallback) {
    syncCallback(docId, newOps);
  }

  return op;
}

export function getDocumentState(docId: string): Record<string, unknown> | null {
  const doc = store.documents.get(docId);
  if (!doc) return null;

  return applyToState({}, doc.operations);
}

export function getOperationsSince(
  docId: string,
  sinceVersion: number,
): CRDTOperation[] {
  const doc = store.documents.get(docId);
  if (!doc) return [];

  return doc.operations.filter((op) => op.lamport > sinceVersion);
}

export function getStateVectorFor(docId: string): number {
  return store.documents.get(docId)?.version ?? 0;
}

export function connectToSync(
  url?: string,
  onSync?: (docId: string, ops: CRDTOperation[]) => void,
): void {
  if (url) wsUrl = url;
  syncCallback = onSync ?? null;

  if (typeof WebSocket === "undefined") return;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      reconnectAttempts = 0;
      console.log("CRDT sync connected");
      const sv = getStateVector();
      ws?.send(JSON.stringify({
        type: "state_vector",
        documentId: "*",
        stateVector: Object.fromEntries(sv),
        fromAuthor: "local",
        timestamp: Date.now(),
      } satisfies CRDTSyncMessage));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as CRDTSyncMessage;
        handleSyncMessage(msg);
      } catch (e) {
        console.warn("Failed to parse sync message:", e);
      }
    };

    ws.onclose = () => {
      const backoff = Math.min(3000 * Math.pow(2, reconnectAttempts), 60000);
      console.log(`CRDT sync disconnected, reconnecting in ${backoff}ms (attempt ${reconnectAttempts + 1})...`);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectAttempts++;
      reconnectTimer = setTimeout(() => connectToSync(url, onSync), backoff);
    };

    ws.onerror = (e) => {
      console.warn("CRDT sync error:", e);
    };
  } catch (e) {
    console.warn("Failed to connect CRDT sync:", e);
  }
}

function handleSyncMessage(msg: CRDTSyncMessage): void {
  switch (msg.type) {
    case "update": {
      if (!msg.operations) break;
      let doc = store.documents.get(msg.documentId);
      if (!doc) {
        doc = createDocument(msg.documentId);
      }
      mergeOperations(doc, msg.operations);

      ws?.send(JSON.stringify({
        type: "ack",
        documentId: msg.documentId,
        fromAuthor: "local",
        timestamp: Date.now(),
        stateVector: Object.fromEntries(new Map([[msg.documentId, doc.version]])),
      } satisfies CRDTSyncMessage));

      if (syncCallback) {
        syncCallback(msg.documentId, msg.operations);
      }
      break;
    }
    case "sync": {
      if (!msg.operations) break;
      let doc = store.documents.get(msg.documentId);
      if (!doc) {
        doc = createDocument(msg.documentId);
      }
      mergeOperations(doc, msg.operations);

      const pending = store.pendingOps.filter(
        (op) => op.timestamp > (store.ackedVersions.get(msg.documentId) ?? 0),
      );
      if (pending.length > 0) {
        ws?.send(JSON.stringify({
          type: "update",
          documentId: msg.documentId,
          operations: pending,
          fromAuthor: "local",
          timestamp: Date.now(),
        } satisfies CRDTSyncMessage));
      }
      break;
    }
    case "state_vector": {
      if (!msg.stateVector) break;
      const remoteVersions = msg.stateVector as unknown as Record<string, number>;
      for (const [docId, remoteVersion] of Object.entries(remoteVersions)) {
        const doc = store.documents.get(docId);
        if (doc) {
          const missing = doc.operations.filter((op) => op.lamport > remoteVersion);
          if (missing.length > 0) {
            ws?.send(JSON.stringify({
              type: "sync",
              documentId: docId,
              operations: missing,
              fromAuthor: "local",
              timestamp: Date.now(),
            } satisfies CRDTSyncMessage));
          }
        }
      }
      break;
    }
    case "ack": {
      break;
    }
  }
}

export function disconnectSync(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}

export function disposeCRDT(): void {
  disconnectSync();
  store.documents.clear();
  store.pendingOps = [];
  store.ackedVersions.clear();
  lamportClock = 0;
}

export function resolveConflicts(
  docId: string,
  strategy: "last_writer_wins" | "merge" = "last_writer_wins",
): CRDTOperation[] {
  const doc = store.documents.get(docId);
  if (!doc) return [];

  const conflicts: CRDTOperation[] = [];
  const resolved: CRDTOperation[] = [];

  const pathOps = new Map<string, CRDTOperation[]>();
  for (const op of doc.operations) {
    const key = `${op.path}:${op.action}`;
    if (!pathOps.has(key)) pathOps.set(key, []);
    pathOps.get(key)!.push(op);
  }

  for (const [, ops] of pathOps) {
    if (ops.length > 1) {
      conflicts.push(...ops.slice(1));

      if (strategy === "last_writer_wins") {
        const winner = ops.reduce((latest, op) =>
          op.timestamp > latest.timestamp ? op : latest,
        );
        resolved.push(winner);
      } else {
        resolved.push(...ops);
      }
    } else {
      resolved.push(ops[0]);
    }
  }

  doc.conflicts = conflicts;
  return resolved;
}
