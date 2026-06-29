const DB_NAME = "openband_ir_cache";
const DB_VERSION = 1;
const STORE_NAME = "impulse_responses";
const DEFAULT_MAX_ENTRIES = 50;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "url" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedIr(url: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);
      req.onsuccess = () => {
        const entry = req.result;
        if (entry) {
          resolve(entry.buffer as ArrayBuffer);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function cacheIr(url: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result >= DEFAULT_MAX_ENTRIES) {
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            store.delete(cursor.primaryKey);
          }
        };
      }
    };

    store.put({ url, buffer });
    tx.oncomplete = () => db.close();
  } catch {
  }
}

export async function fetchWithCache(url: string): Promise<ArrayBuffer> {
  const cached = await getCachedIr(url);
  if (cached) return cached;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch IR: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  await cacheIr(url, buffer);
  return buffer;
}

export async function clearIrCache(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => db.close();
  } catch {
  }
}
