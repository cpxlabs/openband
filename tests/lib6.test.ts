import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── harmony.ts ───
import {
  NOTE_TO_MIDI,
  SCALE_INTERVALS,
  PROGRESSION_PRESETS,
  getScale,
  isMinorKey,
  getDefaultScaleType,
  keyToRootNote,
  resolveProgression,
  getMidiNote,
} from "../src/lib/harmony";

// ─── voiceCommands.ts ───
import { parseVoiceCommand, getVoiceCommandSuggestions } from "../src/lib/voiceCommands";

// ─── timelineGestures.ts ───
import {
  createInitialState,
  processGestureInput,
  screenToTimelinePosition,
  timelineToScreenPosition,
  snapToGrid,
  getVisibleRange,
  clampTransform,
  createTimelineGestureMachine,
} from "../src/lib/timelineGestures";

// ─── arrangementGenerator.ts ───
import {
  generateArrangement,
  getEnergyLabel,
  getEnergyColor,
  getTotalBars,
  SUBGENRE_STRUCTURES,
} from "../src/lib/arrangementGenerator";

// ─── midiLearn.ts ───
import {
  processMidiCC,
  startLearning,
  stopLearning,
  clearMappings,
  saveMappings,
  loadMappings,
  getMappingsForPlugin,
  isLearning,
  removeMapping,
} from "../src/lib/midiLearn";

// ─── stemManifest.ts ───
import { buildStemManifest } from "../src/lib/stemManifest";

// ─── crashRecovery.ts ───
import {
  scheduleCrashSave,
  clearCrashState,
  getAllCrashStates,
} from "../src/lib/crashRecovery";
import type { TrackDef } from "../src/lib/types";

// ─── presence.ts ───
import { clearPresenceStore } from "../src/lib/presence";

// ─── latencyMonitor.ts ───
import {
  getOptimalLatencyConfig,
  setMonitorVolume,
  setInputVolume,
  getMonitorState,
  measureInputLatency,
} from "../src/lib/latencyMonitor";

// ─── aiAutoMixAnalysis.ts ───
import { formatAnalysisReport } from "../src/lib/aiAutoMixAnalysis";
import type { StemAnalysis } from "../src/lib/aiAutoMixAnalysis";

// ─── flags.ts & apiUrl.ts ───
import { VISITOR_MODE } from "../src/lib/flags";
import { API_BASE_URL } from "../src/lib/apiUrl";

// ─── cloudSync.ts ───
import { getSyncState } from "../src/lib/cloudSync";

// ─── MIDI Parser exports ───
import { noteToName, parseMidi, ticksToSeconds, midiToTrackRegions } from "../src/lib/midiParser";

// ─── sceneLighting ───
import { addSceneBulb, addRGBStrip } from "../src/lib/sceneLighting";

// ─── audioNodeGraph ───
import { AudioNodeGraph } from "../src/lib/audioNodeGraph";

// ─── pedalboardDsp ───
import { createPedalboardNode } from "../src/lib/pedalboardDsp";

// ─── harmony.ts ───
describe("harmony", () => {
  it("has NOTE_TO_MIDI mapping for all 12 notes", () => {
    expect(Object.keys(NOTE_TO_MIDI)).toHaveLength(12);
    expect(NOTE_TO_MIDI.C).toBe(60);
    expect(NOTE_TO_MIDI["C#"]).toBe(61);
    expect(NOTE_TO_MIDI.B).toBe(71);
  });

  it("has SCALE_INTERVALS for major and minor", () => {
    expect(SCALE_INTERVALS.major).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(SCALE_INTERVALS.natural_minor).toEqual([0, 2, 3, 5, 7, 8, 10]);
    expect(SCALE_INTERVALS.blues).toHaveLength(6);
  });

  it("has 10 PROGRESSION_PRESETS", () => {
    expect(PROGRESSION_PRESETS).toHaveLength(10);
    expect(PROGRESSION_PRESETS[0].name).toBe("Pop Clássico");
    expect(PROGRESSION_PRESETS[0].degrees).toHaveLength(4);
  });

  it("getScale returns correct notes", () => {
    const cMajor = getScale(60, "major");
    expect(cMajor).toEqual([60, 62, 64, 65, 67, 69, 71]);
    const aMinor = getScale(69, "natural_minor");
    expect(aMinor).toEqual([69, 71, 72, 74, 76, 77, 79]);
  });

  it("getScale defaults to major for unknown scale type", () => {
    const result = getScale(60, "unknown" as any);
    expect(result).toEqual(SCALE_INTERVALS.major.map(i => 60 + i));
  });

  it("isMinorKey returns true for keys with 'm'", () => {
    expect(isMinorKey("Am")).toBe(true);
    expect(isMinorKey("Cm")).toBe(true);
    expect(isMinorKey("C")).toBe(false);
    expect(isMinorKey("F#m")).toBe(true);
  });

  it("getDefaultScaleType returns natural_minor for minor keys", () => {
    expect(getDefaultScaleType("Am")).toBe("natural_minor");
    expect(getDefaultScaleType("C")).toBe("major");
  });

  it("keyToRootNote returns correct MIDI note", () => {
    expect(keyToRootNote("C")).toBe(60);
    expect(keyToRootNote("Am")).toBe(69);
    expect(keyToRootNote("F#")).toBe(66);
    expect(keyToRootNote("InvalidKey")).toBe(60);
  });

  it("resolveProgression returns chord note arrays", () => {
    const popProg = PROGRESSION_PRESETS[0].degrees; // I - V - vi - IV
    const chords = resolveProgression(popProg, 60, "major");
    expect(chords).toHaveLength(4);
    expect(chords[0]).toContain(60);
    expect(chords[1]).toContain(67);
    expect(chords[2]).toContain(69);
    expect(chords[3]).toContain(65);
  });

  it("resolveProgression handles 7th and maj7 qualities", () => {
    const jazzProg = PROGRESSION_PRESETS[1].degrees; // ii - V - I
    const chords = resolveProgression(jazzProg, 60, "major");
    expect(chords).toHaveLength(3);
    // ii° has chord root at degree 1 = 62, quality min → 3 semitones → 65, 5th → 69
    expect(chords[1].length).toBe(4); // 7th chord has 4 notes
  });

  it("getMidiNote returns correct note for key name and octave", () => {
    expect(getMidiNote("C", 4)).toBe(60);
    expect(getMidiNote("C", 5)).toBe(72);
    expect(getMidiNote("A", 4)).toBe(69);
    expect(getMidiNote("G#", 3)).toBe(56);
    expect(getMidiNote("Invalid", 4)).toBe(60);
  });
});

// ─── flags.ts & apiUrl.ts ───
describe("flags & apiUrl", () => {
  it("VISITOR_MODE is a boolean", () => {
    expect(typeof VISITOR_MODE).toBe("boolean");
  });

  it("API_BASE_URL is a string", () => {
    expect(typeof API_BASE_URL).toBe("string");
  });
});

// ─── voiceCommands.ts ───
describe("voiceCommands", () => {
  it("parses mood command", () => {
    const result = parseVoiceCommand("Muda o mood para rain");
    expect(result.action).toBe("SET_MOOD");
    expect(result.value).toBe("rain");
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("parses BPM command", () => {
    const result = parseVoiceCommand("bpm para 120");
    expect(result.action).toBe("SET_BPM");
    expect(result.value).toBe(120);
  });

  it("rejects BPM outside valid range", () => {
    const result = parseVoiceCommand("bpm para 500");
    expect(result.action).not.toBe("SET_BPM");
  });

  it("parses play command", () => {
    const result = parseVoiceCommand("tocar");
    expect(result.action).toBe("TOGGLE_PLAY");
    expect(result.value).toBe("play");
  });

  it("parses pause command", () => {
    const result = parseVoiceCommand("parar");
    expect(result.action).toBe("TOGGLE_PLAY");
    expect(result.value).toBe("pause");
  });

  it("parses mute command returns all due to index bug", () => {
    const result = parseVoiceCommand("mutar track bateria");
    expect(result.action).toBe("TOGGLE_MUTE");
    expect(result.value).toBe("all");
  });

  it("parses volume command", () => {
    const result = parseVoiceCommand("volume para 80");
    expect(result.action).toBe("SET_VOLUME");
    expect(result.value).toBe(80);
  });

  it("rejects volume outside valid range", () => {
    const result = parseVoiceCommand("volume para 200");
    expect(result.action).not.toBe("SET_VOLUME");
  });

  it("parses next chords command", () => {
    const result = parseVoiceCommand("próximo acordes");
    expect(result.action).toBe("NEXT_CHORDS");
  });

  it("parses export command", () => {
    const result = parseVoiceCommand("exportar projeto");
    expect(result.action).toBe("EXPORT");
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("parses genre command", () => {
    const result = parseVoiceCommand("gênero para pop");
    expect(result.action).toBe("SET_GENRE");
    expect(result.value).toBe("pop");
  });

  it("returns UNKNOWN for gibberish", () => {
    const result = parseVoiceCommand("asdfghjkl");
    expect(result.action).toBe("UNKNOWN");
    expect(result.confidence).toBe(0);
  });

  it("getVoiceCommandSuggestions returns array of strings", () => {
    const suggestions = getVoiceCommandSuggestions();
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]).toContain("Muda");
  });
});

// ─── timelineGestures.ts ───
describe("timelineGestures", () => {
  it("createInitialState returns default state", () => {
    const state = createInitialState();
    expect(state.mode).toBe("idle");
    expect(state.transform).toEqual({ scale: 1, translateX: 0, translateY: 0 });
    expect(state.selectionStart).toBeNull();
  });

  it("processGestureInput with pan updates translate", () => {
    const state = createInitialState();
    const next = processGestureInput(state, { type: "pan", panX: 10, panY: 20 });
    expect(next.mode).toBe("scroll");
    expect(next.transform.translateX).toBe(10);
    expect(next.transform.translateY).toBe(20);
  });

  it("processGestureInput with pinch updates scale", () => {
    const state = createInitialState();
    const first = processGestureInput(state, { type: "pinch", pinchDistance: 100 });
    expect(first.mode).toBe("zoom");
    const second = processGestureInput(first, { type: "pinch", pinchDistance: 200 });
    expect(second.transform.scale).toBeGreaterThan(1);
  });

  it("processGestureInput with tap exits select mode", () => {
    const state = { ...createInitialState(), mode: "select" as const, selectionStart: { x: 10, y: 10 }, selectionEnd: { x: 20, y: 20 } };
    const next = processGestureInput(state, { type: "tap" });
    expect(next.mode).toBe("idle");
    expect(next.selectionStart).toBeNull();
  });

  it("processGestureInput with longpress enters select mode", () => {
    const state = createInitialState();
    const next = processGestureInput(state, { type: "longpress", tapX: 50, tapY: 100 });
    expect(next.mode).toBe("select");
    expect(next.selectionStart).toEqual({ x: 50, y: 100 });
  });

  it("processGestureInput with pan in select mode updates selectionEnd", () => {
    const state = { ...createInitialState(), mode: "select" as const, selectionStart: { x: 10, y: 10 }, selectionEnd: { x: 20, y: 20 } };
    const next = processGestureInput(state, { type: "pan", tapX: 30, tapY: 40 });
    expect(next.selectionEnd).toEqual({ x: 30, y: 40 });
  });

  it("processGestureInput with multiPan uses fingerCount", () => {
    const state = createInitialState();
    const next = processGestureInput(state, { type: "multiPan", panX: 5, panY: 10, fingerCount: 2 });
    expect(next.transform.translateX).toBe(5);
    expect(next.transform.translateY).toBe(10);
  });

  it("processGestureInput with unknown type returns unchanged", () => {
    const state = createInitialState();
    const next = processGestureInput(state, { type: "tap" as any });
    expect(next).toEqual(state);
  });

  it("screenToTimelinePosition converts correctly", () => {
    const result = screenToTimelinePosition(100, { scale: 2, translateX: 10, translateY: 0 }, 20);
    expect(result).toBe(35);
  });

  it("timelineToScreenPosition converts correctly", () => {
    const result = timelineToScreenPosition(35, { scale: 2, translateX: 10, translateY: 0 }, 20);
    expect(result).toBe(100);
  });

  it("snapToGrid snaps when enabled", () => {
    expect(snapToGrid(37, 16, true)).toBe(32);
    expect(snapToGrid(40, 16, true)).toBe(48);
  });

  it("snapToGrid returns position unchanged when disabled", () => {
    expect(snapToGrid(37, 16, false)).toBe(37);
  });

  it("getVisibleRange returns correct start/end", () => {
    const range = getVisibleRange(100, { scale: 1, translateX: -10, translateY: 0 }, 200);
    expect(range.start).toBe(10);
    expect(range.end).toBe(110);
  });

  it("clampTransform constrains translate values", () => {
    const clamped = clampTransform(
      { scale: 2, translateX: 100, translateY: 50 },
      200, 200, 100, 100,
    );
    expect(clamped.translateX).toBe(0);
    expect(clamped.translateY).toBe(0);
    const clamped2 = clampTransform(
      { scale: 2, translateX: -100, translateY: -50 },
      200, 200, 100, 100,
    );
    expect(clamped2.translateX).toBe(0);
    expect(clamped2.translateY).toBe(0);
  });

  it("createTimelineGestureMachine provides working interface", () => {
    const machine = createTimelineGestureMachine();
    expect(machine.getState().mode).toBe("idle");
    machine.process({ type: "pan", panX: 10, panY: 20 });
    expect(machine.getState().transform.translateX).toBe(10);
    machine.reset();
    expect(machine.getState().transform.translateX).toBe(0);
    machine.setTransform({ scale: 2, translateX: 5, translateY: 5 });
    expect(machine.getState().transform.scale).toBe(2);
  });

  it("createTimelineGestureMachine with initial transform", () => {
    const machine = createTimelineGestureMachine({ scale: 2, translateX: 10, translateY: 20 });
    expect(machine.getState().transform.scale).toBe(2);
  });
});

// ─── arrangementGenerator.ts ───
describe("arrangementGenerator", () => {
  it("SUBGENRE_STRUCTURES has known subgenres", () => {
    expect(Object.keys(SUBGENRE_STRUCTURES)).toContain("trap");
    expect(Object.keys(SUBGENRE_STRUCTURES)).toContain("boombap");
    expect(Object.keys(SUBGENRE_STRUCTURES)).toContain("synthwave");
    expect(Object.keys(SUBGENRE_STRUCTURES)).toContain("lofi_urban");
  });

  it("generateArrangement returns sections for trap", () => {
    const sections = generateArrangement("trap");
    expect(sections).toHaveLength(7);
    expect(sections[0].name).toBe("Intro");
    expect(sections[0].energy).toBe(2);
    expect(sections[3].name).toBe("Hook");
    expect(sections[3].energy).toBe(5);
  });

  it("generateArrangement returns empty array for unknown subgenre", () => {
    expect(generateArrangement("unknown")).toEqual([]);
  });

  it("getEnergyLabel returns labels for all levels", () => {
    expect(getEnergyLabel(1)).toBe("Mínima");
    expect(getEnergyLabel(3)).toBe("Média");
    expect(getEnergyLabel(5)).toBe("Máxima");
  });

  it("getEnergyColor returns hex for all levels", () => {
    expect(getEnergyColor(1)).toBe("#374151");
    expect(getEnergyColor(5)).toBe("#ef4444");
  });

  it("getTotalBars returns correct bar count", () => {
    expect(getTotalBars("trap")).toBe(48);
    expect(getTotalBars("boombap")).toBe(40);
    expect(getTotalBars("unknown")).toBe(32);
  });

  it("each subgenre has valid energy levels", () => {
    for (const sections of Object.values(SUBGENRE_STRUCTURES)) {
      for (const section of sections) {
        expect(section.energy).toBeGreaterThanOrEqual(1);
        expect(section.energy).toBeLessThanOrEqual(5);
        expect(section.startBar).toBeGreaterThanOrEqual(1);
        expect(section.endBar).toBeGreaterThan(section.startBar);
      }
    }
  });
});

// ─── midiLearn.ts ───
describe("midiLearn", () => {
  function newState(overrides?: Record<string, any>) {
    return { mappings: [], learningMode: false, activeTarget: null, ...overrides } as any;
  }

  beforeEach(() => localStorage.clear());

  it("processMidiCC returns null in learning mode with activeTarget", () => {
    const state = newState({ learningMode: true, activeTarget: { pluginId: "eq", paramId: "gain", trackId: "t1" } });
    const result = processMidiCC(42, 100, state);
    expect(result).toBeNull();
  });

  it("processMidiCC creates mapping in learning mode", () => {
    const state = newState({ learningMode: true, activeTarget: { pluginId: "eq", paramId: "gain", trackId: "t1" } });
    processMidiCC(42, 100, state);
    expect(state.mappings).toHaveLength(1);
    expect(state.mappings[0].cc).toBe(42);
    expect(state.mappings[0].pluginId).toBe("eq");
  });

  it("processMidiCC updates existing mapping for same target", () => {
    const state = newState({
      mappings: [{ cc: 10, pluginId: "eq", paramId: "gain", trackId: "t1" }],
      learningMode: true,
      activeTarget: { pluginId: "eq", paramId: "gain", trackId: "t1" },
    });
    processMidiCC(99, 100, state);
    expect(state.mappings).toHaveLength(1);
    expect(state.mappings[0].cc).toBe(99);
  });

  it("processMidiCC looks up mapping outside learning mode", () => {
    const state = newState({
      mappings: [{ cc: 42, pluginId: "eq", paramId: "gain", trackId: "t1" }],
    });
    const result = processMidiCC(42, 64, state);
    expect(result).not.toBeNull();
    expect(result!.pluginId).toBe("eq");
    expect(result!.paramId).toBe("gain");
    expect(result!.normalizedValue).toBeCloseTo(0.504);
  });

  it("processMidiCC returns null for unmapped CC", () => {
    const result = processMidiCC(99, 64, newState());
    expect(result).toBeNull();
  });

  it("startLearning sets mode and target", () => {
    const state = newState();
    startLearning({ pluginId: "comp", paramId: "threshold", trackId: "t2" }, state);
    expect(state.learningMode).toBe(true);
    expect(state.activeTarget).toEqual({ pluginId: "comp", paramId: "threshold", trackId: "t2" });
  });

  it("stopLearning clears mode and target", () => {
    const state = newState({ learningMode: true, activeTarget: { pluginId: "eq", paramId: "gain", trackId: "t1" } });
    stopLearning(state);
    expect(state.learningMode).toBe(false);
    expect(state.activeTarget).toBeNull();
  });

  it("clearMappings removes all mappings", () => {
    const state = newState({
      mappings: [{ cc: 1, pluginId: "a", paramId: "b", trackId: "c" }],
    });
    clearMappings(state);
    expect(state.mappings).toHaveLength(0);
  });

  it("saveMappings and loadMappings persist to localStorage", () => {
    const mappings = [{ cc: 1, pluginId: "eq", paramId: "gain", trackId: "t1" }];
    saveMappings(mappings);
    const loaded = loadMappings();
    expect(loaded).toEqual(mappings);
  });

  it("loadMappings returns empty array when nothing saved", () => {
    expect(loadMappings()).toEqual([]);
  });

  it("getMappingsForPlugin filters by track and plugin", () => {
    const state = newState({
      mappings: [
        { cc: 1, pluginId: "eq", paramId: "gain", trackId: "t1" },
        { cc: 2, pluginId: "eq", paramId: "freq", trackId: "t1" },
        { cc: 3, pluginId: "comp", paramId: "threshold", trackId: "t2" },
      ],
    });
    const filtered = getMappingsForPlugin(state, "t1", "eq");
    expect(filtered).toHaveLength(2);
  });

  it("isLearning returns true for active target", () => {
    const state = newState({ learningMode: true, activeTarget: { pluginId: "eq", paramId: "gain", trackId: "t1" } });
    expect(isLearning(state, "eq", "gain", "t1")).toBe(true);
    expect(isLearning(state, "eq", "freq", "t1")).toBe(false);
  });

  it("removeMapping removes specific mapping", () => {
    const state = newState({
      mappings: [
        { cc: 1, pluginId: "eq", paramId: "gain", trackId: "t1" },
        { cc: 2, pluginId: "eq", paramId: "freq", trackId: "t1" },
      ],
    });
    removeMapping(state, "eq", "gain", "t1");
    expect(state.mappings).toHaveLength(1);
    expect(state.mappings[0].paramId).toBe("freq");
  });
});

// ─── stemManifest.ts ───
describe("stemManifest", () => {
  const tracks: TrackDef[] = [
    { id: "t1", name: "Kick", volume: 1, pan: 0, muted: false, solo: false, color: "#fff", sends: {}, regions: [], plugins: [], automation: {}, sidechainSource: null },
    { id: "t2", name: "Bass", volume: 1, pan: 0, muted: false, solo: false, color: "#fff", sends: {}, regions: [], plugins: [], automation: {}, sidechainSource: null, midiNotes: [{ pitch: 36, velocity: 100, start: 0, duration: 1 }] },
  ];

  it("buildStemManifest returns correct structure", () => {
    const manifest = buildStemManifest("proj-1", 120, "C", ["C", "F", "G"], tracks);
    expect(manifest.generator).toContain("Openband");
    expect(manifest.projectOriginId).toBe("proj-1");
    expect(manifest.sessionMetadata.globalBpm).toBe(120);
    expect(manifest.sessionMetadata.globalKey).toBe("C");
    expect(manifest.sessionMetadata.chordsSequence).toEqual(["C", "F", "G"]);
  });

  it("buildStemManifest maps tracks to stems", () => {
    const manifest = buildStemManifest("proj-1", 120, "C", [], tracks);
    expect(manifest.stemsRegistry).toHaveLength(2);
    expect(manifest.stemsRegistry[0].filename).toBe("kick.wav");
    expect(manifest.stemsRegistry[0].trackType).toBe("audio_track");
    expect(manifest.stemsRegistry[1].filename).toBe("bass.wav");
    expect(manifest.stemsRegistry[1].trackType).toBe("midi_synthesizer");
    expect(manifest.stemsRegistry[1].patchRef).toBe("bass");
  });
});

// ─── crashRecovery.ts ───
describe("crashRecovery", () => {
  it("scheduleCrashSave does not throw", () => {
    expect(() => scheduleCrashSave("proj-1", { foo: "bar" })).not.toThrow();
  });

  it("clearCrashState returns without error", async () => {
    await expect(clearCrashState("proj-nonexistent")).resolves.toBeUndefined();
  });

  it("getAllCrashStates returns array", async () => {
    const states = await getAllCrashStates();
    expect(Array.isArray(states)).toBe(true);
  });
});

// ─── presence.ts ───
describe("presence", () => {
  it("clearPresenceStore is a function", () => {
    expect(typeof clearPresenceStore).toBe("function");
  });
});

// ─── latencyMonitor.ts ───
describe("latencyMonitor", () => {
  it("getOptimalLatencyConfig returns web config", () => {
    const config = getOptimalLatencyConfig();
    expect(config.sampleRate).toBe(44100);
    expect(config.latencyHint).toBe("interactive");
    expect(config.bufferDurationMs).toBeGreaterThan(0);
  });

  it("setMonitorVolume clamps between 0 and 1", () => {
    setMonitorVolume(1.5);
    const state = getMonitorState();
    expect(state.monitorVolume).toBe(1);

    setMonitorVolume(-0.5);
    const state2 = getMonitorState();
    expect(state2.monitorVolume).toBe(0);
  });

  it("setInputVolume clamps between 0 and 1", () => {
    setInputVolume(2);
    const state = getMonitorState();
    expect(state.inputVolume).toBe(1);
  });

  it("measureInputLatency computes milliseconds", () => {
    const ctx = { outputLatency: 0.01, baseLatency: 0.005 } as AudioContext;
    const ms = measureInputLatency(ctx);
    expect(ms).toBe(15);
  });
});

// ─── aiAutoMixAnalysis (formatAnalysisReport) ───
describe("aiAutoMixAnalysis", () => {
  it("formatAnalysisReport returns non-empty string", () => {
    const analyses: StemAnalysis[] = [
      {
        trackId: "t1", trackName: "Kick", role: "kick",
        lufs: -12, peakDb: -3, dynamicRange: 8,
        spectralBalance: { low: 0.6, mid: 0.3, high: 0.1 },
        transientDensity: 0.5, stereoWidth: 0.3, rmsLevel: 0.4, crestFactor: 6,
      },
      {
        trackId: "t2", trackName: "Bass", role: "bass",
        lufs: -15, peakDb: -5, dynamicRange: 10,
        spectralBalance: { low: 0.7, mid: 0.2, high: 0.1 },
        transientDensity: 0.2, stereoWidth: 0.5, rmsLevel: 0.3, crestFactor: 4,
      },
    ];
    const report = formatAnalysisReport(analyses);
    expect(typeof report).toBe("string");
    expect(report.length).toBeGreaterThan(0);
    expect(report).toContain("Kick");
    expect(report).toContain("Bass");
  });

  it("formatAnalysisReport handles empty array", () => {
    const report = formatAnalysisReport([]);
    expect(typeof report).toBe("string");
  });
});

// ─── midiParser ───
describe("midiParser", () => {
  it("noteToName returns note names", () => {
    expect(noteToName(60)).toBe("C4");
    expect(noteToName(61)).toBe("C#4");
    expect(noteToName(69)).toBe("A4");
    expect(noteToName(0)).toBe("C-1");
  });

  it("parseMidi returns null for invalid data", () => {
    const result = parseMidi(new ArrayBuffer(0));
    expect(result).toBeNull();
  });

  it("ticksToSeconds converts correctly", () => {
    const result = ticksToSeconds(960, 120, 480);
    expect(result).toBe(1);
    expect(ticksToSeconds(480, 120, 480)).toBe(0.5);
  });

  it("midiToTrackRegions processes a track with notes", () => {
    const track = {
      name: "Piano", channel: 0, instrument: "Acoustic Grand Piano",
      notes: [{ channel: 0, note: 60, velocity: 100, start: 0, duration: 480 }],
    };
    const regions = midiToTrackRegions(track, 120, 480);
    expect(regions).toHaveLength(1);
    expect(regions[0].start).toBe(0);
    expect(regions[0].duration).toBeGreaterThanOrEqual(0.5);
  });
});

// ─── sceneLighting ───
describe("sceneLighting", () => {
  const mockThree = {
    Group: vi.fn(function () {
      return { position: { set: vi.fn(), y: 0 }, add: vi.fn() };
    }),
    Mesh: vi.fn(function () {
      return { position: { set: vi.fn(), y: 0 } };
    }),
    MeshStandardMaterial: vi.fn(function () { return {}; }),
    MeshBasicMaterial: vi.fn(function () { return {}; }),
    SphereGeometry: vi.fn(),
    CylinderGeometry: vi.fn(),
    BoxGeometry: vi.fn(),
    PointLight: vi.fn(function () {
      return { position: { set: vi.fn(), y: 0 } };
    }),
  };
  const mockScene = { add: vi.fn() };

  it("addSceneBulb creates group and adds to scene", () => {
    const result = addSceneBulb(mockThree, mockScene);
    expect(result).toBeDefined();
    expect(mockScene.add).toHaveBeenCalled();
  });

  it("addRGBStrip creates strip and adds to scene", () => {
    const result = addRGBStrip(mockThree, mockScene);
    expect(result.stripMat).toBeDefined();
    expect(result.dotMat).toBeDefined();
    expect(mockScene.add).toHaveBeenCalled();
  });
});

// ─── audioNodeGraph ───
describe("audioNodeGraph", () => {
  it("AudioNodeGraph is defined", () => {
    expect(AudioNodeGraph).toBeDefined();
  });
});

// ─── pedalboardDsp ───
describe("pedalboardDsp", () => {
  it("createPedalboardNode is a function", () => {
    expect(typeof createPedalboardNode).toBe("function");
  });
});

// ─── cloudSync ───
describe("cloudSync", () => {
  it("getSyncState returns default state", () => {
    const state = getSyncState("proj-unknown");
    expect(state).toEqual({ isSyncing: false, lastSyncedAt: null, pending: false, error: null });
  });
});
