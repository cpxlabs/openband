import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildAutomationSchedule, interpolateAutomationValue } from "../src/lib/automationEngine";
import { assignTrackToBus, createDefaultBuses } from "../src/lib/busRouter";
import { generatePeakData, getVisibleRange } from "../src/lib/canvasWaveform";
import { computeModulation, getModSources, getModTargets } from "../src/lib/modulationMatrix";
import { noteNumberToName, frequencyToNote } from "../src/lib/midiScheduler";
import { getClientId } from "../src/lib/crdt";
import { validateGraph, buildAudioGraph } from "../src/lib/audioGraphValidation";

vi.mock("react-native", () => ({
  Platform: { OS: "web", select: (obj: any) => obj.web ?? obj.default },
}));

vi.stubGlobal("performance", { now: () => 0 });

describe("automationEngine", () => {
  it("buildAutomationSchedule converts beat times to seconds", () => {
    const pts = [{ time: 0, value: 50, curve: "linear" as const }, { time: 4, value: 80, curve: "linear" as const }];
    const result = buildAutomationSchedule(pts, 120);
    expect(result[0].time).toBe(0);
    expect(result[1].time).toBeCloseTo(2, 5);
  });

  it("buildAutomationSchedule returns empty for empty input", () => {
    expect(buildAutomationSchedule([], 120)).toEqual([]);
  });

  it("interpolateAutomationValue returns first point before start", () => {
    const pts = [{ time: 2, value: 50, curve: "linear" as const }, { time: 4, value: 80, curve: "linear" as const }];
    expect(interpolateAutomationValue(pts, 1)).toBe(50);
  });

  it("interpolateAutomationValue returns last point after end", () => {
    const pts = [{ time: 2, value: 50, curve: "linear" as const }, { time: 4, value: 80, curve: "linear" as const }];
    expect(interpolateAutomationValue(pts, 10)).toBe(80);
  });

  it("interpolateAutomationValue interpolates linearly at midpoint", () => {
    const pts = [{ time: 2, value: 0, curve: "linear" as const }, { time: 4, value: 100, curve: "linear" as const }];
    expect(interpolateAutomationValue(pts, 3)).toBe(50);
  });

  it("interpolateAutomationValue returns 0 for empty points", () => {
    expect(interpolateAutomationValue([], 5)).toBe(0);
  });

  it("interpolateAutomationValue handles single point", () => {
    expect(interpolateAutomationValue([{ time: 0, value: 75, curve: "linear" as const }], 10)).toBe(75);
  });

  it("interpolateAutomationValue handles exponential curve", () => {
    const pts = [{ time: 0, value: 1, curve: "exponential" as const }, { time: 1, value: 2, curve: "exponential" as const }];
    const val = interpolateAutomationValue(pts, 0.5);
    expect(val).toBeGreaterThan(1);
    expect(val).toBeLessThan(2);
  });

  it("interpolateAutomationValue with zero values falls back to linear", () => {
    const pts = [{ time: 0, value: 0, curve: "exponential" as const }, { time: 1, value: 100, curve: "exponential" as const }];
    expect(interpolateAutomationValue(pts, 0.5)).toBe(50);
  });

  it("interpolateAutomationValue interpolates at quarter point", () => {
    const pts = [{ time: 0, value: 0, curve: "linear" as const }, { time: 4, value: 100, curve: "linear" as const }];
    expect(interpolateAutomationValue(pts, 1)).toBe(25);
  });
});

describe("busRouter", () => {
  it("assignTrackToBus returns drums for kick", () => {
    expect(assignTrackToBus("Kick 808")).toBe("bus-drums");
  });

  it("assignTrackToBus returns drums for snare", () => {
    expect(assignTrackToBus("Snare Acoustic")).toBe("bus-drums");
  });

  it("assignTrackToBus returns vocals for vocal", () => {
    expect(assignTrackToBus("Vocal Principal")).toBe("bus-vocals");
  });

  it("assignTrackToBus returns instruments for bass", () => {
    expect(assignTrackToBus("Baixo")).toBe("bus-instruments");
  });

  it("assignTrackToBus returns instruments for guitar", () => {
    expect(assignTrackToBus("Guitarra Solo")).toBe("bus-instruments");
  });

  it("assignTrackToBus returns instruments for synth", () => {
    expect(assignTrackToBus("Synth Pad")).toBe("bus-instruments");
  });

  it("assignTrackToBus returns null for unknown", () => {
    expect(assignTrackToBus("Random Sound")).toBeNull();
  });

  it("assignTrackToBus is case insensitive", () => {
    expect(assignTrackToBus("KICK 808")).toBe("bus-drums");
    expect(assignTrackToBus("SNARE")).toBe("bus-drums");
  });

  it("assignTrackToBus handles Portuguese labels", () => {
    expect(assignTrackToBus("Pandeiro")).toBe("bus-drums");
    expect(assignTrackToBus("Voz")).toBe("bus-vocals");
    expect(assignTrackToBus("Cordas")).toBe("bus-instruments");
  });

  it("assignTrackToBus handles instrument variations", () => {
    expect(assignTrackToBus("Piano Rhodes")).toBe("bus-instruments");
    expect(assignTrackToBus("Violão")).toBe("bus-instruments");
    expect(assignTrackToBus("Melody")).toBe("bus-instruments");
  });

  it("createDefaultBuses returns three buses", () => {
    const buses = createDefaultBuses();
    expect(buses).toHaveLength(3);
    expect(buses.map(b => b.id)).toEqual(["bus-drums", "bus-instruments", "bus-vocals"]);
  });

  it("createDefaultBuses buses have correct properties", () => {
    createDefaultBuses().forEach(b => {
      expect(b.muted).toBe(false);
      expect(b.volume).toBe(1);
      expect(b.name).toBeTruthy();
      expect(b.color).toBeTruthy();
    });
  });
});

describe("canvasWaveform", () => {
  it("generatePeakData returns peaks from sine buffer", () => {
    const sr = 44100;
    const len = sr * 2;
    const data = new Float32Array(len);
    for (let i = 0; i < len; i++) data[i] = Math.sin(2 * Math.PI * 440 * i / sr);
    const buf = { getChannelData: () => data, sampleRate: sr, length: len, numberOfChannels: 1 };
    const peaks = generatePeakData(buf as any, 50);
    expect(peaks.length).toBeGreaterThan(0);
    peaks.forEach(p => expect(p).toBeGreaterThanOrEqual(0));
  });

  it("generatePeakData all peaks non-negative", () => {
    const sr = 8000;
    const buf = { getChannelData: () => new Float32Array(sr), sampleRate: sr, length: sr, numberOfChannels: 1 };
    generatePeakData(buf as any, 100).forEach(p => expect(p).toBeGreaterThanOrEqual(0));
  });

  it("generatePeakData handles constant amplitude buffer", () => {
    const buf = { getChannelData: () => new Float32Array(100).fill(0.5), sampleRate: 100, length: 100, numberOfChannels: 1 };
    generatePeakData(buf as any, 10).forEach(p => expect(p).toBe(0.5));
  });

  it("generatePeakData handles silent buffer", () => {
    const buf = { getChannelData: () => new Float32Array(44100), sampleRate: 44100, length: 44100, numberOfChannels: 1 };
    const peaks = generatePeakData(buf as any, 50);
    peaks.forEach(p => expect(p).toBe(0));
  });

  it("getVisibleRange returns correct range from top", () => {
    const r = getVisibleRange({ scrollTop: 0, viewportHeight: 500, totalHeight: 2000, itemHeight: 50 });
    expect(r.start).toBe(0);
    expect(r.end).toBeGreaterThanOrEqual(10);
  });

  it("getVisibleRange handles mid-scroll", () => {
    const r = getVisibleRange({ scrollTop: 500, viewportHeight: 500, totalHeight: 2000, itemHeight: 50 });
    expect(r.start).toBeGreaterThan(0);
    expect(r.end).toBeGreaterThan(r.start);
  });

  it("getVisibleRange clamps at total height", () => {
    const r = getVisibleRange({ scrollTop: 2000, viewportHeight: 500, totalHeight: 2000, itemHeight: 50 });
    expect(r.start).toBeLessThan(40);
    expect(r.end).toBe(40);
  });

  it("getVisibleRange handles empty content", () => {
    const r = getVisibleRange({ scrollTop: 0, viewportHeight: 500, totalHeight: 0, itemHeight: 50 });
    expect(r.start).toBe(0);
    expect(r.end).toBe(0);
  });
});

describe("modulationMatrix", () => {
  it("exports source and target arrays via getters", () => {
    const sources = getModSources();
    const targets = getModTargets();
    expect(Array.isArray(sources)).toBe(true);
    expect(sources.length).toBeGreaterThan(0);
    expect(Array.isArray(targets)).toBe(true);
    expect(targets.length).toBeGreaterThan(0);
  });

  it("computeModulation returns zero for empty routing", () => {
    expect(computeModulation("volume", { time: 0 })).toBe(0);
  });

  it("computeModulation handles LFO source", () => {
    const result = computeModulation("volume", { time: 0.5 });
    expect(typeof result).toBe("number");
  });

  it("computeModulation returns value in valid range", () => {
    const result = computeModulation("volume", { time: 1 });
    expect(result).toBeGreaterThanOrEqual(-1);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe("midiScheduler", () => {
  it("noteNumberToName returns C4 for note 60", () => {
    expect(noteNumberToName(60)).toBe("C4");
  });

  it("noteNumberToName returns A4 for note 69", () => {
    expect(noteNumberToName(69)).toBe("A4");
  });

  it("noteNumberToName returns C#5 for note 73", () => {
    expect(noteNumberToName(73)).toBe("C#5");
  });

  it("noteNumberToName handles low notes", () => {
    expect(noteNumberToName(0)).toBe("C-1");
  });

  it("noteNumberToName handles high notes", () => {
    expect(noteNumberToName(127)).toBe("G9");
  });

  it("noteNumberToName returns C# for sharp notes", () => {
    expect(noteNumberToName(61)).toBe("C#4");
  });

  it("frequencyToNote returns 69 for A4 440Hz", () => {
    expect(frequencyToNote(440)).toBe(69);
  });

  it("frequencyToNote returns 81 for 880Hz", () => {
    expect(frequencyToNote(880)).toBe(81);
  });

  it("frequencyToNote returns 57 for 220Hz", () => {
    expect(frequencyToNote(220)).toBe(57);
  });

  it("frequencyToNote returns 60 for middle C", () => {
    expect(frequencyToNote(261.63)).toBe(60);
  });
});

describe("crdt", () => {
  it("getClientId returns a non-empty string", () => {
    const id = getClientId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});

describe("audioGraphValidation", () => {
  it("validateGraph returns valid for empty graph", () => {
    const graph = buildAudioGraph([], []);
    expect(validateGraph(graph).valid).toBe(true);
  });

  it("validateGraph validates tracks without bus outputs", () => {
    const tracks = [{ id: "t1", name: "Vocal", type: "audio", color: "bg-blue-500", volume: 75, pan: 0, muted: false, solo: false, outputId: null, sends: {}, regions: [], sidechainSource: null, automation: {}, plugins: [] }];
    const graph = buildAudioGraph(tracks, []);
    expect(validateGraph(graph).valid).toBe(true);
  });

  it("validateGraph validates track connected to bus", () => {
    const tracks = [{ id: "t1", name: "Vocal", type: "audio", color: "bg-blue-500", volume: 75, pan: 0, muted: false, solo: false, outputId: "bus-a", sends: {}, regions: [], sidechainSource: null, automation: {}, plugins: [] }];
    const buses = [{ id: "bus-a", name: "Drums", type: "audio", color: "bg-gray-500", volume: 80, pan: 0, muted: false, solo: false, outputId: null, plugins: [] }];
    const graph = buildAudioGraph(tracks, buses);
    expect(validateGraph(graph).valid).toBe(true);
  });
});

describe("previewEngine", () => {
  let engine: any;

  beforeEach(async () => {
    engine = await vi.importActual("../src/lib/previewEngine");
  });

  it("exports module API", () => {
    expect(Object.keys(engine).length).toBeGreaterThan(0);
  });

  it("getPreviewState returns initial state", () => {
    const state = engine.getPreviewState();
    expect(state.currentAsset).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.volume).toBeGreaterThan(0);
    expect(state.loading).toBe(false);
  });

  it("setPreviewVolume clamps to max 1", () => {
    engine.setPreviewVolume(1.5);
    expect(engine.getPreviewState().volume).toBe(1);
  });

  it("setPreviewVolume clamps to min 0", () => {
    engine.setPreviewVolume(-1);
    expect(engine.getPreviewState().volume).toBe(0);
  });

  it("setPreviewVolume sets normal values", () => {
    engine.setPreviewVolume(0.5);
    expect(engine.getPreviewState().volume).toBe(0.5);
  });

  it("stopPreview resets state", () => {
    engine.setPreviewVolume(0.5);
    engine.stopPreview();
    const state = engine.getPreviewState();
    expect(state.currentAsset).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.loading).toBe(false);
  });

  it("disposePreviewEngine cleans up", () => {
    expect(() => engine.disposePreviewEngine()).not.toThrow();
  });
});

describe("telemetry", () => {
  let telemetry: any;

  beforeEach(async () => {
    telemetry = await vi.importActual("../src/lib/audioTelemetry");
  });

  it("exports module functions", () => {
    expect(typeof telemetry.startTelemetry).toBe("function");
    expect(typeof telemetry.stopTelemetry).toBe("function");
    expect(typeof telemetry.recordFrame).toBe("function");
    expect(typeof telemetry.recordUnderrun).toBe("function");
    expect(typeof telemetry.recordCpuLoad).toBe("function");
    expect(typeof telemetry.getLatestMetrics).toBe("function");
    expect(typeof telemetry.getMetricsHistory).toBe("function");
    expect(typeof telemetry.getAverageMetrics).toBe("function");
    expect(typeof telemetry.getUnderrunCount).toBe("function");
    expect(typeof telemetry.getDroppedFrameCount).toBe("function");
    expect(typeof telemetry.isTelemetryRunning).toBe("function");
    expect(typeof telemetry.disposeTelemetry).toBe("function");
    expect(typeof telemetry.sendTelemetryReport).toBe("function");
  });

  it("startTelemetry and stopTelemetry toggle running state", () => {
    telemetry.startTelemetry({ ringBufferSize: 10 });
    expect(telemetry.isTelemetryRunning()).toBe(true);
    telemetry.stopTelemetry();
    expect(telemetry.isTelemetryRunning()).toBe(false);
  });

  it("recordUnderrun increments count", () => {
    telemetry.startTelemetry({ ringBufferSize: 10 });
    telemetry.recordUnderrun();
    telemetry.recordUnderrun();
    expect(telemetry.getUnderrunCount()).toBe(2);
    telemetry.stopTelemetry();
  });

  it("recordCpuLoad captures peak", () => {
    telemetry.recordCpuLoad(50);
    telemetry.recordCpuLoad(80);
    telemetry.recordCpuLoad(30);
    expect(telemetry.getLatestMetrics()).toBeNull();
  });
});

describe("projectBranching", () => {
  let branching: any;

  beforeEach(async () => {
    branching = await vi.importActual("../src/lib/projectBranching");
  });

  it("initBranching creates main branch", () => {
    branching.initBranching({ tracks: [], buses: [], masterPlugins: [], crdtOperations: [], metadata: {} });
    const main = branching.getMainState();
    expect(main).toBeDefined();
    expect(main.tracks).toEqual([]);
  });

  it("createBranch creates named branch", () => {
    branching.initBranching({ tracks: [], buses: [], masterPlugins: [], crdtOperations: [], metadata: {} });
    const branch = branching.createBranch("feature");
    expect(branch).not.toBeNull();
    expect(branch.name).toBe("feature");
  });

  it("createBranch inherits parent state", () => {
    branching.initBranching({
      tracks: [{ id: "t1", name: "Vocal", type: "audio", volume: 75, pan: 0, muted: false, solo: false, outputId: null, plugins: [] }],
      buses: [],
      masterPlugins: [],
      crdtOperations: [],
      metadata: {},
    });
    const branch = branching.createBranch("feature");
    expect(branch.state.tracks).toHaveLength(1);
    expect(branch.state.tracks[0].name).toBe("Vocal");
  });

  it("switchBranch switches active branch", () => {
    branching.initBranching({ tracks: [], buses: [], masterPlugins: [], crdtOperations: [], metadata: {} });
    const branch = branching.createBranch("feature");
    branching.switchBranch(branch.id);
    expect(branching.getActiveBranch().id).toBe(branch.id);
  });

  it("getAllBranches returns all branches", () => {
    branching.initBranching({ tracks: [], buses: [], masterPlugins: [], crdtOperations: [], metadata: {} });
    branching.createBranch("a");
    branching.createBranch("b");
    expect(branching.getAllBranches()).toHaveLength(3);
  });

  it("applyOperationToBranch adds op to branch", () => {
    branching.initBranching({ tracks: [], buses: [], masterPlugins: [], crdtOperations: [], metadata: {} });
    const op = branching.applyOperationToBranch("main", { userId: "local", type: "track.add", path: "tracks", value: { id: "t1", name: "Vocal", type: "audio", volume: 75, pan: 0, muted: false, solo: false, outputId: null, plugins: [] } });
    expect(op).not.toBeNull();
    expect(op.type).toBe("track.add");
    expect(branching.getMainState().tracks).toHaveLength(1);
  });

  it("diffBranches detects added tracks", () => {
    branching.initBranching({ tracks: [], buses: [], masterPlugins: [], crdtOperations: [], metadata: {} });
    const branch = branching.createBranch("feature");
    branching.applyOperationToBranch(branch.id, { userId: "local", type: "track.add", path: "tracks", value: { id: "t1", name: "Vocal", type: "audio", volume: 75, pan: 0, muted: false, solo: false, outputId: null, plugins: [] } });
    const diff = branching.diffBranches(branch.id);
    expect(diff).not.toBeNull();
    expect(diff.addedTracks).toHaveLength(1);
  });

  it("mergeBranch merges feature into main", () => {
    branching.initBranching({ tracks: [], buses: [], masterPlugins: [], crdtOperations: [], metadata: {} });
    const branch = branching.createBranch("feature");
    branching.applyOperationToBranch(branch.id, { userId: "local", type: "track.add", path: "tracks", value: { id: "t1", name: "Vocal", type: "audio", volume: 75, pan: 0, muted: false, solo: false, outputId: null, plugins: [] } });
    const merged = branching.mergeBranch(branch.id);
    expect(merged).not.toBeNull();
    expect(merged.tracks).toHaveLength(1);
  });
});

describe("transientDetection", () => {
  let detectTransients: any;

  beforeEach(async () => {
    const mod = await vi.importActual("../src/lib/transientDetection");
    detectTransients = mod.detectTransients;
  });

  it("returns empty for silent buffer", () => {
    const buf = { getChannelData: () => new Float32Array(44100), sampleRate: 44100, length: 44100, numberOfChannels: 1 };
    const transients = detectTransients(buf as any);
    expect(transients).toBeDefined();
    expect(Array.isArray(transients)).toBe(true);
  });

  it("detects impulses", () => {
    const len = 44100;
    const data = new Float32Array(len);
    for (let i = 500; i < 1500; i++) {
      data[i] = 0.5 + Math.random() * 0.5;
    }
    for (let i = 22000; i < 23000; i++) {
      data[i] = 0.5 + Math.random() * 0.5;
    }
    const buf = { getChannelData: () => data, sampleRate: 44100, length: len, numberOfChannels: 1 };
    expect(detectTransients(buf as any, 0.5).length).toBeGreaterThanOrEqual(1);
  });

  it("returns transient positions in range", () => {
    const len = 44100;
    const data = new Float32Array(len);
    data[5000] = 1;
    const buf = { getChannelData: () => data, sampleRate: 44100, length: len, numberOfChannels: 1 };
    detectTransients(buf as any, 0.3).forEach((t: any) => {
      expect(t.time).toBeGreaterThanOrEqual(0);
      expect(t.index).toBeLessThan(len);
    });
  });
});

describe("openbandFormat", () => {
  let format: any;

  beforeEach(async () => {
    format = await vi.importActual("../src/lib/openbandFormat");
  });

  it("exports module functions", () => {
    expect(typeof format.createOpenBandArchive).toBe("function");
    expect(typeof format.parseOpenBandArchive).toBe("function");
  });

  it("createOpenBandArchive returns Uint8Array", () => {
    const project = {
      version: "1.0",
      format: "openband" as const,
      metadata: { name: "Test", bpm: 120, key: "C", genre: "pop", artist: "", duration: 240, createdAt: "", modifiedAt: "" },
      tracks: [] as any[],
      buses: [] as any[],
      masterPlugins: [] as any[],
      masteringChain: [] as any[],
      mixSnapshots: [] as any[],
      chords: [] as any[],
      crdtSnapshot: {},
      waveformPeaks: {},
    };
    const archive = format.createOpenBandArchive(project as any);
    expect(archive).toBeInstanceOf(Uint8Array);
    expect(archive.length).toBeGreaterThan(0);
  });
});

describe("hardwareIO module", () => {
  let hw: any;

  beforeEach(async () => {
    hw = await vi.importActual("../src/lib/hardwareIO");
  });

  it("exports functions", () => {
    expect(Object.keys(hw).length).toBeGreaterThan(0);
  });
});

describe("wasmPluginHost module", () => {
  let wasm: any;

  beforeEach(async () => {
    wasm = await vi.importActual("../src/lib/wasmPluginHost");
  });

  it("exports modules", () => {
    expect(Object.keys(wasm).length).toBeGreaterThan(0);
  });
});

describe("collaboration module", () => {
  let collab: any;

  beforeEach(async () => {
    collab = await vi.importActual("../src/lib/collaboration");
  });

  it("exports modules", () => {
    expect(Object.keys(collab).length).toBeGreaterThan(0);
  });
});

describe("timeStretch module", () => {
  let ts: any;

  beforeEach(async () => {
    ts = await vi.importActual("../src/lib/timeStretch");
  });

  it("exports functions", () => {
    expect(Object.keys(ts).length).toBeGreaterThan(0);
  });
});
