import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCollaboration } from "../src/lib/collaboration";
import { createOperation } from "../src/lib/crdt";

const mockInstances: any[] = [];
class MockEventSource {
  url: string;
  onopen: any = null;
  onmessage: any = null;
  onerror: any = null;
  constructor(url: string) {
    this.url = url;
    mockInstances.push(this);
  }
  close() {}
  dispatch(type: string, data: unknown) {
    this.onmessage?.({ data: JSON.stringify({ type, ...(data as any) }) });
  }
}

beforeEach(() => {
  mockInstances.length = 0;
  vi.stubGlobal("EventSource", MockEventSource as any);
});

describe("collaboration H2 remote ops applied", () => {
  it("applies remote operations to local state (no silent drop)", () => {
    const op = createOperation("remote-user", "track.add", "tracks", {
      id: "rt1",
      volume: 0.7,
    });
    const { result } = renderHook(() =>
      useCollaboration({
        projectId: "h2-project",
        userId: "local-user",
        serverUrl: "http://example.test",
      }),
    );

    const es = mockInstances[mockInstances.length - 1];
    expect(es).toBeTruthy();
    expect(typeof es.onmessage).toBe("function");

    act(() => {
      es.dispatch("operations", { operations: [op] });
    });

    const applied = result.current.applyToState({ tracks: [] }) as {
      tracks: Array<{ id: string }>;
    };
    expect(applied.tracks.length).toBe(1);
    expect(applied.tracks[0].id).toBe("rt1");
  });

  it("does not re-apply an already-applied remote op", () => {
    const op = createOperation("remote-user", "track.add", "tracks", {
      id: "rt2",
      volume: 0.5,
    });
    const { result } = renderHook(() =>
      useCollaboration({
        projectId: "h2-project-2",
        userId: "local-user",
        serverUrl: "http://example.test",
      }),
    );
    const es = mockInstances[mockInstances.length - 1];
    act(() => {
      es.dispatch("operations", { operations: [op] });
    });
    const first = result.current.applyToState({ tracks: [] }) as {
      tracks: Array<{ id: string }>;
    };
    const second = result.current.applyToState(first) as {
      tracks: Array<{ id: string }>;
    };
    expect(first.tracks.length).toBe(1);
    expect(second.tracks.length).toBe(1);
  });
});
