import { describe, it, expect, vi, beforeEach } from "vitest";

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
  GENRES,
  MUSICAL_KEYS,
  TIME_SIGNATURES,
  generateTracksForGenre,
  subgenreToGenreId,
} from "../src/lib/projectTemplates";
import {
  recordUnderrun,
  getUnderrunCount,
  getMetricsHistory,
  disposeTelemetry,
  sendTelemetryReport,
  type AudioMetrics,
} from "../src/lib/audioTelemetry";
import {
  measureInputLatency,
  createLatencyCompensationNode,
  applyLatencyCompensationToTrack,
} from "../src/lib/latencyMonitor";
import { restoreCrashState } from "../src/lib/crashRecovery";

describe("project-templates", () => {
  it("has exactly 10 genres each with suggested tracks", () => {
    expect(GENRES).toHaveLength(10);
    for (const g of GENRES) {
      expect(g.suggestedTracks.length).toBeGreaterThan(0);
    }
  });

  it("generateTracksForGenre returns tracks.length === suggestedTracks.length", () => {
    const genre = GENRES.find((g) => g.id === "pop")!;
    const tracks = generateTracksForGenre("pop");
    expect(tracks).toHaveLength(genre.suggestedTracks.length);
    for (const t of tracks) {
      expect(t.regions).toHaveLength(1);
    }
  });

  it("region duration equals Math.round((numBars*beatsPerBar*60)/bpm)", () => {
    const tracks = generateTracksForGenre("pop", 120, undefined, undefined, 8, "4/4");
    const expected = Math.round((8 * 4 * 60) / 120);
    expect(expected).toBe(16);
    expect(tracks[0].regions[0].duration).toBe(expected);
  });

  it("MUSICAL_KEYS has 24 entries including C and Cm", () => {
    expect(MUSICAL_KEYS).toHaveLength(24);
    expect(MUSICAL_KEYS).toContain("C");
    expect(MUSICAL_KEYS).toContain("Cm");
  });

  it("TIME_SIGNATURES includes 4/4", () => {
    expect(TIME_SIGNATURES).toContain("4/4");
  });

  it("subgenre resolves to parent genre", () => {
    expect(subgenreToGenreId("techno")).toBe("edm");
  });

  it("unknown genre returns non-empty fallback without throwing", () => {
    const tracks = generateTracksForGenre("nonexistent");
    expect(tracks.length).toBeGreaterThan(0);
  });
});

describe("studio-resilience: telemetry", () => {
  beforeEach(() => {
    disposeTelemetry();
  });

  it("recordUnderrun increments the underrun counter", () => {
    disposeTelemetry();
    const before = getUnderrunCount();
    recordUnderrun();
    recordUnderrun();
    expect(getUnderrunCount()).toBe(before + 2);
  });

  it("getMetricsHistory returns an empty array when buffer is empty", () => {
    disposeTelemetry();
    expect(getMetricsHistory()).toEqual([]);
  });

  it("sendTelemetryReport resolves false without throwing on failure", async () => {
    const metrics: AudioMetrics = {
      underruns: 1,
      droppedFrames: 0,
      cpuLoad: 50,
      peakCpu: 50,
      sampleRate: 44100,
      bufferDuration: 0,
      timestamp: Date.now(),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down"))),
    );
    await expect(sendTelemetryReport(metrics)).resolves.toBe(false);
    vi.unstubAllGlobals();
  });
});

describe("studio-resilience: latency", () => {
  it("measureInputLatency returns (outputLatency + baseLatency) * 1000", () => {
    const ctx = { outputLatency: 0.01, baseLatency: 0.005 } as unknown as AudioContext;
    expect(measureInputLatency(ctx)).toBeCloseTo(15, 6);
  });

  it("createLatencyCompensationNode returns null for non-positive delay", () => {
    const ctx = { createDelay: vi.fn() } as unknown as AudioContext;
    expect(createLatencyCompensationNode(ctx, 0)).toBeNull();
    expect(createLatencyCompensationNode(ctx, -5)).toBeNull();
  });

  it("applyLatencyCompensationToTrack passes node through unchanged for zero delay", () => {
    const ctx = { createDelay: vi.fn() } as unknown as AudioContext;
    const node = { connect: vi.fn() } as unknown as AudioNode;
    expect(applyLatencyCompensationToTrack(ctx, node, 0)).toBe(node);
  });
});

describe("studio-resilience: crash recovery", () => {
  it("restoreCrashState fails soft to null when IndexedDB is unavailable", async () => {
    const original = (globalThis as { indexedDB?: unknown }).indexedDB;
    (globalThis as { indexedDB?: unknown }).indexedDB = undefined;
    await expect(restoreCrashState("p1")).resolves.toBeNull();
    (globalThis as { indexedDB?: unknown }).indexedDB = original;
  });
});
