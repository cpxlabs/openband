export async function registerCacheSW(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return

  try {
    const registration = await navigator.serviceWorker.register("/sw.js")
    console.log("SW registered:", registration.scope)
  } catch (e) {
    console.warn("SW registration failed:", e)
  }
}

export async function cacheProjectForOffline(projectId: string, jsonData: object): Promise<void> {
  if (!("serviceWorker" in navigator)) return

  const cache = await caches.open("openband-projects")
  const response = new Response(JSON.stringify(jsonData), {
    headers: { "Content-Type": "application/json" },
  })
  await cache.put(`/offline/project/${projectId}`, response)
}

export async function loadProjectOffline(projectId: string): Promise<object | null> {
  if (!("caches" in window)) return null

  try {
    const cache = await caches.open("openband-projects")
    const response = await cache.match(`/offline/project/${projectId}`)
    if (!response) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function clearOfflineProjects(): Promise<void> {
  if (!("caches" in window)) return
  await caches.delete("openband-projects")
}
