import { describe, it, expect, beforeEach } from "vitest";
import * as branching from "../src/lib/projectBranching";

const emptyState = () => ({
  tracks: [] as any[],
  buses: [] as any[],
  masterPlugins: [],
  crdtOperations: [] as any[],
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

const bus = (id: string, name: string, gain = 0): any => ({
  id,
  name,
  gain,
  sends: {},
  plugins: [],
});

describe("projectBranching H3 selective merge respects rejections for modifications", () => {
  beforeEach(() => branching.disposeBranching());

  it("rejects an unlisted modified track on selective merge", () => {
    branching.initBranching({ ...emptyState(), tracks: [track("t1", "Vocal", 75)] });
    const branch = branching.createBranch("feature")!;
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.update",
      path: "tracks",
      value: { id: "t1", volume: 60 },
    });
    const diff = branching.diffBranches(branch.id)!;
    expect(diff.modifiedTracks).toHaveLength(1);

    const merged = branching.mergeBranch(branch.id, ["track:t2"])!;
    const t1 = merged.tracks.find((t: any) => t.id === "t1") as any;
    expect(t1.volume).toBe(75);
  });

  it("applies a modified track when no selection is given (accept all)", () => {
    branching.initBranching({ ...emptyState(), tracks: [track("t1", "Vocal", 75)] });
    const branch = branching.createBranch("feature")!;
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "track.update",
      path: "tracks",
      value: { id: "t1", volume: 60 },
    });
    const merged = branching.mergeBranch(branch.id)!;
    const t1 = merged.tracks.find((t: any) => t.id === "t1") as any;
    expect(t1.volume).toBe(60);
  });

  it("rejects an unlisted modified bus on selective merge", () => {
    branching.initBranching({
      ...emptyState(),
      tracks: [track("t1", "Vocal")],
      buses: [bus("b1", "FX", 0)],
    });
    const branch = branching.createBranch("feature")!;
    branching.applyOperationToBranch(branch.id, {
      userId: "local",
      type: "bus.update",
      path: "buses",
      value: { id: "b1", gain: -6 },
    });
    const merged = branching.mergeBranch(branch.id, ["bus:b2"])!;
    const b1 = merged.buses.find((b: any) => b.id === "b1") as any;
    expect(b1.gain).toBe(0);
  });
});
