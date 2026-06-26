const DB_NAME = "openband_recovery"
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains("project_states")) {
        db.createObjectStore("project_states", { keyPath: "projectId" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSaves: Map<string, object> = new Map()

export function scheduleCrashSave(projectId: string, state: object): void {
  pendingSaves.set(projectId, state)

  if (saveTimer) return

  saveTimer = setTimeout(async () => {
    const saves = new Map(pendingSaves)
    pendingSaves.clear()
    saveTimer = null

    try {
      const db = await openDB()
      const tx = db.transaction("project_states", "readwrite")
      const store = tx.objectStore("project_states")

      for (const [id, data] of saves) {
        store.put({ projectId: id, state: data, savedAt: Date.now() })
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })

      db.close()
    } catch (e) {
      console.warn("Crash save failed:", e)
    }
  }, 500)
}

export async function restoreCrashState(projectId: string): Promise<object | null> {
  try {
    const db = await openDB()
    const tx = db.transaction("project_states", "readonly")
    const store = tx.objectStore("project_states")
    const request = store.get(projectId)

    const result = await new Promise<any>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    db.close()

    if (result && result.state) {
      return result.state
    }
    return null
  } catch {
    return null
  }
}

export async function clearCrashState(projectId: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction("project_states", "readwrite")
    const store = tx.objectStore("project_states")
    store.delete(projectId)
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve() })
    db.close()
  } catch {}
}

export async function getAllCrashStates(): Promise<{ projectId: string; savedAt: number }[]> {
  try {
    const db = await openDB()
    const tx = db.transaction("project_states", "readonly")
    const store = tx.objectStore("project_states")
    const request = store.getAll()

    const results = await new Promise<any[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    db.close()
    return results.map((r: any) => ({ projectId: r.projectId, savedAt: r.savedAt }))
  } catch {
    return []
  }
}
