import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  usePresence,
  shouldSendCursor,
  mergeRemoteCursor,
  clearPresenceStore,
  type PresenceCursor,
} from "../src/lib/presence";

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  close() {
    this.closed = true;
  }
}

describe("presence throttle helper", () => {
  it("blocks a second send within throttle window", () => {
    expect(shouldSendCursor(1000, 1020, 50)).toBe(false);
  });

  it("allows a send after the throttle window elapses", () => {
    expect(shouldSendCursor(1000, 1050, 50)).toBe(true);
    expect(shouldSendCursor(1000, 1099, 50)).toBe(true);
  });
});

describe("presence remote cursor merge reducer", () => {
  const base: Omit<PresenceCursor, "lastSeen"> = {
    userId: "remote-1",
    userName: "Alice",
    cursorX: 0.5,
    activeTrackId: "track-1",
    playheadPosition: 12,
  };

  it("adds a remote cursor keyed by userId", () => {
    const next = mergeRemoteCursor(new Map(), base, "local-me", 999);
    expect(next.size).toBe(1);
    expect(next.get("remote-1")?.cursorX).toBe(0.5);
    expect(next.get("remote-1")?.lastSeen).toBe(999);
  });

  it("ignores the local user's own cursor", () => {
    const next = mergeRemoteCursor(
      new Map(),
      { ...base, userId: "local-me" },
      "local-me",
      999,
    );
    expect(next.size).toBe(0);
  });

  it("updates an existing remote cursor without dropping others", () => {
    const first = mergeRemoteCursor(new Map(), base, "local-me", 1);
    const second = mergeRemoteCursor(
      first,
      { ...base, userId: "remote-2", userName: "Bob", cursorX: 0.9 },
      "local-me",
      2,
    );
    const third = mergeRemoteCursor(
      second,
      { ...base, cursorX: 0.1 },
      "local-me",
      3,
    );
    expect(third.size).toBe(2);
    expect(third.get("remote-1")?.cursorX).toBe(0.1);
    expect(third.get("remote-2")?.cursorX).toBe(0.9);
  });
});

describe("usePresence hook wiring", () => {
  beforeEach(() => {
    clearPresenceStore();
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("subscribes to the project presence SSE endpoint", () => {
    renderHook(() =>
      usePresence({ projectId: "proj-1", userId: "me", userName: "Me" }),
    );
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toContain(
      "/api/presence/proj-1/subscribe",
    );
  });

  it("does not subscribe when projectId is null", () => {
    renderHook(() =>
      usePresence({ projectId: null, userId: "me", userName: "Me" }),
    );
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("POSTs a throttled cursor via sendCursor", () => {
    const { result } = renderHook(() =>
      usePresence({ projectId: "proj-1", userId: "me", throttleMs: 50 }),
    );
    act(() => {
      result.current.sendCursor(0.25, "track-9", 4);
      result.current.sendCursor(0.26, "track-9", 4);
    });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/presence/proj-1/cursor");
    const body = JSON.parse((opts as { body: string }).body);
    expect(body.cursorX).toBe(0.25);
    expect(body.activeTrackId).toBe("track-9");
  });

  it("receives remote cursors from the SSE stream", () => {
    const { result } = renderHook(() =>
      usePresence({ projectId: "proj-1", userId: "me", userName: "Me" }),
    );
    act(() => {
      MockEventSource.instances[0].emit({
        userId: "remote-1",
        userName: "Alice",
        cursorX: 0.7,
        activeTrackId: "track-2",
        playheadPosition: 8,
      });
    });
    expect(result.current.cursors.get("remote-1")?.cursorX).toBe(0.7);
  });

  it("ignores an echo of the local user's own cursor", () => {
    const { result } = renderHook(() =>
      usePresence({ projectId: "proj-1", userId: "me", userName: "Me" }),
    );
    act(() => {
      MockEventSource.instances[0].emit({
        userId: "me",
        userName: "Me",
        cursorX: 0.3,
        activeTrackId: null,
        playheadPosition: 0,
      });
    });
    expect(result.current.cursors.has("me")).toBe(false);
  });
});
