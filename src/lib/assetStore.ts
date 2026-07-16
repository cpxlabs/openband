import { Platform } from "react-native";
import { OpenBandNative } from "../bridge";

export const ASSET_PREFIX = "asset://";

const assetCache = new Map<string, string>();
const memStore = new Map<string, Blob>();

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open("openband_assets", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("assets")) {
        db.createObjectStore("assets", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function assetPath(base: string, id: string): string {
  const sep = base.endsWith("/") ? "" : "/";
  return base + sep + "assets/" + id + ".wav";
}

async function persistBytes(id: string, blob: Blob): Promise<void> {
  memStore.set(id, blob);
  if (Platform.OS !== "web") {
    try {
      const base = await OpenBandNative.getDocumentsPath();
      await OpenBandNative.writeFile(assetPath(base, id), await blob.arrayBuffer());
      return;
    } catch {
      return;
    }
  }
  try {
    const db = await openDb();
    if (!db) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("assets", "readwrite");
      tx.objectStore("assets").put({ id, blob });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* fall back to memStore */
  }
}

async function readBytes(id: string): Promise<Blob> {
  if (memStore.has(id)) return memStore.get(id)!;
  if (Platform.OS !== "web") {
    try {
      const base = await OpenBandNative.getDocumentsPath();
      const ab = await OpenBandNative.readFile(assetPath(base, id));
      return new Blob([ab], { type: "audio/wav" });
    } catch {
      throw new Error("asset not found: " + id);
    }
  }
  try {
    const db = await openDb();
    if (db) {
      const result = await new Promise<{ id: string; blob: Blob } | undefined>(
        (resolve, reject) => {
          const tx = db.transaction("assets", "readonly");
          const req = tx.objectStore("assets").get(id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        },
      );
      if (result) return result.blob;
    }
  } catch {
    /* fall through */
  }
  throw new Error("asset not found: " + id);
}

async function deleteBytes(id: string): Promise<void> {
  memStore.delete(id);
  if (Platform.OS !== "web") {
    try {
      const base = await OpenBandNative.getDocumentsPath();
      await OpenBandNative.writeFile(assetPath(base, id), new ArrayBuffer(0));
    } catch {
      /* best-effort */
    }
    return;
  }
  try {
    const db = await openDb();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction("assets", "readwrite");
      tx.objectStore("assets").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* best-effort */
  }
}

export async function saveAsset(blob: Blob): Promise<string> {
  const id = "rec-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  await persistBytes(id, blob);
  const url = URL.createObjectURL(blob);
  assetCache.set(id, url);
  return ASSET_PREFIX + id;
}

export async function resolveAssetUrl(url: string): Promise<string> {
  if (!url.startsWith(ASSET_PREFIX)) return url;
  const id = url.slice(ASSET_PREFIX.length);
  if (assetCache.has(id)) return assetCache.get(id)!;
  const blob = await readBytes(id);
  const live = URL.createObjectURL(blob);
  assetCache.set(id, live);
  return live;
}

export function resolveAssetUrlSync(url: string): string {
  if (!url.startsWith(ASSET_PREFIX)) return url;
  return assetCache.get(url.slice(ASSET_PREFIX.length)) ?? url;
}

export function deleteAssetUrl(url: string): void {
  if (!url.startsWith(ASSET_PREFIX)) return;
  const id = url.slice(ASSET_PREFIX.length);
  const cached = assetCache.get(id);
  if (cached) {
    try {
      URL.revokeObjectURL(cached);
    } catch {
      /* ignore */
    }
    assetCache.delete(id);
  }
  deleteBytes(id).catch(() => {});
}

export function revokeAssetCache(): void {
  for (const url of assetCache.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
  assetCache.clear();
}
