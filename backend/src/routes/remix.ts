import { Router, Request, Response } from "express"
import { supabase } from "../lib/supabase"

const router = Router()

router.post("/projects/remix", async (req: Request, res: Response) => {
  try {
    const { originalProjectId, userId } = req.body
    if (!originalProjectId || !userId) {
      return res.status(400).json({ error: "originalProjectId e userId obrigatórios" })
    }

    const { data: source } = await supabase
      .from("projects")
      .select("*")
      .eq("id", originalProjectId)
      .single()

    if (!source) return res.status(404).json({ error: "Projeto original não encontrado" })

    const { data: remixed, error } = await supabase
      .from("projects")
      .insert({
        title: `Remix: ${source.title}`,
        genre: source.genre,
        mood: source.mood,
        bpm: source.bpm,
        key: source.key,
        chords: source.chords,
        tracks: source.tracks,
        user_id: userId,
        parent_project_id: source.id,
        is_published: false,
      })
      .select()
      .single()

    if (error) throw error

    await supabase.from("remixes").insert({
      original_project_id: source.id,
      remixed_project_id: remixed.id,
      created_by: userId,
    })

    res.status(201).json(remixed)
  } catch (e) {
    console.error("Remix failed:", e)
    const isProduction = process.env.NODE_ENV === "production"
    res.status(500).json({ error: "Falha ao criar remix", ...(isProduction ? {} : { details: String(e) }) })
  }
})

router.get("/projects/:id/remixes", async (req: Request, res: Response) => {
  try {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("parent_project_id", req.params.id)
    res.json(data || [])
  } catch (e) {
    console.error("Failed to fetch remixes:", e)
    res.status(500).json({ error: "Falha ao buscar remixes" })
  }
})

router.get("/projects/:id/tree", async (req: Request, res: Response) => {
  try {
    interface RemixRow {
      created_at: string
      remixed_project_id: string
      remixed_project: { title: string } | null
    }

    const { data: remixes } = await supabase
      .from("remixes")
      .select("*, remixed_project:projects!remixes_remixed_project_id_fkey(*)")
      .eq("original_project_id", req.params.id)

    const tree = {
      projectId: req.params.id,
      remixes: (remixes as unknown as RemixRow[])?.map(r => ({
        id: r.remixed_project_id,
        title: r.remixed_project?.title,
        createdAt: r.created_at,
      })) || [],
    }
    res.json(tree)
  } catch (e) {
    console.error("Failed to fetch remix tree:", e)
    res.status(500).json({ error: "Falha ao buscar árvore de remixes" })
  }
})

router.post("/projects/:id/publish", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from("projects")
      .update({ is_published: true })
      .eq("id", req.params.id)
    if (error) throw error
    res.json({ published: true })
  } catch (e) {
    console.error("Failed to publish project:", e)
    res.status(500).json({ error: "Falha ao publicar projeto" })
  }
})

router.post("/projects/:id/react", async (req: Request, res: Response) => {
  try {
    const { userId, reaction } = req.body
    const { error } = await supabase
      .from("project_reactions")
      .upsert({ project_id: req.params.id, user_id: userId, reaction }, { onConflict: "project_id,user_id,reaction" })
    if (error) throw error
    res.json({ success: true })
  } catch (e) {
    console.error("Failed to react to project:", e)
    res.status(500).json({ error: "Falha ao reagir ao projeto" })
  }
})

export default router
