import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "./apiUrl";

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
const DEFAULT_SERVER_URL = API_BASE_URL;

function presenceCacheKey(projectId: string): string {
  return `presence:${projectId}`;
}

function loadCachedCursors(projectId: string): Map<string, PresenceCursor> {
  try {
    const raw = localStorage.getItem(presenceCacheKey(projectId));
    if (raw) {
      const parsed = JSON.parse(raw) as PresenceCursor[];
      return new Map(parsed.map((c) => [c.userId, c]));
    }
  } catch {
    // ignore corrupt cache
  }
  return new Map();
}

function saveCursorsToCache(projectId: string, cursors: Map<string, PresenceCursor>): void {
  try {
    const entries = Array.from(cursors.values());
    localStorage.setItem(presenceCacheKey(projectId), JSON.stringify(entries));
  } catch {
    // ignore storage write failures
  }
}

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
  const [cursors, setCursors] = useState<Map<string, PresenceCursor>>(() => {
    const key = projectId ?? "";
    const memCached = PRESENCE_STORE.get(key);
    if (memCached) return memCached;
    if (projectId) return loadCachedCursors(projectId);
    return new Map();
  });
  const [isConnected, setIsConnected] = useState(false);
  const lastSentRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const cleanupFnRef = useRef<(() => void) | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffMsRef = useRef(1000);
  const maxBackoffMs = 30000;
  const reconnectOnLineRef = useRef<(() => void) | null>(null);

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
      if (projectId) saveCursorsToCache(projectId, store);
    },
    [getStore, projectId],
  );

  const connect = useCallback(() => {
    if (!projectId) return;

    const url = getEventSourceUrl(serverUrl, projectId);
    let es: EventSource;

    try {
      es = new EventSource(url);

      es.onopen = () => {
        setIsConnected(true);
        backoffMsRef.current = 1000;
      };

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
        setIsConnected(false);
        es.close();
        eventSourceRef.current = null;

        const delay = Math.min(backoffMsRef.current, maxBackoffMs);
        backoffMsRef.current = Math.min(backoffMsRef.current * 2, maxBackoffMs);

        reconnectTimerRef.current = setTimeout(() => {
          if (navigator.onLine) {
            connect();
          }
        }, delay);
      };

      eventSourceRef.current = es;

      const leaveUrl = getLeaveUrl(serverUrl, projectId);
      cleanupFnRef.current = () => {
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        fetch(leaveUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
          keepalive: true,
        }).catch(() => {
          // best-effort leave
        });

        es.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      };
    } catch (e) {
      console.warn("Failed to connect to presence server:", e);
      setIsConnected(false);
    }
  }, [projectId, serverUrl, userId, updateCursor]);

  useEffect(() => {
    if (!projectId) return;

    connect();

    const handleOnline = () => {
      if (!eventSourceRef.current) {
        backoffMsRef.current = 1000;
        connect();
      }
    };
    reconnectOnLineRef.current = handleOnline;
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
      reconnectOnLineRef.current = null;
      if (cleanupFnRef.current) {
        cleanupFnRef.current();
        cleanupFnRef.current = null;
      }
    };
  }, [projectId, connect]);

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

  return { cursors, sendCursor, isConnected };
}

export function clearPresenceStore(): void {
  PRESENCE_STORE.clear();
}
