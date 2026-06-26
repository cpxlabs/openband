import { Router, Response } from "express"
import jwt from "jsonwebtoken"
import { supabase } from "../lib/supabase"
import { AuthenticatedRequest, requireAuth } from "../middleware/authMiddleware"
import { addToBlacklist } from "../middleware/sessionBlacklist"

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || "openband_jwt_secret_dev"

router.get("/auth/sessions", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userTokenData!.userId

    const { data: sessions, error } = await supabase
      .from("user_sessions")
      .select("id, token_hash, device_name, ip_address, user_agent, created_at, last_active_at")
      .eq("user_id", userId)
      .order("last_active_at", { ascending: false })

    if (error) throw error

    res.json({ sessions: sessions || [] })
  } catch (e) {
    console.error("List sessions failed:", e)
    res.status(500).json({ error: "Falha ao listar sessões." })
  }
})

router.delete("/auth/sessions/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userTokenData!.userId
    const { id } = req.params

    const { data: session, error } = await supabase
      .from("user_sessions")
      .select("id, token_hash")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle()

    if (error) throw error

    if (!session) {
      return res.status(404).json({ error: "Sessão não encontrada." })
    }

    addToBlacklist(session.token_hash)

    await supabase
      .from("user_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    res.json({ message: "Sessão revogada." })
  } catch (e) {
    console.error("Revoke session failed:", e)
    res.status(500).json({ error: "Falha ao revogar sessão." })
  }
})

export default router
