import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "./apiUrl";
import {
  createOperation,
  mergeOperations,
  applyOperation,
  decodeState,
  getClientId,
  compactOperations,
  type CrdtOperation,
} from "./crdt";

interface CollaborationOptions {
  projectId: string | null;
  userId: string;
  userName?: string;
  serverUrl?: string;
}

interface CollaborationState {
  operations: CrdtOperation[];
  connectedUsers: { userId: string; userName: string }[];
  isHost: boolean;
}

const OPERATION_STORE = new Map<string, CrdtOperation[]>();
const COLLAB_DB_NAME = "collaboration-queue";
const COLLAB_DB_VERSION = 1;
const COLLAB_STORE_NAME = "pending-operations";

function queueKey(projectId: string): string {
  return `${projectId}:queue`;
}

async function openQueueDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return null;
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(COLLAB_DB_NAME, COLLAB_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(COLLAB_STORE_NAME)) {
          db.createObjectStore(COLLAB_STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch (e) {
      console.warn("Failed to open collaboration queue DB:", e);
      resolve(null);
    }
  });
}

async function enqueueOperation(
  projectId: string,
  operation: CrdtOperation,
  userId: string,
  userName: string,
): Promise<void> {
  const db = await openQueueDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(COLLAB_STORE_NAME, "readwrite");
      const store = tx.objectStore(COLLAB_STORE_NAME);
      store.put({
        id: `${queueKey(projectId)}:${operation.id}`,
        projectId,
        operation,
        userId,
        userName,
        queuedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (e) {
      console.warn("Failed to enqueue operation:", e);
      resolve();
    }
  });
}

async function readQueuedOperations(projectId: string): Promise<
  Array<{ operation: CrdtOperation; userId: string; userName: string; id: string }>
> {
  const db = await openQueueDb();
  if (!db) return [];
  const items: Array<{ operation: CrdtOperation; userId: string; userName: string; id: string }> =
    [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(COLLAB_STORE_NAME, "readonly");
      const store = tx.objectStore(COLLAB_STORE_NAME);
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const entry = cursor.value as {
            id: string;
            projectId: string;
            operation: CrdtOperation;
            userId: string;
            userName: string;
          };
          if (entry.projectId === projectId) {
            items.push({
              id: entry.id,
              operation: entry.operation,
              userId: entry.userId,
              userName: entry.userName,
            });
          }
          cursor.continue();
        }
      };
      tx.onerror = () => resolve(items);
    } catch (e) {
      console.warn("Failed to read queued operations:", e);
      resolve(items);
    }
  });
}

async function deleteQueuedOperation(id: string): Promise<void> {
  const db = await openQueueDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(COLLAB_STORE_NAME, "readwrite");
      tx.objectStore(COLLAB_STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (e) {
      console.warn("Failed to delete queued operation:", e);
      resolve();
    }
  });
}

export function useCollaboration({
  projectId,
  userId,
  userName,
  serverUrl = API_BASE_URL,
}: CollaborationOptions) {
  const [state, setState] = useState<CollaborationState>({
    operations: [],
    connectedUsers: [],
    isHost: true,
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const eventSourceRef = useRef<EventSource | null>(null);
  const operationsRef = useRef<CrdtOperation[]>([]);
  const appliedOpIdsRef = useRef<Set<string>>(new Set());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectingRef = useRef(false);
  const backoffMsRef = useRef(1000);
  const maxBackoffMs = 30000;

  const getStoreKey = useCallback(() => projectId ?? "global", [projectId]);

  const flushQueue = useCallback(async () => {
    if (!projectId) return;
    const baseUrl = serverUrl.replace(/\/+$/, "");
    const url = `${baseUrl}/api/collab/${encodeURIComponent(projectId)}/operation`;

    const queued = await readQueuedOperations(projectId);
    for (const entry of queued) {
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operation: entry.operation,
            userId: entry.userId,
            userName: entry.userName,
          }),
        });
        await deleteQueuedOperation(entry.id);
      } catch (e) {
        console.warn("Failed to flush queued operation, keeping for retry:", e);
      }
    }
  }, [projectId, serverUrl]);

  const connect = useCallback(() => {
    if (!projectId) return;
    if (connectingRef.current) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    connectingRef.current = true;

    const key = getStoreKey();
    if (!OPERATION_STORE.has(key)) {
      OPERATION_STORE.set(key, []);
    }
    operationsRef.current = OPERATION_STORE.get(key) ?? [];
    setState((prev) => ({ ...prev, operations: operationsRef.current }));

    const baseUrl = serverUrl.replace(/\/+$/, "");
    const url = `${baseUrl}/api/collab/${encodeURIComponent(projectId)}/subscribe?userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName || userId)}`;

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsOnline(true);
        backoffMsRef.current = 1000;
        connectingRef.current = false;
        flushQueue();
      };

      es.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "operations") {
            const incoming = data.operations as CrdtOperation[];
            operationsRef.current = mergeOperations(
              operationsRef.current,
              incoming,
            );
            if (operationsRef.current.length > 2000) {
              operationsRef.current = compactOperations(operationsRef.current, 2000);
            }
            OPERATION_STORE.set(key, operationsRef.current);
            setState((prev) => ({
              ...prev,
              operations: [...operationsRef.current],
            }));
          } else if (data.type === "users") {
            setState((prev) => ({
              ...prev,
              connectedUsers: data.users ?? [],
            }));
          } else if (data.type === "fullState") {
            const decoded = decodeState(data.state);
            if (decoded.operations.length > 0) {
              operationsRef.current = mergeOperations(
                operationsRef.current,
                decoded.operations,
              );
              if (operationsRef.current.length > 2000) {
                operationsRef.current = compactOperations(operationsRef.current, 2000);
              }
              OPERATION_STORE.set(key, operationsRef.current);
              setState((prev) => ({
                ...prev,
                operations: [...operationsRef.current],
                isHost: false,
              }));
            }
          }
        } catch (e) {
          console.warn("Failed to parse collab data:", e);
        }
      };

      es.onerror = () => {
        setIsOnline(false);
        es.close();
        eventSourceRef.current = null;
        connectingRef.current = false;

        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        const delay = Math.min(backoffMsRef.current, maxBackoffMs);
        backoffMsRef.current = Math.min(backoffMsRef.current * 2, maxBackoffMs);

        reconnectTimerRef.current = setTimeout(() => {
          if (navigator.onLine) {
            connect();
          }
        }, delay);
      };
    } catch (e) {
      console.warn("Failed to connect to collab server:", e);
      setIsOnline(false);
      connectingRef.current = false;
    }
  }, [projectId, userId, userName, serverUrl, getStoreKey, flushQueue]);

  useEffect(() => {
    if (!projectId) return;

    connect();

    const handleOnline = () => {
      setIsOnline(true);
      if (!eventSourceRef.current) {
        backoffMsRef.current = 1000;
        connect();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [projectId, connect]);

  const sendOperation = useCallback(
    (
      type: CrdtOperation["type"],
      path: string,
      value: unknown,
    ) => {
      if (!projectId) return;

      const op = createOperation(userId, type, path, value);
      operationsRef.current = mergeOperations(operationsRef.current, [op]);
      OPERATION_STORE.set(getStoreKey(), operationsRef.current);

      setState((prev) => ({
        ...prev,
        operations: [...operationsRef.current],
      }));

      if (navigator.onLine) {
        const baseUrl = serverUrl.replace(/\/+$/, "");
        const url = `${baseUrl}/api/collab/${encodeURIComponent(projectId)}/operation`;
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operation: op,
            userId,
            userName: userName || userId,
          }),
        }).catch(async (e) => {
          console.warn("Failed to send operation, queuing offline:", e);
          await enqueueOperation(projectId, op, userId, userName || userId);
        });
      } else {
        enqueueOperation(projectId, op, userId, userName || userId).catch(
          (e) => {
            console.warn("Failed to queue offline operation:", e);
          },
        );
      }
    },
    [projectId, userId, userName, serverUrl, getStoreKey],
  );

  const applyToState = useCallback(
    (localState: Record<string, unknown>): Record<string, unknown> => {
      let result = { ...localState };
      const pending = operationsRef.current.filter(
        (op) => !appliedOpIdsRef.current.has(op.id),
      );
      for (const op of pending) {
        appliedOpIdsRef.current.add(op.id);
        result = applyOperation(result, op);
      }
      return result;
    },
    [],
  );

  return {
    ...state,
    sendOperation,
    applyToState,
    clientId: getClientId(),
    isOnline,
  };
}
