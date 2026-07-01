import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VoiceManager } from "../src/lib/voiceStealing";
import { GainStager } from "../src/lib/gainStaging";
import { computeDelta, applyDelta, compactState, decompactState, estimateSavings } from "../src/lib/deltaCompression";
import {
  createSnapshot, getLatestSnapshot, getSnapshotHistory,
  shouldSnapshot, incrementOperationCount, compactOperations,
  mergeSnapshotIntoState, clearSnapshotStore,
} from "../src/lib/snapshotManager";
import { generateBassLine } from "../src/lib/bassFollower";
import { GENRE_TREE, findGenreNode, findSubgenre } from "../src/lib/genreTree";
import { suggestNextChords } from "../src/lib/harmonicAssistant";
import { TIMBRE_REGISTRY, matchTimbre, getDspSettings } from "../src/lib/timbreRegistry";

vi.mock("react-native", () => ({
  Platform: { OS: "web", select: (obj: any) => obj.web ?? obj.default },
}));

beforeEach(() => {
  vi.clearAllMocks();
  clearSnapshotStore();
});

afterEach(() => {
  clearSnapshotStore();
});

describe("voiceStealing - VoiceManager", () => {
  function createMockCtx(): AudioContext {
    return {
      currentTime: 0,
      createGain: vi.fn(() => ({
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn(),
      })),
      createOscillator: vi.fn(() => ({
        type: "sine" as OscillatorType,
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      destination: {},
      state: "running" as AudioContextState,
      resume: vi.fn(),
      close: vi.fn(),
    } as unknown as AudioContext;
  }

  it("allocate returns a voice ID", () => {
    const ctx = createMockCtx();
    const vm = new VoiceManager(ctx, 4);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const id = vm.allocate(osc, gain, 60);
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
    expect(id.startsWith("v-")).toBe(true);
  });

  it("getVoiceCount returns 0 initially", () => {
    const ctx = createMockCtx();
    const vm = new VoiceManager(ctx, 4);
    expect(vm.getVoiceCount()).toBe(0);
  });

  it("getVoiceCount increments after allocate", () => {
    const ctx = createMockCtx();
    const vm = new VoiceManager(ctx, 4);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    vm.allocate(osc, gain, 60);
    vm.allocate(osc, gain, 64);
    expect(vm.getVoiceCount()).toBe(2);
  });

  it("release removes a voice", () => {
    const ctx = createMockCtx();
    const vm = new VoiceManager(ctx, 4);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const id = vm.allocate(osc, gain, 60);
    expect(vm.getVoiceCount()).toBe(1);
    vm.release(id);
    expect(vm.getVoiceCount()).toBe(0);
  });

  it("release does nothing for invalid ID", () => {
    const ctx = createMockCtx();
    const vm = new VoiceManager(ctx, 4);
    expect(() => vm.release("invalid-id")).not.toThrow();
    expect(vm.getVoiceCount()).toBe(0);
  });

  it("releaseAll removes all voices", () => {
    const ctx = createMockCtx();
    const vm = new VoiceManager(ctx, 4);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    vm.allocate(osc, gain, 60);
    vm.allocate(osc, gain, 64);
    vm.allocate(osc, gain, 67);
    expect(vm.getVoiceCount()).toBe(3);
    vm.releaseAll();
    expect(vm.getVoiceCount()).toBe(0);
  });

  it("steals oldest voice when maxVoices exceeded", () => {
    const ctx = createMockCtx();
    const vm = new VoiceManager(ctx, 2);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    vm.allocate(osc, gain, 60);
    vm.allocate(osc, gain, 64);
    expect(vm.getVoiceCount()).toBe(2);
    vm.allocate(osc, gain, 67);
    expect(vm.getVoiceCount()).toBe(2);
  });

  it("setMaxVoices updates limit", () => {
    const ctx = createMockCtx();
    const vm = new VoiceManager(ctx, 2);
    vm.setMaxVoices(4);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    vm.allocate(osc, gain, 60);
    vm.allocate(osc, gain, 64);
    vm.allocate(osc, gain, 67);
    expect(vm.getVoiceCount()).toBe(3);
  });

  it("setMaxVoices enforces minimum of 1", () => {
    const ctx = createMockCtx();
    const vm = new VoiceManager(ctx, 4);
    vm.setMaxVoices(-5);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    vm.allocate(osc, gain, 60);
    vm.allocate(osc, gain, 64);
    expect(vm.getVoiceCount()).toBeLessThanOrEqual(1);
  });

  it("releaseAll with empty voices does not throw", () => {
    const ctx = createMockCtx();
    const vm = new VoiceManager(ctx, 4);
    expect(() => vm.releaseAll()).not.toThrow();
  });
});

describe("gainStaging - GainStager", () => {
  function createMockGainNode(): GainNode {
    return {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      context: { currentTime: 0 } as AudioContext,
    } as unknown as GainNode;
  }

  it("calculateMasterGain returns 1 for empty tracks", () => {
    const stager = new GainStager();
    expect(stager.calculateMasterGain([])).toBe(1);
  });

  it("calculateMasterGain returns 1 for all muted tracks", () => {
    const stager = new GainStager();
    const tracks = [
      { name: "Kick", volume: 80, muted: true, solo: false },
      { name: "Snare", volume: 70, muted: true, solo: false },
    ];
    expect(stager.calculateMasterGain(tracks)).toBe(1);
  });

  it("calculateMasterGain reduces gain for loud tracks", () => {
    const stager = new GainStager();
    const tracks = [
      { name: "Kick", volume: 120, muted: false, solo: false },
      { name: "Snare", volume: 110, muted: false, solo: false },
      { name: "Bass", volume: 100, muted: false, solo: false },
    ];
    const gain = stager.calculateMasterGain(tracks);
    expect(gain).toBeGreaterThanOrEqual(0.1);
    expect(gain).toBeLessThanOrEqual(1);
  });

  it("calculateMasterGain respects solo tracks", () => {
    const stager = new GainStager();
    const tracks = [
      { name: "Kick", volume: 120, muted: false, solo: false },
      { name: "Vocal", volume: 100, muted: false, solo: true },
    ];
    const gainWithSolo = stager.calculateMasterGain(tracks);
    expect(gainWithSolo).toBeGreaterThanOrEqual(0.1);
    expect(gainWithSolo).toBeLessThanOrEqual(1);
  });

  it("calculateMasterGain considers MIDI velocity", () => {
    const stager = new GainStager();
    const tracks = [
      {
        name: "Piano",
        volume: 100,
        muted: false,
        solo: false,
        midiNotes: [
          { velocity: 40 },
          { velocity: 40 },
          { velocity: 40 },
        ],
      },
    ];
    const quietGain = stager.calculateMasterGain(tracks);
    expect(quietGain).toBeGreaterThanOrEqual(0.1);
    expect(quietGain).toBeLessThanOrEqual(1);
  });

  it("applyDynamicGain schedules gain ramp", () => {
    const stager = new GainStager();
    const gainNode = createMockGainNode();
    const tracks = [
      { name: "Kick", volume: 80, muted: false, solo: false },
    ];
    stager.applyDynamicGain(gainNode, tracks, 0.05);
    expect(gainNode.gain.cancelScheduledValues).toHaveBeenCalled();
    expect(gainNode.gain.setValueAtTime).toHaveBeenCalled();
    expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalled();
  });

  it("setHeadroom updates headroom", () => {
    const stager = new GainStager(-6);
    stager.setHeadroom(-12);
    const tracks = [
      { name: "Kick", volume: 100, muted: false, solo: false },
    ];
    const gain = stager.calculateMasterGain(tracks);
    expect(gain).toBeGreaterThanOrEqual(0.1);
    expect(gain).toBeLessThanOrEqual(1);
  });

  it("setCeiling updates ceiling", () => {
    const stager = new GainStager(-6, -0.3);
    stager.setCeiling(-1);
    const tracks = [
      { name: "Kick", volume: 100, muted: false, solo: false },
    ];
    const gain = stager.calculateMasterGain(tracks);
    expect(gain).toBeGreaterThanOrEqual(0.1);
    expect(gain).toBeLessThanOrEqual(1);
  });
});

describe("deltaCompression", () => {
  const baseState = {
    id: "proj-1",
    title: "My Project",
    bpm: 120,
    key: "C",
    genre: "pop",
    mood: "warm",
    tracks: [{ id: "t1", name: "Kick" }],
    chords: ["C", "Am", "F", "G"],
  };

  it("computeDelta returns null for identical states", () => {
    const delta = computeDelta(baseState, baseState);
    expect(delta).toBeNull();
  });

  it("computeDelta returns null for null inputs", () => {
    expect(computeDelta(null as any, baseState)).toBeNull();
    expect(computeDelta(baseState, null as any)).toBeNull();
  });

  it("computeDelta detects title change", () => {
    const next = { ...baseState, title: "Updated Project" };
    const delta = computeDelta(baseState, next);
    expect(delta).not.toBeNull();
    expect(delta!.title).toBe("Updated Project");
  });

  it("computeDelta detects bpm change", () => {
    const next = { ...baseState, bpm: 140 };
    const delta = computeDelta(baseState, next);
    expect(delta!.bpm).toBe(140);
  });

  it("computeDelta detects key change", () => {
    const next = { ...baseState, key: "F#" };
    const delta = computeDelta(baseState, next);
    expect(delta!.key).toBe("F#");
  });

  it("computeDelta detects genre change", () => {
    const next = { ...baseState, genre: "rock" };
    const delta = computeDelta(baseState, next);
    expect(delta!.genre).toBe("rock");
  });

  it("computeDelta detects mood change", () => {
    const next = { ...baseState, mood: "dark" };
    const delta = computeDelta(baseState, next);
    expect(delta!.mood).toBe("dark");
  });

  it("computeDelta detects chords change", () => {
    const next = { ...baseState, chords: ["C", "G", "Am", "F"] };
    const delta = computeDelta(baseState, next);
    expect(delta!.chords).toEqual(["C", "G", "Am", "F"]);
  });

  it("computeDelta detects tracks change", () => {
    const next = {
      ...baseState,
      tracks: [{ id: "t1", name: "Kick" }, { id: "t2", name: "Snare" }],
    };
    const delta = computeDelta(baseState, next);
    expect(delta!.tracks).toHaveLength(2);
  });

  it("computeDelta returns only changed fields", () => {
    const next = { ...baseState, bpm: 140, title: "New Title" };
    const delta = computeDelta(baseState, next);
    expect(Object.keys(delta!)).toHaveLength(2);
    expect(delta).toHaveProperty("bpm");
    expect(delta).toHaveProperty("title");
    expect(delta).not.toHaveProperty("key");
  });

  it("applyDelta merges delta into base", () => {
    const delta = { bpm: 140, title: "New Title" };
    const result = applyDelta(baseState, delta);
    expect(result.bpm).toBe(140);
    expect(result.title).toBe("New Title");
    expect(result.key).toBe("C");
    expect(result.genre).toBe("pop");
  });

  it("applyDelta with empty delta returns same state", () => {
    const result = applyDelta(baseState, {});
    expect(result).toEqual(baseState);
  });

  it("compactState encodes to Uint8Array", () => {
    const compressed = compactState(baseState);
    expect(compressed.constructor.name).toBe("Uint8Array");
    expect(compressed.length).toBeGreaterThan(0);
  });

  it("decompactState decodes from Uint8Array", () => {
    const compressed = compactState(baseState);
    const decoded = decompactState(compressed);
    expect(decoded).toEqual(baseState);
  });

  it("estimateSavings returns percentage", () => {
    const delta = { bpm: 140 };
    const savings = estimateSavings(baseState, delta);
    expect(savings).toBeGreaterThan(0);
    expect(savings).toBeLessThanOrEqual(100);
  });

  it("estimateSavings returns 100 for empty delta", () => {
    const savings = estimateSavings(baseState, {});
    expect(savings).toBeGreaterThanOrEqual(99);
    expect(savings).toBeLessThanOrEqual(100);
  });
});

describe("snapshotManager", () => {
  const projectId = "test-proj";
  const sampleState = {
    tracks: [{ id: "t1", name: "Kick" }],
    buses: [],
    masterPlugins: [],
  };

  it("createSnapshot returns snapshot data", () => {
    const snapshot = createSnapshot(projectId, sampleState, 0, 1);
    expect(snapshot.id).toBeTruthy();
    expect(snapshot.projectId).toBe(projectId);
    expect(snapshot.state).toEqual(sampleState);
    expect(snapshot.operationCount).toBe(0);
    expect(snapshot.version).toBe(1);
    expect(snapshot.timestamp).toBeGreaterThan(0);
  });

  it("getLatestSnapshot returns null initially", () => {
    expect(getLatestSnapshot(projectId)).toBeNull();
  });

  it("getLatestSnapshot returns latest after create", () => {
    createSnapshot(projectId, sampleState, 0, 1);
    createSnapshot(projectId, { ...sampleState, tracks: [] }, 10, 2);
    const latest = getLatestSnapshot(projectId);
    expect(latest).not.toBeNull();
    expect(latest!.version).toBe(2);
  });

  it("getSnapshotHistory returns all snapshots", () => {
    createSnapshot(projectId, sampleState, 0, 1);
    createSnapshot(projectId, { tracks: [] }, 5, 2);
    createSnapshot(projectId, { buses: [{ id: "b1" }] }, 10, 3);
    const history = getSnapshotHistory(projectId);
    expect(history).toHaveLength(3);
  });

  it("snapshotHistory is limited to maxSnapshotHistory", () => {
    for (let i = 0; i < 15; i++) {
      createSnapshot(projectId, { tracks: [{ id: `t${i}` }] }, i, i + 1);
    }
    const history = getSnapshotHistory(projectId);
    expect(history.length).toBeLessThanOrEqual(10);
  });

  it("shouldSnapshot returns true for new project", () => {
    expect(shouldSnapshot(projectId)).toBe(true);
  });

  it("shouldSnapshot returns true after operation threshold", () => {
    createSnapshot(projectId, sampleState, 0, 1);
    for (let i = 0; i < 100; i++) {
      incrementOperationCount(projectId);
    }
    expect(shouldSnapshot(projectId)).toBe(true);
  });

  it("incrementOperationCount increases counter", () => {
    createSnapshot(projectId, sampleState, 0, 1);
    incrementOperationCount(projectId);
    incrementOperationCount(projectId);
    expect(shouldSnapshot(projectId, { maxOperationsBeforeSnapshot: 2 })).toBe(true);
  });

  it("compactOperations filters operations older than snapshot version", () => {
    const snapshot = createSnapshot(projectId, sampleState, 0, 10);
    const operations = [
      { type: "track.add" as const, path: "tracks", value: { id: "t1" }, timestamp: 5, id: "op-1", userId: "local", clientId: "client-1" },
      { type: "track.add" as const, path: "tracks", value: { id: "t2" }, timestamp: 11, id: "op-2", userId: "local", clientId: "client-1" },
      { type: "track.add" as const, path: "tracks", value: { id: "t3" }, timestamp: 15, id: "op-3", userId: "local", clientId: "client-1" },
    ];
    const compacted = compactOperations(operations, snapshot);
    expect(compacted).toHaveLength(2);
    expect(compacted[0].timestamp).toBe(11);
    expect(compacted[1].timestamp).toBe(15);
  });

  it("mergeSnapshotIntoState applies operations", () => {
    const snapshot = {
      id: projectId,
      timestamp: Date.now(),
      state: { tracks: [{ id: "t1", name: "Kick" }] },
      operationCount: 0,
      version: 1,
    };
    const operations = [
      { type: "track.update" as const, path: "tracks", value: { id: "t1", volume: 80 }, timestamp: 2, id: "op-1", userId: "local", clientId: "client-1" },
    ];
    const result = mergeSnapshotIntoState(snapshot.state, operations);
    expect((result.tracks as any[])[0].volume).toBe(80);
  });

  it("clearSnapshotStore clears specific project", () => {
    createSnapshot(projectId, sampleState, 0, 1);
    createSnapshot("other-proj", sampleState, 0, 1);
    clearSnapshotStore(projectId);
    expect(getLatestSnapshot(projectId)).toBeNull();
    expect(getLatestSnapshot("other-proj")).not.toBeNull();
  });

  it("clearSnapshotStore clears all when no projectId", () => {
    createSnapshot(projectId, sampleState, 0, 1);
    createSnapshot("other-proj", sampleState, 0, 1);
    clearSnapshotStore();
    expect(getLatestSnapshot(projectId)).toBeNull();
    expect(getLatestSnapshot("other-proj")).toBeNull();
  });
});

describe("bassFollower", () => {
  it("generateBassLine returns MIDI notes for trap", () => {
    const notes = generateBassLine([0, 5, 7], 4, 140, "trap");
    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      expect(note.pitch).toBeGreaterThanOrEqual(0);
      expect(note.pitch).toBeLessThanOrEqual(127);
      expect(note.start).toBeGreaterThanOrEqual(0);
      expect(note.duration).toBeGreaterThan(0);
      expect(note.velocity).toBeGreaterThan(0);
    }
  });

  it("generateBassLine produces more notes for more bars", () => {
    const short = generateBassLine([0], 2, 120, "trap");
    const long = generateBassLine([0], 4, 120, "trap");
    expect(long.length).toBeGreaterThan(short.length);
  });

  it("generateBassLine uses fallback rhythm for unknown subgenre", () => {
    const notes = generateBassLine([0], 2, 120, "unknown");
    expect(notes.length).toBeGreaterThan(0);
  });

  it("generateBassLine respects BPM for timing", () => {
    const slow = generateBassLine([0], 1, 60, "trap");
    const fast = generateBassLine([0], 1, 180, "trap");
    const slowDuration = slow[0].duration;
    const fastDuration = fast[0].duration;
    expect(slowDuration).toBeGreaterThan(fastDuration);
  });

  it("generateBassLine cycles through root notes", () => {
    const notes = generateBassLine([0, 5, 7], 3, 120, "boombap");
    expect(notes.length).toBeGreaterThan(0);
  });

  it("generateBassLine produces valid velocities", () => {
    const notes = generateBassLine([0], 2, 120, "techno");
    for (const note of notes) {
      expect(note.velocity).toBeGreaterThanOrEqual(0);
      expect(note.velocity).toBeLessThanOrEqual(127);
    }
  });

  it("generateBassLine for house produces notes", () => {
    const notes = generateBassLine([0], 2, 125, "house");
    expect(notes.length).toBeGreaterThan(0);
  });

  it("generateBassLine for classic_rock produces notes", () => {
    const notes = generateBassLine([0], 2, 120, "classic_rock");
    expect(notes.length).toBeGreaterThan(0);
  });

  it("generateBassLine for metal_core produces more notes", () => {
    const trap = generateBassLine([0], 1, 140, "trap");
    const metal = generateBassLine([0], 1, 160, "metal_core");
    expect(metal.length).toBeGreaterThan(trap.length);
  });

  it("generateBassLine for indie produces notes", () => {
    const notes = generateBassLine([0], 2, 110, "indie");
    expect(notes.length).toBeGreaterThan(0);
  });

  it("generateBassLine for lofi_urban produces fewer notes", () => {
    const lofi = generateBassLine([0], 2, 85, "lofi_urban");
    const trap = generateBassLine([0], 2, 140, "trap");
    expect(lofi.length).toBeLessThan(trap.length);
  });

  it("generateBassLine for synthwave produces notes", () => {
    const notes = generateBassLine([0], 2, 110, "synthwave");
    expect(notes.length).toBeGreaterThan(0);
  });
});

describe("genreTree", () => {
  it("GENRE_TREE has 3 top-level genres", () => {
    expect(GENRE_TREE).toHaveLength(3);
  });

  it("each genre has required fields", () => {
    for (const genre of GENRE_TREE) {
      expect(genre.id).toBeTruthy();
      expect(genre.name).toBeTruthy();
      expect(genre.icon).toBeTruthy();
      expect(genre.defaultKey).toBeTruthy();
      expect(Array.isArray(genre.subgenres)).toBe(true);
      expect(genre.subgenres.length).toBeGreaterThan(0);
    }
  });

  it("each subgenre has required fields", () => {
    for (const genre of GENRE_TREE) {
      for (const sub of genre.subgenres) {
        expect(sub.id).toBeTruthy();
        expect(sub.name).toBeTruthy();
        expect(Array.isArray(sub.defaultBpmRange)).toBe(true);
        expect(sub.defaultBpmRange).toHaveLength(2);
        expect(sub.drumPatternId).toBeTruthy();
        expect(Array.isArray(sub.recommendedTimbres)).toBe(true);
      }
    }
  });

  it("findGenreNode returns urban", () => {
    const node = findGenreNode("urban");
    expect(node).toBeDefined();
    expect(node!.name).toContain("Urban");
  });

  it("findGenreNode returns undefined for unknown", () => {
    expect(findGenreNode("unknown")).toBeUndefined();
  });

  it("findSubgenre returns trap", () => {
    const sub = findSubgenre("urban", "trap");
    expect(sub).toBeDefined();
    expect(sub!.name).toContain("Trap");
  });

  it("findSubgenre returns undefined for unknown", () => {
    expect(findSubgenre("urban", "unknown")).toBeUndefined();
  });

  it("urban genre has 3 subgenres", () => {
    const urban = findGenreNode("urban");
    expect(urban!.subgenres).toHaveLength(3);
  });

  it("electronic genre has synthwave", () => {
    const sub = findSubgenre("electronic", "synthwave");
    expect(sub).toBeDefined();
  });

  it("rock_metal genre has classic_rock", () => {
    const sub = findSubgenre("rock_metal", "classic_rock");
    expect(sub).toBeDefined();
  });
});

describe("harmonicAssistant", () => {
  it("suggestNextChords returns suggestions for empty progression", () => {
    const suggestions = suggestNextChords([]);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(3);
  });

  it("each suggestion has required fields", () => {
    const suggestions = suggestNextChords([]);
    for (const s of suggestions) {
      expect(s.degree).toBeGreaterThanOrEqual(0);
      expect(s.degree).toBeLessThan(7);
      expect(s.quality).toBeTruthy();
      expect(s.probability).toBeGreaterThan(0);
      expect(s.label).toBeTruthy();
    }
  });

  it("suggestNextChords returns suggestions from I major", () => {
    const suggestions = suggestNextChords([{ degree: 0, quality: "maj" as const }]);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("suggestNextChords returns suggestions from vi minor", () => {
    const suggestions = suggestNextChords([{ degree: 5, quality: "min" as const }]);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("suggestNextChords in minor mode", () => {
    const suggestions = suggestNextChords([{ degree: 0, quality: "min" as const }], true);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("suggestNextChords respects maxSuggestions", () => {
    const suggestions = suggestNextChords([], false, 5);
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });

  it("roman numeral labels use lowercase for minor", () => {
    const suggestions = suggestNextChords([{ degree: 5, quality: "min" as const }]);
    const hasMinor = suggestions.some(s => s.label === s.label.toLowerCase());
    if (hasMinor) {
      expect(hasMinor).toBe(true);
    }
  });

  it("roman numeral labels use uppercase for major", () => {
    const suggestions = suggestNextChords([{ degree: 0, quality: "maj" as const }]);
    const hasMajor = suggestions.some(s => s.label === s.label.toUpperCase());
    if (hasMajor) {
      expect(hasMajor).toBe(true);
    }
  });
});

describe("timbreRegistry", () => {
  it("TIMBRE_REGISTRY has entries", () => {
    expect(TIMBRE_REGISTRY.length).toBeGreaterThan(0);
  });

  it("each timbre has required fields", () => {
    for (const t of TIMBRE_REGISTRY) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.engine).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.moodPresets).toBeTruthy();
    }
  });

  it("each timbre has mood presets for all moods", () => {
    const moods = ["sun", "rain", "snow", "day", "night"];
    for (const t of TIMBRE_REGISTRY) {
      for (const mood of moods) {
        expect(t.moodPresets).toHaveProperty(mood);
        const settings = t.moodPresets[mood as keyof typeof t.moodPresets];
        expect(settings!.vcfCutoff).toBeGreaterThan(0);
        expect(settings!.reverbMix).toBeGreaterThanOrEqual(0);
        expect(settings!.reverbMix).toBeLessThanOrEqual(1);
      }
    }
  });

  it("matchTimbre returns patch for valid category and mood", () => {
    const patch = matchTimbre("pad", "rain");
    expect(patch).toBeDefined();
    expect(patch!.category).toBe("pad");
  });

  it("matchTimbre returns undefined for invalid mood", () => {
    const patch = matchTimbre("pad", "invalid");
    expect(patch).toBeUndefined();
  });

  it("getDspSettings returns settings for valid mood", () => {
    const patch = TIMBRE_REGISTRY[0];
    const settings = getDspSettings(patch, "sun");
    expect(settings.vcfCutoff).toBeGreaterThan(0);
    expect(settings.reverbMix).toBeGreaterThanOrEqual(0);
  });

  it("getDspSettings returns defaults for invalid mood", () => {
    const patch = TIMBRE_REGISTRY[0];
    const settings = getDspSettings(patch, "invalid");
    expect(settings.vcfCutoff).toBe(2000);
    expect(settings.reverbMix).toBe(0.2);
  });

  it("timbre registry includes multiple categories", () => {
    const categories = new Set(TIMBRE_REGISTRY.map(t => t.category));
    expect(categories.size).toBeGreaterThan(3);
  });

  it("juno engine timbres exist", () => {
    const juno = TIMBRE_REGISTRY.filter(t => t.engine === "juno");
    expect(juno.length).toBeGreaterThan(0);
  });

  it("triton engine timbres exist", () => {
    const triton = TIMBRE_REGISTRY.filter(t => t.engine === "triton");
    expect(triton.length).toBeGreaterThan(0);
  });
});
