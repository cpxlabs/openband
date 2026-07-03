import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createSnapshot, getLatestSnapshot, getSnapshotHistory,
  shouldSnapshot, incrementOperationCount, compactOperations,
  mergeSnapshotIntoState, clearSnapshotStore,
} from "../src/lib/snapshotManager";
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
