import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockPlatform = { OS: "web" as string };
vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockPlatform.OS;
    },
  },
}));

vi.mock("../src/lib/universalAudio", () => ({
  getSharedAudioContext: vi.fn(() => null),
}));

vi.mock("../src/lib/apiUrl", () => ({
  API_BASE_URL: "http://localhost:3001",
}));

import {
  startClock,
  stopClock,
  onClockTick,
  isClockRunning,
} from "../src/lib/clockManager";
import {
  buildAutomationSchedule,
  interpolateAutomationValue,
} from "../src/lib/automationEngine";
import {
  startTelemetry,
  stopTelemetry,
  disposeTelemetry,
  getMetricsHistory,
  getLatestMetrics,
  getAverageMetrics,
  recordCpuLoad,
} from "../src/lib/audioTelemetry";
import {
  measureInputLatency,
  createLatencyCompensationNode,
} from "../src/lib/latencyMonitor";
import { scheduleCrashSave } from "../src/lib/crashRecovery";

describe("clockManager — subscription API", () => {
  it("isClockRunning is a boolean and starts false", () => {
    expect(typeof isClockRunning()).toBe("boolean");
    expect(isClockRunning()).toBe(false);
  });

  it("onClockTick returns an unsubscribe and does not throw", () => {
    const listener = vi.fn();
    const unsub = onClockTick(listener);
    expect(typeof unsub).toBe("function");
    expect(() => unsub()).not.toThrow();
  });

  it("startClock is non-throwing on web even without a real Worker", () => {
    expect(() => startClock(25)).not.toThrow();
    stopClock();
  });
});

describe("automationEngine — interpolation", () => {
  it("buildAutomationSchedule converts beats to seconds at the given bpm", () => {
    const sched = buildAutomationSchedule(
      [{ time: 1, value: 50, curve: "linear" }],
      120,
    );
    expect(sched[0].time).toBeCloseTo(0.5, 6);
  });

  it("interpolateAutomationValue clamps to the first point before the start", () => {
    const pts = buildAutomationSchedule(
      [
        { time: 0, value: 10, curve: "linear" },
        { time: 2, value: 50, curve: "linear" },
      ],
      60,
    );
    expect(interpolateAutomationValue(pts, -1)).toBe(10);
  });

  it("interpolateAutomationValue clamps to the last point after the end", () => {
    const pts = buildAutomationSchedule(
      [
        { time: 0, value: 10, curve: "linear" },
        { time: 2, value: 50, curve: "linear" },
      ],
      60,
    );
    expect(interpolateAutomationValue(pts, 10)).toBe(50);
  });

  it("interpolateAutomationValue computes the linear midpoint", () => {
    const pts = buildAutomationSchedule(
      [
        { time: 0, value: 0, curve: "linear" },
        { time: 2, value: 100, curve: "linear" },
      ],
      60,
    );
    expect(interpolateAutomationValue(pts, 1)).toBeCloseTo(50, 6);
  });

  it("interpolateAutomationValue computes the exponential midpoint", () => {
    const pts = buildAutomationSchedule(
      [
        { time: 0, value: 1, curve: "exponential" },
        { time: 2, value: 100, curve: "exponential" },
      ],
      60,
    );
    // exponential midpoint = 1 * (100/1)^0.5 = 10
    expect(interpolateAutomationValue(pts, 1)).toBeCloseTo(10, 5);
  });
});

describe("audioTelemetry — ring buffer + averages", () => {
  beforeEach(() => {
    disposeTelemetry();
    vi.useFakeTimers();
  });
  afterEach(() => {
    stopTelemetry();
    disposeTelemetry();
    vi.useRealTimers();
  });

  it("caps the history length at ringBufferSize", () => {
    startTelemetry({ ringBufferSize: 5, reportIntervalMs: 10 });
    vi.advanceTimersByTime(200);
    const history = getMetricsHistory(100);
    expect(history.length).toBeLessThanOrEqual(5);
    expect(history.length).toBeGreaterThan(0);
  });

  it("getLatestMetrics returns the most recent sample", () => {
    startTelemetry({ ringBufferSize: 5, reportIntervalMs: 10 });
    vi.advanceTimersByTime(100);
    expect(getLatestMetrics()).not.toBeNull();
  });

  it("getAverageMetrics is null when the buffer is empty", () => {
    expect(getAverageMetrics()).toBeNull();
  });

  it("getAverageMetrics averages cpuLoad and tracks peakCpu", () => {
    startTelemetry({ ringBufferSize: 10, reportIntervalMs: 10 });
    recordCpuLoad(50);
    vi.advanceTimersByTime(10);
    recordCpuLoad(100);
    vi.advanceTimersByTime(10);
    const avg = getAverageMetrics();
    expect(avg).not.toBeNull();
    expect(avg!.peakCpu).toBe(100);
    expect(avg!.cpuLoad).toBeGreaterThan(0);
  });

  it("only fires the threshold report callback above thresholds", () => {
    const onReport = vi.fn();
    startTelemetry(
      { ringBufferSize: 10, reportIntervalMs: 10, underrunThreshold: 5, cpuThreshold: 80 },
      onReport,
    );
    vi.advanceTimersByTime(50);
    expect(onReport).not.toHaveBeenCalled();
  });
});

describe("latencyMonitor — helpers", () => {
  it("measureInputLatency = (outputLatency + baseLatency) * 1000", () => {
    const ctx = { outputLatency: 0.01, baseLatency: 0.005 } as unknown as AudioContext;
    expect(measureInputLatency(ctx)).toBeCloseTo(15, 6);
  });

  it("createLatencyCompensationNode returns null for non-positive delay", () => {
    const ctx = { createDelay: vi.fn() } as unknown as AudioContext;
    expect(createLatencyCompensationNode(ctx, 0)).toBeNull();
    expect(createLatencyCompensationNode(ctx, -5)).toBeNull();
  });

  it("createLatencyCompensationNode builds a delay node for positive delay", () => {
    const delayNode = { delayTime: { value: 0 } } as unknown as DelayNode;
    const ctx = {
      createDelay: vi.fn(() => delayNode),
    } as unknown as AudioContext;
    expect(createLatencyCompensationNode(ctx, 5)).toBe(delayNode);
  });
});

describe("crashRecovery — scheduleCrashSave coalescing", () => {
  let puts: any[];

  function setupFakeIDB() {
    puts = [];
    class Store {
      constructor(private tx: any) {}
      put(record: any) {
        puts.push(record);
        setTimeout(() => this.tx.oncomplete && this.tx.oncomplete(), 0);
        return {};
      }
      get() {
        return { onsuccess() {}, onerror() {} };
      }
      delete() {}
      getAll() {
        return { onsuccess() {}, onerror() {} };
      }
    }
    class Tx {
      oncomplete: (() => void) | null = null;
      onerror: (() => void) | null = null;
      objectStore() {
        return new Store(this);
      }
    }
    class DB {
      objectStoreNames = { contains: () => false };
      createObjectStore() {
        return {};
      }
      transaction() {
        return new Tx();
      }
      close() {}
    }
    const request = {
      result: new DB(),
      onupgradeneeded: null as any,
      onsuccess: null as any,
      onerror: null as any,
    };
    (globalThis as any).indexedDB = {
      open: () => {
        setTimeout(() => request.onsuccess && request.onsuccess(), 0);
        return request;
      },
    };
  }

  beforeEach(() => {
    setupFakeIDB();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as any).indexedDB;
  });

  it("coalesces rapid calls and flushes only the latest state once", async () => {
    scheduleCrashSave("p1", { v: 1 });
    scheduleCrashSave("p1", { v: 2 });
    vi.advanceTimersByTime(600);
    // allow the async fake-IDB open + put to resolve
    await vi.advanceTimersByTimeAsync(20);
    expect(puts).toHaveLength(1);
    expect(puts[0].projectId).toBe("p1");
    expect(puts[0].state).toEqual({ v: 2 });
  });
});
