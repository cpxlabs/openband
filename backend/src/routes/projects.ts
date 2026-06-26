import { Router, Response } from "express"
import { supabase } from "../lib/supabase"
import { requireAuth, AuthenticatedRequest } from "../middleware/authMiddleware"

const router = Router()

router.get("/projects", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userTokenData!.userId

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (e) {
    console.error("Failed to fetch projects:", e)
    res.status(500).json({ error: "Falha ao buscar projetos" })
  }
})

router.delete("/projects/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userTokenData!.userId
    const { id } = req.params

    const { data: project } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", id)
      .maybeSingle()

    if (!project || project.owner_id !== userId) {
      return res.status(404).json({ error: "Projeto não encontrado" })
    }

    const { error } = await supabase
      .from("projects")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    console.error("Failed to soft-delete project:", e)
    res.status(500).json({ error: "Falha ao mover para o lixo" })
  }
})

interface TrackData {
  id?: string
  [key: string]: any
}

router.patch("/projects/:id/tracks/:trackId", async (req, res) => {
  try {
    const { id, trackId } = req.params
    const trackPatch = req.body

    const { data: project, error: fetchErr } = await supabase
      .from("projects")
      .select("tracks")
      .eq("id", id)
      .maybeSingle()

    if (fetchErr || !project) {
      return res.status(404).json({ error: "Projeto não encontrado." })
    }

    const tracks: TrackData[] = project.tracks || []
    const trackIdx = tracks.findIndex((t) => t.id === trackId)
    if (trackIdx === -1) {
      return res.status(404).json({ error: "Trilha não encontrada." })
    }

    tracks[trackIdx] = { ...tracks[trackIdx], ...trackPatch }

    const { error: updateErr } = await supabase
      .from("projects")
      .update({ tracks, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (updateErr) throw updateErr

    await supabase.from("project_activity").insert({
      project_id: id,
      user_name: req.body._userName || "Usuário",
      action: "track_updated",
      details: `Trilha ${trackId} atualizada`,
    })

    res.json({ success: true, track: tracks[trackIdx] })
  } catch (e) {
    console.error("Track patch failed:", e)
    res.status(500).json({ error: "Falha ao atualizar trilha." })
  }
})

export default router
