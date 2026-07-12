import { describe, it, expect, beforeEach } from "vitest";
import * as branching from "../src/lib/projectBranching";
import {
  applyOperation,
  createOperation,
  mergeOperations,
  type CrdtOperation,
} from "../src/lib/crdt";

const emptyState = () => ({
  tracks: [] as any[],
  buses: [] as any[],
  masterPlugins: [],
  crdtOperations: [] as CrdtOperation[],
  metadata: {},
});

const track = (id: string, name: string, volume = 75): any => ({
  id,
  name,
  color: "#fff",
  type: "audio",
  muted: false,
  solo: false,
  volume,
  pan: 0,
  sends: {},
  regions: [],
  sidechainSource: null,
  plugins: [],
  automation: {},
  outputId: null,
});

describe("projectBranching: CRDT operation unification", () => {
  beforeEach(() => {
    branching.disposeBranching();
  });

  it("applyOperationToBranch returns a valid CrdtOperation", () => {
    branching.initBranching(emptyState());
    const op = branching.applyOperationToBranch("main", {
      userId: "local",
      type: "track.add",
      path: "tracks",
      value: track("t1", "Vocal"),
    });

    expect(op).not.toBeNull();
    const crdtOp = op as CrdtOperation;
    expect(crdtOp.id).toBeTruthy();
    expect(crdtOp.clientId).toBeTruthy();
    expect(crdtOp.userId).toBe("local");
    expect(crdtOp.type).toBe("track.add");
    expect(crdtOp.path).toBe("tracks");
    expect(typeof crdtOp.timestamp).toBe("number");
  });

  it("applied branch op round-trips through crdt.mergeOperations", () => {
    branching.initBranching(emptyState());
    const op = branching.applyOperationToBranch("main", {
      userId: "local",
      type: "track.add",
      path: "tracks",
      value: track("t1", "Vocal"),
    })!;

    const merged = mergeOperations([], [op]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe(op.id);
  });

  it("branch apply yields identical state to collaboration engine applyOperation", () => {
    branching.initBranching(emptyState());
    const op = branching.applyOperationToBranch("main", {
      userId: "local",
      type: "track.add",
      path: "tracks",
      value: track("t1", "Vocal"),
    })!;

    const collabState = applyOperation(emptyState() as any, op);
    const branchTracks = branching.getMainState()!.tracks as any[];
    const collabTracks = collabState.tracks as any[];

    expect(branchTracks).toHaveLength(1);
    expect(branchTracks[0].id).toBe("t1");
    expect(JSON.stringify(branchTracks)).toBe(JSON.stringify(collabTracks));
  });

  it("track update from a branch matches collaboration engine update", () => {
    branching.initBranching({ ...emptyState(), tracks: [track("t1", "Vocal", 75)] });
    const op = branching.applyOperationToBranch("main", {
      userId: "local",
      type: "track.update",
      path: "tracks",
      value: { id: "t1", volume: 60 },
    })!;

    const collabState = applyOperation(
      { ...emptyState(), tracks: [track("t1", "Vocal", 75)] } as any,
      op,
    );

    expect(branching.getMainState()!.tracks[0].volume).toBe(60);
    expect((collabState.tracks as any[])[0].volume).toBe(60);
  });

  it("mergeBranch dedupes ops (idempotent merge)", () => {
    branching.initBranching(emptyState());
    const branch = branching.createBranch("feature")!;
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.add",
      path: "tracks",
      value: track("t2", "Drums"),
    });

    branching.mergeBranch(branch.id);
    const mainOps = branching.getMainState()!.crdtOperations;
    expect(mainOps).toHaveLength(1);

    const reMerged = mergeOperations(mainOps, branch.state.crdtOperations);
    expect(reMerged).toHaveLength(1);
  });

  it("createBranch deep-clones parent state", () => {
    branching.initBranching({ ...emptyState(), tracks: [track("t1", "Vocal")] });
    const branch = branching.createBranch("feature")!;
    branch.state.tracks[0].volume = 0;
    expect(branching.getMainState()!.tracks[0].volume).toBe(75);
  });

  it("diffBranches reports added and modified tracks", () => {
    branching.initBranching({ ...emptyState(), tracks: [track("t1", "Vocal", 75)] });
    const branch = branching.createBranch("feature")!;
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.add",
      path: "tracks",
      value: track("t2", "Drums"),
    });
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.update",
      path: "tracks",
      value: { id: "t1", volume: 60 },
    });
    const diff = branching.diffBranches(branch.id)!;
    expect(diff.addedTracks).toContain("t2");
    expect(diff.modifiedTracks).toHaveLength(1);
    expect(diff.modifiedTracks[0].changes[0].field).toBe("volume");
  });

  it("mergeBranch with selective acceptChanges rejects unlisted added tracks", () => {
    branching.initBranching(emptyState());
    const branch = branching.createBranch("feature")!;
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.add",
      path: "tracks",
      value: track("t2", "Drums"),
    });
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.add",
      path: "tracks",
      value: track("t3", "Bass"),
    });
    const merged = branching.mergeBranch(branch.id, ["track:t2"])!;
    expect(merged.tracks.find((t: any) => t.id === "t2")).toBeDefined();
    expect(merged.tracks.find((t: any) => t.id === "t3")).toBeUndefined();
  });

  it("deleteBranch refuses main and merged branches", () => {
    branching.initBranching(emptyState());
    const branch = branching.createBranch("feature")!;
    expect(branching.deleteBranch("main")).toBe(false);
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.add",
      path: "tracks",
      value: track("t2", "Drums"),
    });
    branching.mergeBranch(branch.id, ["track:t2"]);
    expect(branching.deleteBranch(branch.id)).toBe(false);
  });

  it("reuses shared createOperation so ops carry a collab clientId", () => {
    branching.initBranching(emptyState());
    const branchOp = branching.applyOperationToBranch("main", {
      userId: "local",
      type: "track.add",
      path: "tracks",
      value: track("t1", "Vocal"),
    })!;
    const collabOp = createOperation("local", "track.add", "tracks", track("t1", "Vocal"));
    expect(typeof branchOp.clientId).toBe("string");
    expect(typeof collabOp.clientId).toBe("string");
  });
});
