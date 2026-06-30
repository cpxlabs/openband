import { useCallback, useEffect, useRef, useState } from "react";
import {
  createOperation,
  mergeOperations,
  applyOperation,
  decodeState,
  getClientId,
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

export function useCollaboration({
  projectId,
  userId,
  userName,
  serverUrl = "http://localhost:3001",
}: CollaborationOptions) {
  const [state, setState] = useState<CollaborationState>({
    operations: [],
    connectedUsers: [],
    isHost: true,
  });
  const eventSourceRef = useRef<EventSource | null>(null);
  const operationsRef = useRef<CrdtOperation[]>([]);

  const getStoreKey = useCallback(() => projectId ?? "global", [projectId]);

  useEffect(() => {
    if (!projectId) return;

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

      es.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "operations") {
            const incoming = data.operations as CrdtOperation[];
            operationsRef.current = mergeOperations(
              operationsRef.current,
              incoming,
            );
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
        es.close();
        eventSourceRef.current = null;
      };
    } catch (e) {
      console.warn("Failed to connect to collab server:", e);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [projectId, userId, userName, serverUrl, getStoreKey]);

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
      }).catch((e) => {
        console.warn("Failed to send operation:", e);
      });
    },
    [projectId, userId, userName, serverUrl, getStoreKey],
  );

  const applyToState = useCallback(
    (localState: Record<string, unknown>): Record<string, unknown> => {
      let result = { ...localState };
      for (const op of operationsRef.current) {
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
  };
}
