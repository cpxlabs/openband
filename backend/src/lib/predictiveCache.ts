interface CachedProject {
  id: string
  title: string
  genre: string
  mood: string
  bpm: number
  key: string
  tracks: any[]
  cachedAt: number
}

const cache = new Map<string, CachedProject[]>()
const CACHE_TTL = 5 * 60 * 1000

export async function hydrateUserCache(userId: string, projects: CachedProject[]): Promise<void> {
  cache.set(userId, projects.map(p => ({ ...p, cachedAt: Date.now() })))
}

export function getCachedProjects(userId: string): CachedProject[] | null {
  const cached = cache.get(userId)
  if (!cached) return null
  if (Date.now() - cached[0]?.cachedAt > CACHE_TTL) {
    cache.delete(userId)
    return null
  }
  return cached
}

export function invalidateUserCache(userId: string): void {
  cache.delete(userId)
}

export async function warmCacheOnLogin(userId: string, fetchRecentProjects: (userId: string) => Promise<CachedProject[]>): Promise<void> {
  try {
    const projects = await fetchRecentProjects(userId)
    await hydrateUserCache(userId, projects)
  } catch (e) {
    console.warn("Cache warming failed:", e)
  }
}
