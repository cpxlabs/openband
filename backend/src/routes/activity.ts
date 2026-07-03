import { Router, Request, Response } from "express"
import { supabase } from "../lib/supabase"

const router = Router()

router.get("/projects/:id/activity", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("project_activity")
      .select("*")
      .eq("project_id", req.params.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error
    res.json(data || [])
  } catch (e) {
    console.error("Activity log fetch failed:", e)
    res.status(500).json({ error: "Falha ao buscar histórico." })
  }
})

router.post("/projects/:id/activity", async (req: Request<{ id: string }, unknown, { userId?: string; userName?: string; action?: string; details?: string }>, res: Response) => {
  try {
    const { userId, userName, action, details } = req.body
    const { error } = await supabase
      .from("project_activity")
      .insert({ project_id: req.params.id, user_id: userId, user_name: userName, action, details })

    if (error) throw error
    res.status(201).json({ success: true })
  } catch (e) {
    console.error("Activity log insert failed:", e)
    res.status(500).json({ error: "Falha ao registrar atividade." })
  }
})

export default router