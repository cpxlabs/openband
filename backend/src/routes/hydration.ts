import { Router, Response } from "express"
import { supabase } from "../lib/supabase"
import { getCachedProjects, warmCacheOnLogin } from "../lib/predictiveCache"
import { requireAuth, type AuthenticatedRequest } from "../middleware/authMiddleware"

const router = Router()

router.post("/users/hydrate", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userTokenData!.userId
    await warmCacheOnLogin(userId, async (uid) => {
      const { data } = await supabase
        .from("projects")
        .select("id, title, genre, mood, bpm, key, tracks")
        .eq("user_id", uid)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false })
        .limit(3)
      return (data || []).map((p: any) => ({ ...p, tracks: p.tracks || [] }))
    })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: "Falha ao aquecer cache." })
  }
})

router.get("/users/hydrated-projects", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userTokenData!.userId
  const cached = getCachedProjects(userId)
  if (cached) return res.json({ source: "cache", projects: cached })
  res.json({ source: "db", projects: [] })
})

export default router
