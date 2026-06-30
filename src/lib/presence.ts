import { useCallback, useEffect, useRef, useState } from "react";

export interface PresenceCursor {
  userId: string;
  userName?: string;
  cursorX: number;
  activeTrackId: string | null;
  playheadPosition: number;
  lastSeen: number;
}

interface PresenceOptions {
  projectId: string | null;
  serverUrl?: string;
  userId: string;
  userName?: string;
  throttleMs?: number;
}

const PRESENCE_STORE = new Map<string, Map<string, PresenceCursor>>();
const DEFAULT_SERVER_URL = "http://localhost:3001";

function getEventSourceUrl(base: string, projectId: string): string {
  const baseUrl = base.replace(/\/+$/, "");
  return `${baseUrl}/api/presence/${encodeURIComponent(projectId)}/subscribe`;
}

function getCursorUrl(base: string, projectId: string): string {
  const baseUrl = base.replace(/\/+$/, "");
  return `${baseUrl}/api/presence/${encodeURIComponent(projectId)}/cursor`;
}

function getLeaveUrl(base: string, projectId: string): string {
  const baseUrl = base.replace(/\/+$/, "");
  return `${baseUrl}/api/presence/${encodeURIComponent(projectId)}/leave`;
}

export function usePresence({
  projectId,
  serverUrl = DEFAULT_SERVER_URL,
  userId,
  userName,
  throttleMs = 50,
}: PresenceOptions) {
  const [cursors, setCursors] = useState<Map<string, PresenceCursor>>(
    () => PRESENCE_STORE.get(projectId ?? "") ?? new Map(),
  );
  const lastSentRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const cleanupFnRef = useRef<(() => void) | null>(null);

  const getStore = useCallback(() => {
    const key = projectId ?? "global";
    if (!PRESENCE_STORE.has(key)) {
      PRESENCE_STORE.set(key, new Map());
    }
    return PRESENCE_STORE.get(key)!;
  }, [projectId]);

  const updateCursor = useCallback(
    (data: Omit<PresenceCursor, "lastSeen">) => {
      const store = getStore();
      const cursor: PresenceCursor = {
        ...data,
        lastSeen: Date.now(),
      };
      store.set(data.userId, cursor);
      setCursors(new Map(store));
    },
    [getStore],
  );

  useEffect(() => {
    if (!projectId) return;

    const url = getEventSourceUrl(serverUrl, projectId);
    let es: EventSource;

    try {
      es = new EventSource(url);

      es.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as Omit<PresenceCursor, "lastSeen">;
          if (data.userId !== userId) {
            updateCursor(data);
          }
        } catch (e) {
          console.warn("Failed to parse presence data:", e);
        }
      };

      es.onerror = () => {
        es.close();
      };

      eventSourceRef.current = es;

      const leaveUrl = getLeaveUrl(serverUrl, projectId);
      cleanupFnRef.current = () => {
        fetch(leaveUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
          keepalive: true,
        }).catch((e) => {
          console.warn("Failed to send leave notification:", e);
        });

        es.close();
        eventSourceRef.current = null;
      };
    } catch (e) {
      console.warn("Failed to connect to presence server:", e);
    }

    return () => {
      if (cleanupFnRef.current) {
        cleanupFnRef.current();
        cleanupFnRef.current = null;
      }
    };
  }, [projectId, serverUrl, userId, updateCursor]);

  const sendCursor = useCallback(
    (cursorX: number, activeTrackId: string | null, playheadPosition: number) => {
      if (!projectId) return;

      const now = Date.now();
      if (now - lastSentRef.current < throttleMs) return;
      lastSentRef.current = now;

      const url = getCursorUrl(serverUrl, projectId);
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userName: userName ?? userId,
          cursorX,
          activeTrackId,
          playheadPosition,
        }),
      }).catch((e) => {
        console.warn("Failed to send cursor:", e);
      });
    },
    [projectId, serverUrl, userId, userName, throttleMs],
  );

  return { cursors, sendCursor };
}

export function clearPresenceStore(): void {
  PRESENCE_STORE.clear();
}
