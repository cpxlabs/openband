import type { TrackDef, BusDef } from "./types";

export interface Branch {
  id: string;
  name: string;
  parentBranchId: string | null;
  createdAt: string;
  createdBy: string;
  state: BranchState;
  merged: boolean;
  mergeTimestamp?: string;
}

export interface BranchState {
  tracks: TrackDef[];
  buses: BusDef[];
  masterPlugins: unknown[];
  crdtOperations: CrdtOp[];
  metadata: Record<string, unknown>;
}

export interface CrdtOp {
  id: string;
  lamport: number;
  author: string;
  type: "add" | "remove" | "update";
  path: string;
  value?: unknown;
  timestamp: number;
}

export interface BranchDiff {
  branchId: string;
  mainId: string;
  addedTracks: string[];
  removedTracks: string[];
  modifiedTracks: TrackDiff[];
  addedBuses: string[];
  removedBuses: string[];
  modifiedBuses: BusDiff[];
  opCount: number;
}

export interface TrackDiff {
  trackId: string;
  trackName: string;
  changes: FieldDiff[];
}

export interface BusDiff {
  busId: string;
  busName: string;
  changes: FieldDiff[];
}

export interface FieldDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface ProjectState {
  branches: Map<string, Branch>;
  activeBranchId: string;
  mainBranchId: string;
}

let projectState: ProjectState = {
  branches: new Map(),
  activeBranchId: "main",
  mainBranchId: "main",
};

let lamportCounter = 0;
let opIdCounter = 0;

function generateOpId(): string {
  opIdCounter++;
  return `op-${opIdCounter}-${Date.now()}`;
}

function nextLamport(): number {
  lamportCounter++;
  return lamportCounter;
}

export function initBranching(mainState: BranchState): void {
  projectState.branches.clear();
  projectState.activeBranchId = "main";
  projectState.mainBranchId = "main";

  const mainBranch: Branch = {
    id: "main",
    name: "main",
    parentBranchId: null,
    createdAt: new Date().toISOString(),
    createdBy: "system",
    state: JSON.parse(JSON.stringify(mainState)),
    merged: true,
  };
  projectState.branches.set("main", mainBranch);
}

export function createBranch(
  name: string,
  userId: string = "local",
): Branch | null {
  const parent = projectState.branches.get(projectState.activeBranchId);
  if (!parent) return null;

  const branchId = `branch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const branch: Branch = {
    id: branchId,
    name,
    parentBranchId: parent.id,
    createdAt: new Date().toISOString(),
    createdBy: userId,
    state: JSON.parse(JSON.stringify(parent.state)),
    merged: false,
  };

  projectState.branches.set(branchId, branch);
  return branch;
}

export function switchBranch(branchId: string): Branch | null {
  const branch = projectState.branches.get(branchId);
  if (!branch) return null;
  projectState.activeBranchId = branchId;
  return branch;
}

export function getActiveBranch(): Branch | null {
  return projectState.branches.get(projectState.activeBranchId) ?? null;
}

export function getAllBranches(): Branch[] {
  return Array.from(projectState.branches.values());
}

export function getBranchTree(): Map<string, Branch[]> {
  const tree = new Map<string, Branch[]>();
  for (const branch of projectState.branches.values()) {
    const parentId = branch.parentBranchId ?? "root";
    if (!tree.has(parentId)) tree.set(parentId, []);
    tree.get(parentId)!.push(branch);
  }
  return tree;
}

export function applyOperationToBranch(
  branchId: string,
  op: Omit<CrdtOp, "id" | "lamport" | "timestamp">,
): CrdtOp | null {
  const branch = projectState.branches.get(branchId);
  if (!branch) return null;

  const fullOp: CrdtOp = {
    ...op,
    id: generateOpId(),
    lamport: nextLamport(),
    timestamp: Date.now(),
  };

  branch.state.crdtOperations.push(fullOp);
  applyOpToState(branch.state, fullOp);
  return fullOp;
}

function applyOpToState(state: BranchState, op: CrdtOp): void {
  const pathParts = op.path.split("/").filter(Boolean);

  if (pathParts[0] === "tracks") {
    const trackId = pathParts[1];
    if (op.type === "add" && op.value) {
      state.tracks = [...state.tracks, op.value as TrackDef];
    } else if (op.type === "remove") {
      state.tracks = state.tracks.filter((t) => t.id !== trackId);
    } else if (op.type === "update" && pathParts[2] && op.value !== undefined) {
      state.tracks = state.tracks.map((t) =>
        t.id === trackId ? { ...t, [pathParts[2]]: op.value } : t,
      );
    }
  } else if (pathParts[0] === "buses") {
    const busId = pathParts[1];
    if (op.type === "add" && op.value) {
      state.buses = [...state.buses, op.value as BusDef];
    } else if (op.type === "remove") {
      state.buses = state.buses.filter((b) => b.id !== busId);
    } else if (op.type === "update" && pathParts[2] && op.value !== undefined) {
      state.buses = state.buses.map((b) =>
        b.id === busId ? { ...b, [pathParts[2]]: op.value } : b,
      );
    }
  }
}

export function diffBranches(
  branchId: string,
  mainBranchId: string = "main",
): BranchDiff | null {
  const branch = projectState.branches.get(branchId);
  const main = projectState.branches.get(mainBranchId);
  if (!branch || !main) return null;

  const bs = branch.state;
  const ms = main.state;

  const branchTrackIds = new Set(bs.tracks.map((t) => t.id));
  const mainTrackIds = new Set(ms.tracks.map((t) => t.id));

  const addedTracks = bs.tracks
    .filter((t) => !mainTrackIds.has(t.id))
    .map((t) => t.id);

  const removedTracks = ms.tracks
    .filter((t) => !branchTrackIds.has(t.id))
    .map((t) => t.id);

  const modifiedTracks: TrackDiff[] = [];
  for (const bt of bs.tracks) {
    const mt = ms.tracks.find((t) => t.id === bt.id);
    if (!mt) continue;
    const changes = diffObjects(bt as unknown as Record<string, unknown>, mt as unknown as Record<string, unknown>, ["id", "midiNotes", "regions"]);
    if (changes.length > 0) {
      modifiedTracks.push({ trackId: bt.id, trackName: bt.name, changes });
    }
  }

  const branchBusIds = new Set(bs.buses.map((b) => b.id));
  const mainBusIds = new Set(ms.buses.map((b) => b.id));

  const addedBuses = bs.buses
    .filter((b) => !mainBusIds.has(b.id))
    .map((b) => b.id);

  const removedBuses = ms.buses
    .filter((b) => !branchBusIds.has(b.id))
    .map((b) => b.id);

  const modifiedBuses: BusDiff[] = [];
  for (const bb of bs.buses) {
    const mb = ms.buses.find((b) => b.id === bb.id);
    if (!mb) continue;
    const changes = diffObjects(bb as unknown as Record<string, unknown>, mb as unknown as Record<string, unknown>, ["id"]);
    if (changes.length > 0) {
      modifiedBuses.push({ busId: bb.id, busName: bb.name, changes });
    }
  }

  return {
    branchId,
    mainId: mainBranchId,
    addedTracks,
    removedTracks,
    modifiedTracks,
    addedBuses,
    removedBuses,
    modifiedBuses,
    opCount: bs.crdtOperations.length,
  };
}

function diffObjects(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  ignoreKeys: string[],
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of allKeys) {
    if (ignoreKeys.includes(key)) continue;
    const aVal = a[key];
    const bVal = b[key];
    if (JSON.stringify(aVal) !== JSON.stringify(bVal)) {
      diffs.push({ field: key, oldValue: bVal, newValue: aVal });
    }
  }

  return diffs;
}

export function mergeBranch(
  branchId: string,
  acceptChanges?: string[],
): BranchState | null {
  const branch = projectState.branches.get(branchId);
  const main = projectState.branches.get("main");
  if (!branch || !main || branch.parentBranchId !== "main") return null;

  const diff = diffBranches(branchId, "main");
  if (!diff) return null;

  if (acceptChanges && acceptChanges.length > 0) {
    const acceptedTracks = new Set(
      acceptChanges.filter((c) => c.startsWith("track:")).map((c) => c.slice(6)),
    );
    const acceptedBuses = new Set(
      acceptChanges.filter((c) => c.startsWith("bus:")).map((c) => c.slice(4)),
    );

    for (const addedTrackId of diff.addedTracks) {
      if (!acceptedTracks.has(addedTrackId)) {
        branch.state.tracks = branch.state.tracks.filter((t) => t.id !== addedTrackId);
      }
    }

    for (const addedBusId of diff.addedBuses) {
      if (!acceptedBuses.has(addedBusId)) {
        branch.state.buses = branch.state.buses.filter((b) => b.id !== addedBusId);
      }
    }

    for (const modTrack of diff.modifiedTracks) {
      if (!acceptedTracks.has(modTrack.trackId)) {
        for (const change of modTrack.changes) {
          const mainTrack = main.state.tracks.find((t) => t.id === modTrack.trackId);
          if (mainTrack) {
            (mainTrack as unknown as Record<string, unknown>)[change.field] = change.oldValue;
          }
        }
      }
    }
  }

  main.state = JSON.parse(JSON.stringify(branch.state));
  main.state.crdtOperations = [...main.state.crdtOperations, ...branch.state.crdtOperations];
  branch.merged = true;
  branch.mergeTimestamp = new Date().toISOString();

  return main.state;
}

export function deleteBranch(branchId: string): boolean {
  if (branchId === "main") return false;
  const branch = projectState.branches.get(branchId);
  if (!branch) return false;
  if (branch.merged) return false;
  projectState.branches.delete(branchId);
  if (projectState.activeBranchId === branchId) {
    projectState.activeBranchId = "main";
  }
  return true;
}

export function getMainState(): BranchState | null {
  return projectState.branches.get("main")?.state ?? null;
}

export function disposeBranching(): void {
  projectState.branches.clear();
  projectState.activeBranchId = "main";
  lamportCounter = 0;
  opIdCounter = 0;
}
