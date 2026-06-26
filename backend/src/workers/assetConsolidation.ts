import { supabase } from "../lib/supabase"

export interface OrphanedAsset {
  filename: string
  path: string
  size: number
  orphanedAt: number
}

const orphanQueue: Map<string, OrphanedAsset> = new Map()

export async function consolidateProjectAssets(projectId: string, storagePath: string): Promise<OrphanedAsset[]> {
  try {
    const { data: project, error } = await supabase
      .from("projects")
      .select("tracks")
      .eq("id", projectId)
      .maybeSingle()

    if (error || !project) return []

    const referencedUrls = new Set<string>()
    const tracks = project.tracks || []
    for (const track of tracks) {
      if (track.regions) {
        for (const region of track.regions) {
          if (region.audioUrl) referencedUrls.add(region.audioUrl)
        }
      }
      if (track.sourceUrl) referencedUrls.add(track.sourceUrl)
      if (track.contentUrl) referencedUrls.add(track.contentUrl)
    }

    const allFiles = await listStorageFiles(storagePath)
    const orphans: OrphanedAsset[] = []

    for (const file of allFiles) {
      const isReferenced = Array.from(referencedUrls).some(url => url.includes(file.filename))
      if (!isReferenced) {
        const orphan: OrphanedAsset = {
          filename: file.filename,
          path: file.path,
          size: file.size,
          orphanedAt: Date.now(),
        }
        orphanQueue.set(file.path, orphan)
        orphans.push(orphan)
      }
    }

    return orphans
  } catch (e) {
    console.error("Asset consolidation failed:", e)
    return []
  }
}

export async function purgeExpiredOrphans(maxAgeDays: number = 7): Promise<number> {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
  let purged = 0

  for (const [key, orphan] of orphanQueue) {
    if (orphan.orphanedAt < cutoff) {
      try {
        await deleteStorageFile(orphan.path)
        orphanQueue.delete(key)
        purged++
      } catch (e) {
        console.warn("Failed to purge orphan:", orphan.path, e)
      }
    }
  }

  return purged
}

export function getOrphanQueue(): OrphanedAsset[] {
  return Array.from(orphanQueue.values())
}

async function listStorageFiles(_path: string): Promise<{ filename: string; path: string; size: number }[]> {
  return []
}

async function deleteStorageFile(_path: string): Promise<void> {}
