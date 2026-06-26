import { Router, Response } from "express"
import { supabase } from "../lib/supabase"
import { requireAuth, AuthenticatedRequest } from "../middleware/authMiddleware"

const router = Router()

router.get("/projects/trash", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userTokenData!.userId

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_deleted", true)
      .order("deleted_at", { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (e) {
    console.error("Failed to fetch trash:", e)
    res.status(500).json({ error: "Falha ao buscar lixo" })
  }
})

router.post("/projects/:id/restore", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userTokenData!.userId
    const { id } = req.params

    const { data: project } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", id)
      .eq("is_deleted", true)
      .maybeSingle()

    if (!project || project.owner_id !== userId) {
      return res.status(404).json({ error: "Projeto não encontrado no lixo" })
    }

    const { error } = await supabase
      .from("projects")
      .update({ is_deleted: false, deleted_at: null })
      .eq("id", id)

    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    console.error("Failed to restore project:", e)
    res.status(500).json({ error: "Falha ao restaurar projeto" })
  }
})

router.delete("/projects/:id/permanent", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userTokenData!.userId
    const { id } = req.params

    const { data: project } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", id)
      .eq("owner_id", userId)
      .maybeSingle()

    if (!project) {
      return res.status(404).json({ error: "Projeto não encontrado" })
    }

    await supabase.from("tracks").delete().eq("project_id", id)

    const { error } = await supabase.from("projects").delete().eq("id", id)
    if (error) throw error

    res.json({ success: true })
  } catch (e) {
    console.error("Failed to permanently delete project:", e)
    res.status(500).json({ error: "Falha ao eliminar permanentemente" })
  }
})

export default router
