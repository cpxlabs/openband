import { describe, it, expect, beforeEach } from "vitest";
import {
  registerCommand,
  unregisterCommand,
  disposeCommandRegistry,
  executeCommand,
  searchCommands,
  getAllCommands,
  togglePalette,
  isPaletteOpen,
  registerDefaultCommands,
  getCommand,
} from "../src/lib/commandRegistry";
import { generatePeakData, getVisibleRange } from "../src/lib/canvasWaveform";
import {
  interpolateAutomationValue,
  buildAutomationSchedule,
} from "../src/lib/automationEngine";
import {
  createDefaultBuses,
  assignTrackToBus,
} from "../src/lib/busRouter";
import {
  buildAudioGraph,
  wouldCreateCycle,
  validateGraph,
} from "../src/lib/audioGraphValidation";
import {
  getModSources,
  getModTargets,
  addModRoute,
  setMacroValue,
  computeModulation,
  disposeModulationMatrix,
} from "../src/lib/modulationMatrix";
import type { TrackDef, BusDef } from "../src/lib/types";

function makeAudioBuffer(data: Float32Array, sampleRate = 44100): AudioBuffer {
  return {
    sampleRate,
    length: data.length,
    duration: data.length / sampleRate,
    numberOfChannels: 1,
    getChannelData: () => data,
  } as unknown as AudioBuffer;
}

function makeTrack(id: string, outputId?: string | null): TrackDef {
  return {
    id,
    name: id,
    color: "#fff",
    muted: false,
    solo: false,
    volume: 1,
    pan: 0,
    sends: {},
    regions: [],
    sidechainSource: null,
    plugins: [],
    automation: {},
    outputId,
  };
}

function makeBus(id: string): BusDef {
  return {
    id,
    name: id,
    color: "#fff",
    volume: 1,
    muted: false,
    plugins: [],
  };
}

describe("command-palette", () => {
  beforeEach(() => disposeCommandRegistry());

  it("registers a command and executeCommand runs its action", () => {
    let ran = 0;
    registerCommand("test.hello", "Hello", "Say hi", "Test", () => {
      ran++;
    });
    expect(executeCommand("test.hello")).toBe(true);
    expect(ran).toBe(1);
  });

  it("executeCommand returns false for unknown and disabled ids", () => {
    expect(executeCommand("nope")).toBe(false);
    registerCommand("test.off", "Off", "", "Test", () => {}, undefined, undefined, false);
    expect(executeCommand("test.off")).toBe(false);
  });

  it("searchCommands filters visible commands by substring", () => {
    registerCommand("transport.play", "Play", "Start playback", "Transport", () => {});
    registerCommand("edit.undo", "Undo", "Undo last action", "Edit", () => {});
    const hits = searchCommands("play");
    expect(hits.map((c) => c.id)).toEqual(["transport.play"]);
    expect(searchCommands("")).toHaveLength(2);
  });

  it("togglePalette flips isPaletteOpen", () => {
    expect(isPaletteOpen()).toBe(false);
    togglePalette();
    expect(isPaletteOpen()).toBe(true);
    togglePalette();
    expect(isPaletteOpen()).toBe(false);
  });

  it("registerDefaultCommands populates transport/edit/track/view/file/system commands", () => {
    registerDefaultCommands({});
    const ids = getAllCommands().map((c) => c.id);
    for (const expected of [
      "transport.play",
      "edit.undo",
      "track.add",
      "view.zoomIn",
      "file.save",
      "palette.toggle",
    ]) {
      expect(ids).toContain(expected);
    }
    expect(getCommand("palette.toggle")?.shortcut).toBe("Ctrl+K");
    unregisterCommand("transport.play");
  });
});

describe("waveform-rendering", () => {
  it("generatePeakData returns bounded peaks of sane length", () => {
    const n = 9000;
    const data = new Float32Array(n);
    for (let i = 0; i < n; i++) data[i] = Math.sin(i) * 0.5;
    const peaks = generatePeakData(makeAudioBuffer(data), 50);
    expect(peaks.length).toBe(Math.ceil(n / Math.floor(44100 / 50)));
    for (const p of peaks) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("generatePeakData captures the max absolute amplitude per block", () => {
    const data = new Float32Array(4410);
    data[100] = 0.75;
    const peaks = generatePeakData(makeAudioBuffer(data), 10);
    expect(peaks.some((p) => Math.abs(p - 0.75) < 1e-6)).toBe(true);
  });

  it("getVisibleRange returns a clamped window", () => {
    const range = getVisibleRange({
      scrollTop: 100,
      viewportHeight: 500,
      totalHeight: 1000,
      itemHeight: 50,
    });
    expect(range.start).toBe(1);
    expect(range.end).toBe(13);
  });
});

describe("automation-routing", () => {
  beforeEach(() => disposeModulationMatrix());

  it("interpolateAutomationValue is linear at midpoint", () => {
    const value = interpolateAutomationValue(
      [
        { time: 0, value: 0, curve: "linear" },
        { time: 1, value: 1, curve: "linear" },
      ],
      0.5,
    );
    expect(value).toBeCloseTo(0.5, 5);
  });

  it("interpolateAutomationValue is exponential at midpoint", () => {
    const value = interpolateAutomationValue(
      [
        { time: 0, value: 1, curve: "exponential" },
        { time: 1, value: 4, curve: "exponential" },
      ],
      0.5,
    );
    expect(value).toBeCloseTo(2, 5);
  });

  it("buildAutomationSchedule converts beats to seconds at 120 BPM", () => {
    const [point] = buildAutomationSchedule([{ time: 2, value: 1, curve: "linear" }], 120);
    expect(point.time).toBeCloseTo(1.0, 5);
  });

  it("createDefaultBuses and assignTrackToBus map names", () => {
    expect(createDefaultBuses()).toHaveLength(3);
    expect(assignTrackToBus("Kick Drum")).toBe("bus-drums");
    expect(assignTrackToBus("Lead Vocal")).toBe("bus-vocals");
    expect(assignTrackToBus("Synth Pad")).toBe("bus-instruments");
    expect(assignTrackToBus("Something Odd")).toBeNull();
  });

  it("wouldCreateCycle accepts an acyclic addition", () => {
    const graph = buildAudioGraph([makeTrack("A", "X")], [makeBus("X")]);
    expect(validateGraph(graph).valid).toBe(true);
    expect(wouldCreateCycle(graph, "A", "X").valid).toBe(true);
  });

  it("wouldCreateCycle rejects a back-edge", () => {
    const graph = buildAudioGraph([makeTrack("A", "X")], [makeBus("X")]);
    const result = wouldCreateCycle(graph, "X", "A");
    expect(result.valid).toBe(false);
    expect(result.cyclePath).toBeDefined();
  });

  it("getModSources and getModTargets each have 11 entries", () => {
    expect(getModSources()).toHaveLength(11);
    expect(getModTargets()).toHaveLength(11);
  });

  it("computeModulation returns the scaled macro contribution", () => {
    setMacroValue(0, 1);
    addModRoute("macro1", "volume", 0.5, false);
    const value = computeModulation("volume", { time: 0 });
    expect(value).toBeCloseTo(0.5, 5);
    expect(value).toBeGreaterThanOrEqual(-1);
    expect(value).toBeLessThanOrEqual(1);
  });
});
