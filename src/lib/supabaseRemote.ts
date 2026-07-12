import { getObjectStorage } from "./objectStorage";

export interface SupabaseRemoteConfig {
  supabaseUrl: string;
  supabaseKey: string;
  projectId: string;
  bucketName: string;
}

export interface RemoteProject {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  modifiedAt: string;
  stateRef: string;
  branch: string;
}

export interface UploadResult {
  assetId: string;
  url: string;
  hash: string;
  size: number;
  duplicated: boolean;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  uploadedAssets: number;
  duplicatedAssets: number;
}

let config: SupabaseRemoteConfig | null = null;
let headers: Record<string, string> = {};

const assetHashCache = new Map<string, string>();

export function configureRemote(cfg: SupabaseRemoteConfig): void {
  config = cfg;
  headers = {
    apikey: cfg.supabaseKey,
    Authorization: `Bearer ${cfg.supabaseKey}`,
    "Content-Type": "application/json",
  };
}

function getBaseUrl(): string {
  if (!config) throw new Error("Remote not configured");
  return config.supabaseUrl.replace(/\/+$/, "");
}

async function computeHash(data: ArrayBuffer): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `hash-${data.byteLength}-${Date.now()}`;
}

export async function checkAssetExists(hash: string): Promise<boolean> {
  if (!config) return false;

  if (assetHashCache.has(hash)) return true;

  try {
    const url = `${getBaseUrl()}/rest/v1/assets?hash=eq.${hash}&select=id`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) return false;
    const data = await resp.json() as { id: string }[];
    const exists = data.length > 0;
    if (exists) assetHashCache.set(hash, data[0].id);
    return exists;
  } catch (e) {
    console.warn("Failed to check asset existence:", e);
    return false;
  }
}

export async function uploadAsset(
  file: Blob | ArrayBuffer,
  filename: string,
  metadata: Record<string, unknown> = {},
): Promise<UploadResult> {
  if (!config) throw new Error("Remote not configured");

  const data = file instanceof Blob ? await file.arrayBuffer() : file;
  const hash = await computeHash(data);

  const existing = await checkAssetExists(hash);
  if (existing) {
    const cachedId = assetHashCache.get(hash)!;
    return {
      assetId: cachedId,
      url: `${getBaseUrl()}/storage/v1/object/public/${config.bucketName}/${cachedId}`,
      hash,
      size: data.byteLength,
      duplicated: true,
    };
  }

  const storage = getObjectStorage();
  const presign = await storage.requestUploadUrl(hash, filename, "application/octet-stream");
  await storage.upload(presign.key, data, presign.headers);
  const assetId = presign.key;

  const publicUrl =
    storage.kind === "mock"
      ? `mock://${config.bucketName}/${presign.key}`
      : `${getBaseUrl()}/storage/v1/object/public/${config.bucketName}/${presign.key}`;

  try {
    const dbUrl = `${getBaseUrl()}/rest/v1/assets`;
    await fetch(dbUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: assetId,
        filename,
        hash,
        size: data.byteLength,
        url: publicUrl,
        metadata,
      }),
    });
  } catch (e) {
    console.warn("Failed to register asset in DB:", e);
  }

  assetHashCache.set(hash, assetId);

  return {
    assetId,
    url: publicUrl,
    hash,
    size: data.byteLength,
    duplicated: false,
  };
}

export async function pushState(
  projectId: string,
  stateJson: string,
  commitId: string,
  branch: string = "main",
): Promise<{ version: number }> {
  if (!config) throw new Error("Remote not configured");

  const dbUrl = `${getBaseUrl()}/rest/v1/project_states`;

  const resp = await fetch(dbUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      project_id: projectId,
      state_json: stateJson,
      commit_id: commitId,
      branch,
      created_at: new Date().toISOString(),
    }),
  });

  if (!resp.ok) {
    throw new Error(`Push failed: ${resp.status}`);
  }

  return { version: Date.now() };
}

export async function pullState(
  projectId: string,
  branch: string = "main",
): Promise<{ stateJson: string; commitId: string } | null> {
  if (!config) throw new Error("Remote not configured");

  const dbUrl = `${getBaseUrl()}/rest/v1/project_states?project_id=eq.${projectId}&branch=eq.${branch}&order=created_at.desc&limit=1`;

  try {
    const resp = await fetch(dbUrl, { headers });
    if (!resp.ok) return null;

    const data = await resp.json() as {
      state_json: string;
      commit_id: string;
    }[];

    if (data.length === 0) return null;

    return {
      stateJson: data[0].state_json,
      commitId: data[0].commit_id,
    };
  } catch (e) {
    console.warn("Pull failed:", e);
    return null;
  }
}

export async function syncProject(
  projectId: string,
  localStateJson: string,
  localCommitId: string,
  branch: string = "main",
): Promise<SyncResult> {
  const result: SyncResult = {
    pushed: 0,
    pulled: 0,
    conflicts: 0,
    uploadedAssets: 0,
    duplicatedAssets: 0,
  };

  try {
    const remote = await pullState(projectId, branch);

    if (!remote || remote.commitId === localCommitId) {
      await pushState(projectId, localStateJson, localCommitId, branch);
      result.pushed = 1;
    } else {
      result.conflicts = 1;
    }
  } catch (e) {
    console.warn("Sync failed:", e);
  }

  return result;
}

export function disposeRemote(): void {
  config = null;
  headers = {};
  assetHashCache.clear();
}

export async function listProjects(): Promise<RemoteProject[]> {
  if (!config) return [];

  try {
    const url = `${getBaseUrl()}/rest/v1/projects?select=*`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) return [];
    return (await resp.json()) as RemoteProject[];
  } catch (e) {
    return [];
  }
}
