import { Router, Request, Response } from "express"
import { supabase } from "../lib/supabase"
import { requireAuth, type AuthenticatedRequest } from "../middleware/authMiddleware"

const router = Router()

async function getUserRole(bandId: string, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("band_members")
    .select("role")
    .eq("band_id", bandId)
    .eq("user_id", userId)
    .maybeSingle()
  return data?.role || null
}

async function requireRole(req: AuthenticatedRequest, bandId: string, minRole: string): Promise<boolean> {
  const role = await getUserRole(bandId, req.userTokenData!.userId)
  const hierarchy = { OWNER: 3, EDITOR: 2, VIEWER: 1 }
  return (hierarchy[role as keyof typeof hierarchy] || 0) >= (hierarchy[minRole as keyof typeof hierarchy] || 0)
}

router.post("/bands", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description } = req.body
    const userId = req.userTokenData!.userId

    const { data: band, error: bandErr } = await supabase
      .from("bands")
      .insert({ name, description, owner_id: userId })
      .select()
      .single()
    if (bandErr) throw bandErr

    const { error: memberErr } = await supabase
      .from("band_members")
      .insert({ band_id: band.id, user_id: userId, role: "OWNER" })
    if (memberErr) throw memberErr

    res.status(201).json(band)
  } catch (e) {
    console.error("Create band failed:", e)
    res.status(500).json({ error: "Falha ao criar banda." })
  }
})

router.get("/bands", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("band_members")
      .select("band:bands(*), role")
      .eq("user_id", req.userTokenData!.userId)
    if (error) throw error
    res.json(data || [])
  } catch (e) {
    res.status(500).json({ error: "Falha ao listar bandas." })
  }
})

router.get("/bands/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: band, error } = await supabase
      .from("bands")
      .select("*")
      .eq("id", req.params.id)
      .single()
    if (error || !band) return res.status(404).json({ error: "Banda não encontrada." })

    if (!(await requireRole(req, req.params.id, "VIEWER"))) {
      return res.status(403).json({ error: "Acesso negado." })
    }

    const { data: members } = await supabase
      .from("band_members")
      .select("user_id, role, joined_at, profile:profiles(email, name)")
      .eq("band_id", req.params.id)

    res.json({ ...band, members: members || [] })
  } catch (e) {
    res.status(500).json({ error: "Falha ao buscar banda." })
  }
})

router.post("/bands/:id/members", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!(await requireRole(req, req.params.id, "OWNER"))) {
      return res.status(403).json({ error: "Apenas o dono pode adicionar membros." })
    }
    const { userId, role = "VIEWER" } = req.body
    const { error } = await supabase
      .from("band_members")
      .insert({ band_id: req.params.id, user_id: userId, role })
    if (error) throw error
    res.status(201).json({ success: true })
  } catch (e) {
    res.status(500).json({ error: "Falha ao adicionar membro." })
  }
})

router.delete("/bands/:id/members/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!(await requireRole(req, req.params.id, "OWNER"))) {
      return res.status(403).json({ error: "Apenas o dono pode remover membros." })
    }
    const { error } = await supabase
      .from("band_members")
      .delete()
      .eq("band_id", req.params.id)
      .eq("user_id", req.params.userId)
    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: "Falha ao remover membro." })
  }
})

router.patch("/bands/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!(await requireRole(req, req.params.id, "OWNER"))) {
      return res.status(403).json({ error: "Apenas o dono pode editar a banda." })
    }
    const { name, description, avatar_url } = req.body
    const { data, error } = await supabase
      .from("bands")
      .update({ name, description, avatar_url })
      .eq("id", req.params.id)
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: "Falha ao atualizar banda." })
  }
})

router.get("/bands/:id/projects", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!(await requireRole(req, req.params.id, "VIEWER"))) {
      return res.status(403).json({ error: "Acesso negado." })
    }
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("band_id", req.params.id)
      .eq("is_deleted", false)
    if (error) throw error
    res.json(data || [])
  } catch (e) {
    res.status(500).json({ error: "Falha ao listar projetos." })
  }
})

router.post("/bands/:id/projects", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!(await requireRole(req, req.params.id, "EDITOR"))) {
      return res.status(403).json({ error: "Permissão insuficiente." })
    }
    const { title, genre, mood, bpm, key } = req.body
    const { data, error } = await supabase
      .from("projects")
      .insert({ title, genre, mood, bpm, key, band_id: req.params.id, owner_id: req.userTokenData!.userId })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e) {
    res.status(500).json({ error: "Falha ao criar projeto." })
  }
})

export default router