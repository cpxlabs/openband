import { Router, Response } from "express"
import { supabase } from "../lib/supabase"
import { requireAuth, AuthenticatedRequest } from "../middleware/authMiddleware"
import { computeCreativeDNA } from "../lib/creativeDNA"

const router = Router()

router.post("/users/dna/refresh", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userTokenData!.userId
    const tags = await computeCreativeDNA(userId)
    res.json({ creative_tags: tags })
  } catch (e) {
    console.error("Failed to compute creative DNA:", e)
    res.status(500).json({ error: "Falha ao calcular DNA criativo" })
  }
})

router.get("/users/dna", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userTokenData!.userId

    const { data, error } = await supabase
      .from("profiles")
      .select("creative_tags")
      .eq("id", userId)
      .maybeSingle()

    if (error) throw error
    res.json({ creative_tags: data?.creative_tags || [] })
  } catch (e) {
    console.error("Failed to fetch creative DNA:", e)
    res.status(500).json({ error: "Falha ao buscar DNA criativo" })
  }
})

export default router
