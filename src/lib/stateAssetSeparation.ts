import { getObjectStorage } from "./objectStorage";

export interface OpenBandManifest {
  version: string;
  format: "openband-v2";
  projectId: string;
  createdAt: string;
  modifiedAt: string;
  bpm: number;
  timeSignature: string;
  sampleRate: number;
  key?: string;
  genre?: string;
  artist?: string;
}

export interface TrackState {
  id: string;
  name: string;
  type: "audio" | "midi" | "instrument";
  muted: boolean;
  solo: boolean;
  volume: number;
  pan: number;
  outputBus: string;
  pluginChain: unknown[];
  audioAssetRef?: string;
  midiNotes?: unknown[];
  instrumentId?: string;
  regions?: unknown[];
}

export interface ProjectState {
  manifest: OpenBandManifest;
  tracks: TrackState[];
  buses: unknown[];
  masterPlugins: unknown[];
  automation: unknown[];
  chords: unknown[];
  mixSnapshots: unknown[];
}

export interface ProjectCommit {
  id: string;
  parentId: string | null;
  stateHash: string;
  message: string;
  author: string;
  timestamp: number;
  stateRef: string;
  assetRefs: string[];
  branchName: string;
}

export interface ProjectHistory {
  projectId: string;
  commits: ProjectCommit[];
  branches: Map<string, string>;
}

let currentProject: ProjectState | null = null;
let currentHistory: ProjectHistory | null = null;

function generateProjectId(): string {
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateCommitId(): string {
  return `commit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function sha256(data: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `fallback-${Math.abs(hash).toString(16)}`;
}

async function sha256Buffer(data: ArrayBuffer): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const view = new Uint8Array(data);
    const copy = new Uint8Array(view);
    const hashBuffer = await crypto.subtle.digest("SHA-256", copy);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  const bytes = new Uint8Array(data);
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash << 5) - hash) + bytes[i];
    hash |= 0;
  }
  return `fallback-${Math.abs(hash).toString(16)}`;
}

export async function registerAsset(
  trackId: string,
  file: Blob | ArrayBuffer,
  filename: string = "asset.wav",
): Promise<string> {
  const data = file instanceof Blob ? await file.arrayBuffer() : file;
  const hash = await sha256Buffer(data);
  const storage = getObjectStorage();
  const presign = await storage.requestUploadUrl(
    hash,
    filename,
    "application/octet-stream",
  );
  await storage.upload(presign.key, data, presign.headers);
  updateTrackInState(trackId, { audioAssetRef: presign.key });
  return presign.key;
}

export async function resolveAssetRef(key: string): Promise<string> {
  const storage = getObjectStorage();
  if (storage.kind === "mock") {
    const buf = await storage.download(key);
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return `data:application/octet-stream;base64,${btoa(binary)}`;
  }
  return (await storage.requestDownloadUrl(key)).url;
}

export async function createProject(
  bpm: number = 120,
  sampleRate: number = 44100,
  _name: string = "Untitled",
): Promise<ProjectState> {
  const projectId = generateProjectId();

  const manifest: OpenBandManifest = {
    version: "2.0.0",
    format: "openband-v2",
    projectId,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    bpm,
    sampleRate,
    timeSignature: "4/4",
  };

  currentProject = {
    manifest,
    tracks: [],
    buses: [],
    masterPlugins: [],
    automation: [],
    chords: [],
    mixSnapshots: [],
  };

  currentHistory = {
    projectId,
    commits: [],
    branches: new Map([["main", ""]]),
  };

  return currentProject;
}

export function getProject(): ProjectState | null {
  return currentProject;
}

export function updateProjectState(
  updater: (state: ProjectState) => ProjectState,
): ProjectState | null {
  if (!currentProject) return null;
  currentProject = updater(currentProject);
  currentProject.manifest.modifiedAt = new Date().toISOString();
  return currentProject;
}

export function addTrackToState(track: TrackState): ProjectState | null {
  return updateProjectState((s) => ({
    ...s,
    tracks: [...s.tracks, track],
  }));
}

export function removeTrackFromState(trackId: string): ProjectState | null {
  return updateProjectState((s) => ({
    ...s,
    tracks: s.tracks.filter((t) => t.id !== trackId),
  }));
}

export function updateTrackInState(
  trackId: string,
  updates: Partial<TrackState>,
): ProjectState | null {
  return updateProjectState((s) => ({
    ...s,
    tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t)),
  }));
}

export function getAssetRefs(): string[] {
  if (!currentProject) return [];
  const refs: string[] = [];
  for (const track of currentProject.tracks) {
    if (track.audioAssetRef) refs.push(track.audioAssetRef);
  }
  return refs;
}

export async function commitState(
  message: string,
  author: string = "local",
  branch: string = "main",
): Promise<ProjectCommit | null> {
  if (!currentProject || !currentHistory) return null;

  const stateJson = JSON.stringify(currentProject, null, 2);
  const stateHash = await sha256(stateJson);

  const lastCommit = currentHistory.commits.length > 0
    ? currentHistory.commits[currentHistory.commits.length - 1]
    : null;

  const commit: ProjectCommit = {
    id: generateCommitId(),
    parentId: lastCommit?.id ?? null,
    stateHash,
    message,
    author,
    timestamp: Date.now(),
    stateRef: `state/${stateHash.slice(0, 12)}.json`,
    assetRefs: getAssetRefs(),
    branchName: branch,
  };

  currentHistory.commits.push(commit);
  currentHistory.branches.set(branch, commit.id);

  return commit;
}

export function getHistory(): ProjectHistory | null {
  return currentHistory;
}

export function getLatestCommit(branch: string = "main"): ProjectCommit | null {
  if (!currentHistory) return null;
  const commits = currentHistory.commits.filter((c) => c.branchName === branch);
  return commits.length > 0 ? commits[commits.length - 1] : null;
}

export function revertToCommit(commitId: string): ProjectState | null {
  if (!currentHistory) return null;
  const commit = currentHistory.commits.find((c) => c.id === commitId);
  if (!commit) return null;
  return currentProject;
}

export function serializeProject(): string {
  if (!currentProject) return "{}";
  return JSON.stringify(currentProject, null, 2);
}

export function deserializeProject(json: string): ProjectState | null {
  try {
    currentProject = JSON.parse(json) as ProjectState;
    return currentProject;
  } catch (e) {
    console.error("Failed to deserialize project:", e);
    return null;
  }
}

export function exportProjectStructure(): {
  manifest: OpenBandManifest;
  stateJson: string;
  assetRefs: string[];
} {
  if (!currentProject) throw new Error("No project loaded");
  return {
    manifest: currentProject.manifest,
    stateJson: JSON.stringify(currentProject),
    assetRefs: getAssetRefs(),
  };
}
