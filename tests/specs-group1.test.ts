import { describe, it, expect } from "vitest";
import {
  createOperation,
  mergeOperations,
  applyOperation,
  encodeState,
  decodeState,
} from "../src/lib/crdt";
import * as branching from "../src/lib/projectBranching";
import {
  createSnapshot,
  compactOperations,
  incrementOperationCount,
  shouldSnapshot,
  clearSnapshotStore,
} from "../src/lib/snapshotManager";
import {
  createOpenBandArchive,
  parseOpenBandArchive,
  projectToOpenBand,
} from "../src/lib/openbandFormat";
import {
  createProject,
  addTrackToState,
  commitState,
  getAssetRefs,
} from "../src/lib/stateAssetSeparation";
import {
  saveProject,
  loadProject,
  exportProject,
  importProject,
  deleteProject,
  listProjectIndex,
} from "../src/lib/projectStore";

describe("collaboration-crdt: operation merge without loss", () => {
  it("mergeOperations retains two distinct ops", () => {
    const opA = createOperation("u1", "track.add", "tracks", { id: "a" });
    const opB = createOperation("u2", "track.add", "buses", { id: "b" });
    const merged = mergeOperations([opA], [opB]);
    expect(merged.length).toBe(2);
    expect(merged.find((o) => o.id === opA.id)).toBeDefined();
    expect(merged.find((o) => o.id === opB.id)).toBeDefined();
  });

  it("concurrent same-path ops resolve last-writer-wins", () => {
    const first = createOperation("u1", "mix.update", "master.volume", 0.5);
    const second = createOperation("u2", "mix.update", "master.volume", 0.8);
    const merged = mergeOperations([first], [second]);
    expect(merged.length).toBe(1);
    expect(merged[0].value).toBe(0.8);
  });

  it("applyOperation adds track then updates it", () => {
    const add = createOperation("u1", "track.add", "tracks", { id: "a", name: "Vox" });
    const update = createOperation("u1", "track.update", "tracks", {
      id: "a",
      name: "Vocals",
    });
    let state: Record<string, unknown> = { tracks: [] };
    state = applyOperation(state, add);
    state = applyOperation(state, update);
    const tracks = state.tracks as Array<{ id: string; name: string }>;
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toBe("Vocals");
  });

  it("encodeState -> decodeState round-trips operations", () => {
    const opA = createOperation("u1", "note.add", "tracks/t1.notes", { id: "n1" });
    const opB = createOperation("u2", "track.remove", "tracks", { id: "x" });
    const encoded = encodeState([opA, opB]);
    const decoded = decodeState(encoded);
    expect(decoded.operations).toHaveLength(2);
    expect(decoded.operations[0].id).toBe(opA.id);
    expect(decoded.clientId).toBeTruthy();
  });

  it("mergeOperations sorts by timestamp", () => {
    const opA = createOperation("u1", "track.add", "tracks", { id: "a" });
    const opB = createOperation("u2", "track.add", "buses", { id: "b" });
    const merged = mergeOperations([opA], [opB]);
    expect(merged[0].timestamp).toBeLessThanOrEqual(merged[1].timestamp);
  });
});

describe("project-branching: diff and selective merge", () => {
  const baseState = () => ({
    tracks: [{ id: "t1", name: "Vocal", type: "audio", volume: 75 }],
    buses: [],
    masterPlugins: [],
    crdtOperations: [],
    metadata: {},
  });

  it("createBranch inherits parent state and switchBranch activates it", () => {
    branching.initBranching(baseState() as any);
    const branch = branching.createBranch("feature");
    expect(branch).not.toBeNull();
    expect(branch!.state.tracks).toHaveLength(1);
    branching.switchBranch(branch!.id);
    expect(branching.getActiveBranch()!.id).toBe(branch!.id);
    branching.disposeBranching();
  });

  it("diffBranches reports added and modified tracks", () => {
    branching.initBranching(baseState() as any);
    const branch = branching.createBranch("feature")!;
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.add",
      path: "tracks",
      value: { id: "t2", name: "Drums", type: "audio", volume: 80 },
    });
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.update",
      path: "tracks",
      value: { id: "t1", volume: 60 },
    });
    const diff = branching.diffBranches(branch.id)!;
    expect(diff).not.toBeNull();
    expect(diff.addedTracks).toContain("t2");
    expect(diff.modifiedTracks).toHaveLength(1);
    expect(diff.modifiedTracks[0].changes[0].field).toBe("volume");
    branching.disposeBranching();
  });

  it("mergeBranch with no acceptChanges merges all changes", () => {
    branching.initBranching(baseState() as any);
    const branch = branching.createBranch("feature")!;
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.add",
      path: "tracks",
      value: { id: "t2", name: "Drums", type: "audio", volume: 80 },
    });
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.update",
      path: "tracks",
      value: { id: "t1", volume: 60 },
    });
    const merged = branching.mergeBranch(branch.id)!;
    expect(merged.tracks.find((t: any) => t.id === "t2")).toBeDefined();
    expect(merged.tracks.find((t: any) => t.id === "t1")!.volume).toBe(60);
    branching.disposeBranching();
  });

  it("mergeBranch with selective acceptChanges rejects unlisted added tracks", () => {
    branching.initBranching(baseState() as any);
    const branch = branching.createBranch("feature")!;
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.add",
      path: "tracks",
      value: { id: "t2", name: "Drums", type: "audio", volume: 80 },
    });
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.add",
      path: "tracks",
      value: { id: "t3", name: "Bass", type: "audio", volume: 70 },
    });
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.update",
      path: "tracks",
      value: { id: "t1", volume: 60 },
    });
    const merged = branching.mergeBranch(branch.id, ["track:t2"])!;
    expect(merged.tracks.find((t: any) => t.id === "t2")).toBeDefined();
    expect(merged.tracks.find((t: any) => t.id === "t3")).toBeUndefined();
    expect(merged.tracks.find((t: any) => t.id === "t1")!.volume).toBe(60);
    branching.disposeBranching();
  });

  it("deleteBranch refuses main and merged branches", () => {
    branching.initBranching(baseState() as any);
    const branch = branching.createBranch("feature")!;
    expect(branching.deleteBranch("main")).toBe(false);
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.add",
      path: "tracks",
      value: { id: "t2", name: "Drums", type: "audio", volume: 80 },
    });
    branching.mergeBranch(branch.id, ["track:t2"]);
    expect(branching.deleteBranch(branch.id)).toBe(false);
    branching.disposeBranching();
  });
});

describe("project-branching: snapshot compaction", () => {
  it("compactOperations drops ops older than snapshot version", () => {
    clearSnapshotStore("proj-x");
    createSnapshot(
      "proj-x",
      { tracks: [] },
      3,
      5,
    );
    const ops = [
      { id: "o1", timestamp: 2 } as any,
      { id: "o2", timestamp: 6 } as any,
      { id: "o3", timestamp: 9 } as any,
    ];
    const compacted = compactOperations(ops, {
      id: "s",
      projectId: "proj-x",
      timestamp: 0,
      state: {},
      operationCount: 0,
      version: 5,
    });
    expect(compacted.map((o) => o.id)).toEqual(["o2", "o3"]);
    clearSnapshotStore("proj-x");
  });

  it("shouldSnapshot returns true after op threshold", () => {
    clearSnapshotStore("proj-y");
    for (let i = 0; i < 100; i++) incrementOperationCount("proj-y");
    expect(shouldSnapshot("proj-y")).toBe(true);
    clearSnapshotStore("proj-y");
  });
});

describe("project-storage: .openband archive CRC32 integrity", () => {
  const project = () =>
    projectToOpenBand(
      [{ id: "t1", name: "Vocal", type: "audio", volume: 75 }] as any,
      [] as any,
      [],
      [],
      [],
      [],
      {},
      { t1: [0.1, 0.2, 0.3] },
      { name: "Test", bpm: 120 },
    );

  it("archive round-trips via create and parse", () => {
    const archive = createOpenBandArchive(project());
    expect(archive).toBeInstanceOf(Uint8Array);
    const parsed = parseOpenBandArchive(archive);
    expect(parsed).not.toBeNull();
    expect(parsed!.metadata.name).toBe("Test");
    expect(parsed!.waveformPeaks.t1).toEqual([0.1, 0.2, 0.3]);
  });

  it("corrupted magic header fails to parse", () => {
    const archive = createOpenBandArchive(project());
    const corrupted = new Uint8Array(archive);
    corrupted[0] = 0x00;
    corrupted[1] = 0x00;
    expect(parseOpenBandArchive(corrupted)).toBeNull();
  });
});

describe("project-storage: OpenBandManifest v2 SHA-256 hashing", () => {
  it("commitState produces a 64-char SHA-256 state hash", async () => {
    await createProject(120, 44100, "Song");
    addTrackToState({
      id: "t1",
      name: "Vocal",
      type: "audio",
      muted: false,
      solo: false,
      volume: 75,
      pan: 0,
      outputBus: "bus-master",
      pluginChain: [],
    });
    expect(getAssetRefs()).toEqual([]);
    const commit = await commitState("initial commit")!;
    expect(commit).not.toBeNull();
    expect(commit!.stateHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("project-storage: projectStore persist + sanitize", () => {
  const validData = {
    title: "My Song",
    genre: "pop",
    key: "C",
    bpm: 128,
    tracks: [{ id: "t1", name: "Vox", type: "audio", volume: 70 }],
    groups: [],
    buses: [],
    trackAssignments: {},
    masterPlugins: [],
    masteringChain: [],
    sendBuses: [],
    trackAmpChains: {},
    mixSnapshots: [],
    metronome: { bpm: 128 },
    recordSettings: { armed: false },
  };

  it("saveProject -> loadProject round-trips", () => {
    const id = "spec-store-1";
    deleteProject(id);
    saveProject(id, validData as any);
    const loaded = loadProject(id);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(id);
    expect(loaded!.title).toBe("My Song");
    expect(loaded!.bpm).toBe(128);
    expect(listProjectIndex()[id]).toBeDefined();
    deleteProject(id);
  });

  it("exportProject -> importProject round-trips into a new id", () => {
    const id = "spec-store-2";
    deleteProject(id);
    saveProject(id, validData as any);
    const json = exportProject(id);
    expect(json).not.toBeNull();
    const newId = importProject(json!);
    expect(newId).not.toBeNull();
    const loaded = loadProject(newId!);
    expect(loaded!.title).toBe("My Song");
    expect(loaded!.bpm).toBe(128);
    deleteProject(id);
    deleteProject(newId!);
  });

  it("importProject sanitizes missing arrays and rejects invalid payloads", () => {
    const id = "spec-store-3";
    localStorage.setItem(
      `openband_project_${id}`,
      JSON.stringify({ title: "Partial", bpm: 90 }),
    );
    const loaded = loadProject(id);
    expect(loaded!.tracks).toEqual([]);
    expect(loaded!.buses).toEqual([]);
    expect(loaded!.metronome).toBeDefined();

    expect(importProject(JSON.stringify({ title: "NoBpm" }))).toBeNull();
    expect(importProject(JSON.stringify({ bpm: 120 }))).toBeNull();
    localStorage.removeItem(`openband_project_${id}`);
  });
});
