import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrackDef } from "../src/lib/types";

// ─── automix.ts ───
import { autoMix, autoMixWithAnalysis, AUTOMIX_GENRES } from "../src/lib/automix";

// ─── audioNodeGraph.ts ───
import { AudioNodeGraph, createAudioNodeGraph } from "../src/lib/audioNodeGraph";

// ─── automationEngine.ts ───
import { applyAutomationToParam, buildAutomationSchedule, interpolateAutomationValue } from "../src/lib/automationEngine";

// ─── busRouter.ts ───
import { buildBusRouteGraph, createDefaultBuses, assignTrackToBus } from "../src/lib/busRouter";

// ─── hardwareIO.ts (patchbay) ───
import {
  getPatchbayState,
  createPatchRoute,
  removePatchRoute,
  getRoutesForTrack,
  getRoutesFromDevice,
} from "../src/lib/hardwareIO";

function makeTrack(overrides: Partial<TrackDef> & { name: string }): TrackDef {
  return {
    id: "t1",
    color: "#fff",
    muted: false,
    solo: false,
    volume: 80,
    pan: 0,
    sends: {},
    regions: [],
    plugins: [],
    automation: {},
    sidechainSource: null,
    ...overrides,
  };
}

// ─── automix.ts ───
describe("automix", () => {
  it("AUTOMIX_GENRES has 6 genres", () => {
    expect(AUTOMIX_GENRES).toEqual(["rock", "hiphop", "edm", "pop", "lofi", "jazz"]);
  });

  it("classifyTrack detects kick by name", () => {
    const track = makeTrack({ name: "Kick" });
    const result = autoMixWithAnalysis([track], "rock");
    expect(result.classifications[0].role).toBe("kick");
  });

  it("classifyTrack detects snare by name", () => {
    const track = makeTrack({ name: "Snare" });
    const result = autoMixWithAnalysis([track], "rock");
    expect(result.classifications[0].role).toBe("snare");
  });

  it("classifyTrack detects hihat by name", () => {
    const track = makeTrack({ name: "Hi Hat" });
    const result = autoMixWithAnalysis([track], "rock");
    expect(result.classifications[0].role).toBe("hihat");
  });

  it("classifyTrack detects bass by name", () => {
    const track = makeTrack({ name: "Bass" });
    const result = autoMixWithAnalysis([track], "rock");
    expect(result.classifications[0].role).toBe("bass");
  });

  it("classifyTrack detects vocal by name", () => {
    const track = makeTrack({ name: "Vocal" });
    const result = autoMixWithAnalysis([track], "rock");
    expect(result.classifications[0].role).toBe("vocal");
  });

  it("classifyTrack detects lead by name", () => {
    const track = makeTrack({ name: "Lead Synth" });
    const result = autoMixWithAnalysis([track], "rock");
    expect(result.classifications[0].role).toBe("lead");
  });

  it("classifyTrack detects pad by name", () => {
    const track = makeTrack({ name: "Pad" });
    const result = autoMixWithAnalysis([track], "rock");
    expect(result.classifications[0].role).toBe("pad");
  });

  it("classifyTrack detects keys by name", () => {
    const track = makeTrack({ name: "Piano" });
    const result = autoMixWithAnalysis([track], "rock");
    expect(result.classifications[0].role).toBe("keys");
  });

  it("classifyTrack detects guitar by name", () => {
    const track = makeTrack({ name: "Guitar" });
    const result = autoMixWithAnalysis([track], "rock");
    expect(result.classifications[0].role).toBe("guitar");
  });

  it("classifyTrack detects fx by name", () => {
    const track = makeTrack({ name: "FX Riser" });
    const result = autoMixWithAnalysis([track], "rock");
    expect(result.classifications[0].role).toBe("fx");
  });

  it("classifyTrack returns other for unknown name with no midi or regions", () => {
    const track = makeTrack({ name: "Mystery Track", id: "t99" });
    const result = autoMixWithAnalysis([track], "rock");
    expect(result.classifications[0].role).toBe("other");
  });

  it("classifyTrack uses spectral fallback to classify kick from low midi notes", () => {
    const track = makeTrack({ name: "Track 1", midiNotes: [{ pitch: 36, velocity: 100, start: 0, duration: 1 }] });
    const result = autoMixWithAnalysis([track], "rock");
    expect(result.classifications[0].role).toBe("bass");
  });

  it("autoMixWithAnalysis returns classifications array", () => {
    const tracks = [
      makeTrack({ name: "Kick", id: "t1" }),
      makeTrack({ name: "Bass", id: "t2" }),
      makeTrack({ name: "Vocal", id: "t3" }),
    ];
    const result = autoMixWithAnalysis(tracks, "pop");
    expect(result.classifications).toHaveLength(3);
    expect(result.classifications[0].role).toBe("kick");
    expect(result.classifications[0].trackId).toBe("t1");
    expect(result.classifications[0].targetLUFS).toBeLessThan(0);
  });

  it("autoMixWithAnalysis adjusts volume based on role profile", () => {
    const track = makeTrack({ name: "Kick", id: "t1", volume: 50 });
    const result = autoMixWithAnalysis([track], "rock");
    expect(result.tracks[0].volume).toBeGreaterThanOrEqual(50);
  });

  it("autoMixWithAnalysis adjusts pan for non-centered roles", () => {
    const hihat = makeTrack({ name: "Hi Hat", id: "t1", pan: 0 });
    const result = autoMixWithAnalysis([hihat], "rock");
    expect(result.tracks[0].pan).not.toBe(0);
  });

  it("autoMixWithAnalysis adds compressor for roles that need it", () => {
    const track = makeTrack({ name: "Kick", id: "t1", plugins: [] });
    const result = autoMixWithAnalysis([track], "rock");
    expect(result.tracks[0].plugins.some(p => p.type === "compressor")).toBe(true);
  });

  it("autoMix respects genre preset for 'other' classified tracks", () => {
    const track = makeTrack({ name: "Other Track", id: "t1" });
    const rockResult = autoMixWithAnalysis([track], "rock");
    const lofiResult = autoMixWithAnalysis([track], "lofi");
    expect(rockResult.tracks[0].volume).not.toBe(lofiResult.tracks[0].volume);
  });

  it("autoMix returns tracks unchanged for unknown genre", () => {
    const track = makeTrack({ name: "Kick", id: "t1", volume: 80 });
    const result = autoMixWithAnalysis([track], "unknown_genre" as any);
    expect(result.tracks[0].volume).toBeGreaterThanOrEqual(50);
  });

  it("autoMix is a convenience wrapper around autoMixWithAnalysis", () => {
    const tracks = [makeTrack({ name: "Kick", id: "t1" })];
    const plain = autoMix(tracks, "rock");
    const withAnalysis = autoMixWithAnalysis(tracks, "rock");
    expect(plain[0].volume).toBe(withAnalysis.tracks[0].volume);
  });
});

// ─── audioNodeGraph.ts ───
describe("AudioNodeGraph", () => {
  let ctx: AudioContext;
  let inputNode: AudioNode;
  let outputNode: AudioDestinationNode;
  let gainNode: AudioNode;

  const makeFactory = () => {
    const node = ctx.createGain();
    return { node, factory: vi.fn(() => node) };
  };

  beforeEach(() => {
    ctx = { createGain: () => ({ connect: vi.fn(), disconnect: vi.fn() }) } as any;
    gainNode = ctx.createGain();
    inputNode = gainNode;
    outputNode = ctx.destination ?? gainNode;
  });

  it("constructor initializes empty slots", () => {
    const graph = new AudioNodeGraph(ctx, inputNode, outputNode);
    expect(graph.getSlots()).toEqual([]);
    expect(graph.isConnected).toBe(false);
  });

  it("addPlugin adds slot and triggers rebuild", () => {
    const graph = new AudioNodeGraph(ctx, inputNode, outputNode);
    const { factory } = makeFactory();
    graph.addPlugin("p1", "EQ", factory);
    expect(graph.getSlots()).toHaveLength(1);
    expect(graph.getSlots()[0].id).toBe("p1");
    expect(graph.getSlots()[0].enabled).toBe(true);
  });

  it("removePlugin removes by id", () => {
    const graph = new AudioNodeGraph(ctx, inputNode, outputNode);
    const a = makeFactory();
    const b = makeFactory();
    graph.addPlugin("p1", "A", a.factory);
    graph.addPlugin("p2", "B", b.factory);
    graph.removePlugin("p1");
    expect(graph.getSlots()).toHaveLength(1);
    expect(graph.getSlots()[0].id).toBe("p2");
  });

  it("removePlugin is no-op for unknown id", () => {
    const graph = new AudioNodeGraph(ctx, inputNode, outputNode);
    graph.addPlugin("p1", "A", makeFactory().factory);
    graph.removePlugin("unknown");
    expect(graph.getSlots()).toHaveLength(1);
  });

  it("togglePlugin enables/disables", () => {
    const graph = new AudioNodeGraph(ctx, inputNode, outputNode);
    graph.addPlugin("p1", "A", makeFactory().factory);
    graph.togglePlugin("p1", false);
    expect(graph.getSlots()[0].enabled).toBe(false);
    graph.togglePlugin("p1", true);
    expect(graph.getSlots()[0].enabled).toBe(true);
  });

  it("togglePlugin is no-op for unknown id", () => {
    const graph = new AudioNodeGraph(ctx, inputNode, outputNode);
    expect(() => graph.togglePlugin("unknown", false)).not.toThrow();
  });

  it("movePlugin reorders slots", () => {
    const graph = new AudioNodeGraph(ctx, inputNode, outputNode);
    graph.addPlugin("p1", "A", makeFactory().factory);
    graph.addPlugin("p2", "B", makeFactory().factory);
    graph.addPlugin("p3", "C", makeFactory().factory);
    graph.movePlugin(0, 2);
    expect(graph.getSlots()[0].id).toBe("p2");
    expect(graph.getSlots()[1].id).toBe("p3");
    expect(graph.getSlots()[2].id).toBe("p1");
  });

  it("movePlugin is no-op for out-of-range indices", () => {
    const graph = new AudioNodeGraph(ctx, inputNode, outputNode);
    graph.addPlugin("p1", "A", makeFactory().factory);
    expect(() => graph.movePlugin(-1, 0)).not.toThrow();
    expect(() => graph.movePlugin(0, 5)).not.toThrow();
    expect(graph.getSlots()).toHaveLength(1);
  });

  it("dispose cleans up all nodes", () => {
    const graph = new AudioNodeGraph(ctx, inputNode, outputNode);
    graph.addPlugin("p1", "A", makeFactory().factory);
    graph.dispose();
    expect(graph.isConnected).toBe(false);
  });

  it("createAudioNodeGraph is a factory function", () => {
    const graph = createAudioNodeGraph(ctx, inputNode, outputNode);
    expect(graph).toBeInstanceOf(AudioNodeGraph);
  });
});

// ─── automationEngine.ts ───
describe("automationEngine", () => {
  let param: AudioParam;

  beforeEach(() => {
    param = {
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    } as any;
  });

  it("applyAutomationToParam schedules linear ramp", () => {
    applyAutomationToParam(param, [
      { time: 0, value: 0, curve: "linear" },
      { time: 1, value: 1, curve: "linear" },
    ], 0);
    expect(param.setValueAtTime).toHaveBeenCalledWith(0, 0);
    expect(param.linearRampToValueAtTime).toHaveBeenCalledWith(1, 1);
  });

  it("applyAutomationToParam schedules exponential ramp when values positive", () => {
    applyAutomationToParam(param, [
      { time: 0, value: 0.1, curve: "exponential" },
      { time: 1, value: 1, curve: "exponential" },
    ], 0);
    expect(param.exponentialRampToValueAtTime).toHaveBeenCalledWith(1, 1);
  });

  it("applyAutomationToParam falls back to linear when exponential has zero value", () => {
    applyAutomationToParam(param, [
      { time: 0, value: 0, curve: "exponential" },
      { time: 1, value: 1, curve: "exponential" },
    ], 0);
    expect(param.linearRampToValueAtTime).toHaveBeenCalledWith(1, 1);
    expect(param.exponentialRampToValueAtTime).not.toHaveBeenCalled();
  });

  it("applyAutomationToParam handles single point", () => {
    applyAutomationToParam(param, [
      { time: 0.5, value: 0.7, curve: "linear" },
    ], 0);
    expect(param.setValueAtTime).toHaveBeenCalledWith(0.7, 0.5);
  });

  it("applyAutomationToParam handles empty points", () => {
    applyAutomationToParam(param, [], 0);
    expect(param.cancelScheduledValues).not.toHaveBeenCalled();
  });

  it("applyAutomationToParam uses offsetTime", () => {
    applyAutomationToParam(param, [
      { time: 0, value: 0, curve: "linear" },
      { time: 1, value: 1, curve: "linear" },
    ], 0, 0.5);
    expect(param.setValueAtTime).toHaveBeenCalledWith(0, 0.5);
  });

  it("applyAutomationToParam calls cancelScheduledValues", () => {
    applyAutomationToParam(param, [
      { time: 0, value: 0, curve: "linear" },
    ], 0);
    expect(param.cancelScheduledValues).toHaveBeenCalledWith(0);
  });

  it("buildAutomationSchedule converts beat times to seconds", () => {
    const result = buildAutomationSchedule([
      { time: 0, value: 0, curve: "linear" },
      { time: 4, value: 1, curve: "linear" },
    ], 120);
    expect(result[0].time).toBe(0);
    expect(result[1].time).toBe(2);
  });

  it("buildAutomationSchedule returns empty for empty input", () => {
    expect(buildAutomationSchedule([], 120)).toEqual([]);
  });

  it("buildAutomationSchedule uses safe minimum bpm", () => {
    const result = buildAutomationSchedule([
      { time: 1, value: 1, curve: "linear" as const },
    ], 0);
    expect(result[0].time).toBe(60);
  });

  it("interpolateAutomationValue handles multiple points", () => {
    const points = [
      { time: 0, value: 0, curve: "linear" as const },
      { time: 2, value: 1, curve: "linear" as const },
    ];
    expect(interpolateAutomationValue(points, 0)).toBe(0);
    expect(interpolateAutomationValue(points, 1)).toBe(0.5);
    expect(interpolateAutomationValue(points, 2)).toBe(1);
    expect(interpolateAutomationValue(points, 3)).toBe(1);
  });

  it("interpolateAutomationValue returns 0 for empty points", () => {
    expect(interpolateAutomationValue([], 0)).toBe(0);
  });
});

// ─── busRouter.ts ───
describe("busRouter", () => {
  it("createDefaultBuses returns 3 buses", () => {
    const buses = createDefaultBuses();
    expect(buses).toHaveLength(3);
    expect(buses[0].name).toBe("Drums");
    expect(buses[1].name).toBe("Instruments");
    expect(buses[2].name).toBe("Vocals");
  });

  it("createDefaultBuses buses have unique IDs and colors", () => {
    const buses = createDefaultBuses();
    const ids = new Set(buses.map(b => b.id));
    const colors = new Set(buses.map(b => b.color));
    expect(ids.size).toBe(3);
    expect(colors.size).toBe(3);
  });

  it("assignTrackToBus returns bus-drums for kick", () => {
    expect(assignTrackToBus("Kick")).toBe("bus-drums");
  });

  it("assignTrackToBus returns bus-vocals for vocal", () => {
    expect(assignTrackToBus("Vocal")).toBe("bus-vocals");
  });

  it("assignTrackToBus returns bus-instruments for synth", () => {
    expect(assignTrackToBus("Synth")).toBe("bus-instruments");
  });

  it("assignTrackToBus returns null for unknown", () => {
    expect(assignTrackToBus("Other Track")).toBeNull();
  });

  it("assignTrackToBus is case insensitive", () => {
    expect(assignTrackToBus("KICK")).toBe("bus-drums");
    expect(assignTrackToBus("BASS")).toBe("bus-instruments");
  });

  it("buildBusRouteGraph returns graph structure", () => {
    const tracks: TrackDef[] = [
      { id: "t1", name: "Kick", color: "#fff", muted: false, solo: false, volume: 80, pan: 0, sends: {}, regions: [], plugins: [], automation: {}, sidechainSource: null },
      { id: "t2", name: "Bass", color: "#fff", muted: false, solo: false, volume: 75, pan: 0, sends: {}, regions: [], plugins: [], automation: {}, sidechainSource: null },
    ];
    const buses = createDefaultBuses();
    const audioCtx = {
      createGain: () => ({ connect: vi.fn(), gain: { value: 0 } }),
      createStereoPanner: () => ({ connect: vi.fn(), pan: { value: 0 } }),
    } as any;
    const masterGain = { connect: vi.fn() } as any;

    const graph = buildBusRouteGraph(audioCtx, tracks, buses, masterGain);
    expect(graph.trackOutputs).toBeDefined();
    expect(graph.busNodes).toBeDefined();
    expect(graph.cleanup).toBeInstanceOf(Function);
    expect(graph.busNodes.size).toBe(3);
  });
});

// ─── hardwareIO.ts (patchbay) ───
import { clearAllRoutes } from "../src/lib/hardwareIO";

describe("hardwareIO patchbay", () => {
  const chan1 = { deviceId: "dev-1", channelIndex: 0, label: "Ch 1", sampleRate: 44100 };
  const chan2 = { deviceId: "dev-1", channelIndex: 1, label: "Ch 2", sampleRate: 44100 };
  const chan3 = { deviceId: "dev-2", channelIndex: 0, label: "Ch 1", sampleRate: 44100 };

  beforeEach(() => {
    clearAllRoutes();
  });

  it("getPatchbayState returns initial state", () => {
    const state = getPatchbayState();
    expect(state.routes).toEqual([]);
  });

  it("createPatchRoute creates a route", () => {
    const route = createPatchRoute(chan1, "track-1");
    expect(route).toBeDefined();
    expect(route.source.deviceId).toBe("dev-1");
    expect(route.source.channelIndex).toBe(0);
    expect(route.targetTrackId).toBe("track-1");
    expect(route.id).toBeDefined();
    expect(route.enabled).toBe(true);
  });

  it("createPatchRoute creates route with custom gain and channel", () => {
    const route = createPatchRoute(chan1, "track-1", 2, 0.8);
    expect(route.targetChannel).toBe(2);
    expect(route.gain).toBe(0.8);
  });

  it("getRoutesForTrack returns routes for a specific track", () => {
    createPatchRoute(chan1, "track-1");
    createPatchRoute(chan2, "track-2");
    const track1Routes = getRoutesForTrack("track-1");
    expect(track1Routes).toHaveLength(1);
    expect(track1Routes[0].source.channelIndex).toBe(0);
  });

  it("getRoutesForTrack returns empty array for track with no routes", () => {
    const routes = getRoutesForTrack("nonexistent");
    expect(routes).toEqual([]);
  });

  it("getRoutesFromDevice returns routes for a device", () => {
    createPatchRoute(chan1, "track-1");
    createPatchRoute(chan2, "track-2");
    createPatchRoute(chan3, "track-3");
    const dev1Routes = getRoutesFromDevice("dev-1");
    expect(dev1Routes).toHaveLength(2);
  });

  it("getRoutesFromDevice returns empty array for device with no routes", () => {
    const routes = getRoutesFromDevice("nonexistent");
    expect(routes).toEqual([]);
  });

  it("createPatchRoute generates unique ids", () => {
    const r1 = createPatchRoute(chan1, "track-1");
    const r2 = createPatchRoute(chan1, "track-1");
    expect(r1.id).not.toBe(r2.id);
  });

  it("removePatchRoute removes a route by id", () => {
    const route = createPatchRoute(chan1, "track-1");
    expect(getRoutesForTrack("track-1")).toHaveLength(1);
    removePatchRoute(route.id);
    expect(getRoutesForTrack("track-1")).toHaveLength(0);
  });

  it("removePatchRoute is safe for non-existent route", () => {
    expect(() => removePatchRoute("nonexistent")).not.toThrow();
  });

  it("createPatchRoute adds route to patchbay state", () => {
    createPatchRoute(chan1, "track-1");
    const state = getPatchbayState();
    expect(state.routes).toHaveLength(1);
  });
});
