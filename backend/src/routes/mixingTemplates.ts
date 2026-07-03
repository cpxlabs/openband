import { Router, Response } from "express"
import { supabase } from "../lib/supabase"
import { requireAuth, type AuthenticatedRequest } from "../middleware/authMiddleware"

const router = Router()

interface ProjectTrack {
  name?: string
  type?: string
  [key: string]: unknown
}

router.get("/users/mixing-preferences", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("mixing_preferences")
      .eq("id", req.userTokenData!.userId)
      .maybeSingle()
    if (error) throw error
    res.json(data?.mixing_preferences || {})
  } catch (e) {
    res.status(500).json({ error: "Falha ao buscar preferências." })
  }
})

router.put("/users/mixing-preferences", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ mixing_preferences: req.body })
      .eq("id", req.userTokenData!.userId)
    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: "Falha ao salvar preferências." })
  }
})

router.post("/users/mixing-preferences/apply/:projectId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("mixing_preferences")
      .eq("id", req.userTokenData!.userId)
      .maybeSingle()
    if (profileErr || !profile) throw profileErr

    const prefs = profile.mixing_preferences || {}
    const trackDefaults = prefs.trackDefaults || {}

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("tracks")
      .eq("id", req.params.projectId)
      .maybeSingle()
    if (projErr || !project) return res.status(404).json({ error: "Projeto não encontrado." })

    const tracks = (project.tracks || []).map((track: ProjectTrack) => {
      const defaults = (track.name && trackDefaults[track.name]) || (track.type && trackDefaults[track.type]) || {}
      return { ...track, ...defaults }
    })

    const { error: updateErr } = await supabase
      .from("projects")
      .update({ tracks })
      .eq("id", req.params.projectId)
    if (updateErr) throw updateErr

    res.json({ success: true, tracks })
  } catch (e) {
    console.error("Apply mixing preferences failed:", e)
    res.status(500).json({ error: "Falha ao aplicar preferências." })
  }
})

export default router