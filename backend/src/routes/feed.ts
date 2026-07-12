import { Router, Response } from "express"
import { supabase } from "../lib/supabase"
import { requireAuth, AuthenticatedRequest } from "../middleware/authMiddleware"

interface PostRow {
  id: string
  user_id: string
  project_id: string | null
  title: string
  description: string | null
  master_audio_url: string
  created_at: string
  type: string
  genre: string
  key: string
  bpm: number
  duration: number
  color: string
  plays: number
  caption: string | null
  image_url: string | null
  song_title: string | null
  comments: number
  time_ago: string | null
}

interface ProfileRow {
  id: string
  display_name: string | null
  username: string | null
  name: string | null
  avatar_url: string | null
}

interface FeedPostView {
  id: string
  title: string
  author: string
  authorHandle: string
  genre: string
  key: string
  bpm: number
  plays: number
  likes: number
  userLiked: boolean
  duration: number
  color: string
}

interface MomentView {
  id: string
  artistName: string
  artistHandle: string
  avatar: string
  imageUrl?: string
  caption: string
  songTitle: string
  songDuration: number
  likes: number
  comments: number
  userLiked: boolean
  timeAgo: string
}

const router = Router()

function deriveAuthor(profile: ProfileRow | null): {
  author: string
  authorHandle: string
} {
  const author = profile?.display_name || profile?.name || "Desconhecido"
  const handle = profile?.username ? `@${profile.username}` : "@user"
  return { author, authorHandle: handle }
}

async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, username, name, avatar_url")
    .eq("id", userId)
    .maybeSingle()
  return (data as ProfileRow | null) ?? null
}

async function getLikeCount(postId: string): Promise<number> {
  const { data } = await supabase.from("post_likes").select("id").eq("post_id", postId)
  return Array.isArray(data) ? data.length : 0
}

async function getUserLiked(postId: string, userId?: string): Promise<boolean> {
  if (!userId) return false
  const { data } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle()
  return !!data
}

function mapPostToView(
  row: PostRow,
  author: string,
  authorHandle: string,
  likes: number,
  userLiked: boolean,
): FeedPostView | MomentView {
  if (row.type === "moment") {
    return {
      id: row.id,
      artistName: author,
      artistHandle: authorHandle,
      avatar: author,
      imageUrl: row.image_url || undefined,
      caption: row.caption || "",
      songTitle: row.song_title || row.title,
      songDuration: row.duration || 0,
      likes,
      comments: row.comments || 0,
      userLiked,
      timeAgo: row.time_ago || "now",
    }
  }
  return {
    id: row.id,
    title: row.title,
    author,
    authorHandle,
    genre: row.genre || "",
    key: row.key || "",
    bpm: row.bpm || 120,
    plays: row.plays || 0,
    likes,
    userLiked,
    duration: row.duration || 0,
    color: row.color || "bg-brand-primary",
  }
}

router.get("/feed", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawLimit = parseInt(String(req.query.limit ?? "20"), 10)
    const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20, 50)
    const genre = typeof req.query.genre === "string" ? req.query.genre : undefined
    const type = typeof req.query.type === "string" ? req.query.type : undefined
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined
    const sort = typeof req.query.sort === "string" ? req.query.sort : "recent"
    const userId = req.userTokenData?.userId

    const query = supabase.from("posts").select("*")
    if (type) query.eq("type", type)
    if (genre) query.eq("genre", genre)
    if (sort === "popular") query.order("plays", { ascending: false })
    query.order("created_at", { ascending: false })
    query.order("id", { ascending: false })

    const { data, error } = await query
    if (error) throw error

    const all = (data as PostRow[] | null) ?? []

    let startIdx = 0
    if (cursor) {
      const idx = all.findIndex((p) => p.id === cursor)
      if (idx >= 0) startIdx = idx + 1
    }
    const page = all.slice(startIdx, startIdx + limit)
    const nextCursor =
      startIdx + limit < all.length && page.length > 0
        ? page[page.length - 1].id
        : null

    const posts = await Promise.all(
      page.map(async (row) => {
        const profile = await getProfile(row.user_id)
        const { author, authorHandle } = deriveAuthor(profile)
        const [likes, userLiked] = await Promise.all([
          getLikeCount(row.id),
          getUserLiked(row.id, userId),
        ])
        return mapPostToView(row, author, authorHandle, likes, userLiked)
      }),
    )

    res.json({ posts, nextCursor })
  } catch (e) {
    console.error("Failed to fetch feed:", e)
    res.status(500).json({ error: "Falha ao buscar feed" })
  }
})

router.post("/feed", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userTokenData!.userId
    const body = (req.body ?? {}) as Record<string, unknown>
    const type = body.type === "moment" ? "moment" : "post"

    const insertRow = {
      user_id: userId,
      project_id: (body.project_id as string) ?? null,
      title: (body.title as string) ?? "Sem título",
      description: (body.description as string) ?? null,
      master_audio_url: (body.master_audio_url as string) ?? "",
      type,
      genre: (body.genre as string) ?? "",
      key: (body.key as string) ?? "",
      bpm: Number(body.bpm ?? 120),
      duration: Number(body.duration ?? 0),
      color: (body.color as string) ?? "bg-brand-primary",
      plays: 0,
      caption: (body.caption as string) ?? null,
      image_url: (body.image_url as string) ?? null,
      song_title: (body.song_title as string) ?? null,
      comments: Number(body.comments ?? 0),
      time_ago: "now",
    }

    const { data, error } = await supabase
      .from("posts")
      .insert(insertRow)
      .select()
      .single()
    if (error) throw error

    const row = data as PostRow
    const profile = await getProfile(row.user_id)
    const { author, authorHandle } = deriveAuthor(profile)
    const view = mapPostToView(row, author, authorHandle, 0, false)

    res.status(201).json(view)
  } catch (e) {
    console.error("Failed to publish post:", e)
    const isProduction = process.env.NODE_ENV === "production"
    res
      .status(500)
      .json({ error: "Falha ao publicar post", ...(isProduction ? {} : { details: String(e) }) })
  }
})

router.post(
  "/feed/:id/like",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userTokenData!.userId
      const postId = req.params.id

      const { data: existing } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle()

      if (existing) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId)
      } else {
        await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: userId,
          created_at: new Date().toISOString(),
        })
      }

      const likes = await getLikeCount(postId)
      res.json({ liked: !existing, likes })
    } catch (e) {
      console.error("Failed to toggle like:", e)
      const isProduction = process.env.NODE_ENV === "production"
      res
        .status(500)
        .json({ error: "Falha ao curtir post", ...(isProduction ? {} : { details: String(e) }) })
    }
  },
)

router.post(
  "/feed/:id/remix",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userTokenData!.userId
      const postId = req.params.id
      const newProjectId =
        typeof req.body?.newProjectId === "string" ? req.body.newProjectId : undefined

      const { data: post } = await supabase
        .from("posts")
        .select("project_id")
        .eq("id", postId)
        .maybeSingle()

      const remixedProjectId = newProjectId || `remix-${postId}-${Date.now()}`

      if (post?.project_id) {
        await supabase.from("remixes").insert({
          original_project_id: post.project_id,
          remixed_project_id: remixedProjectId,
          created_by: userId,
        })
      }

      const remixUrl = `/studio/${remixedProjectId}?title=${encodeURIComponent("Remix")}`
      res.status(201).json({ remixedProjectId, remixUrl })
    } catch (e) {
      console.error("Failed to create remix:", e)
      const isProduction = process.env.NODE_ENV === "production"
      res
        .status(500)
        .json({ error: "Falha ao criar remix", ...(isProduction ? {} : { details: String(e) }) })
    }
  },
)

export default router
