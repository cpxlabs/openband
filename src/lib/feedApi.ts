import { supabase } from "./supabase"
import { API_BASE_URL } from "./apiUrl"

export interface FeedPage {
  posts: unknown[]
  nextCursor: string | null
}

export interface LikeResult {
  liked: boolean
  likes: number
}

export interface RemixResult {
  remixedProjectId: string
  remixUrl: string
}

async function getToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

async function authedFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}/api${path}`, { ...options, headers })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export async function fetchFeed(params: {
  cursor?: string
  limit?: number
  genre?: string
  sort?: string
  type?: string
} = {}): Promise<FeedPage> {
  const qs = new URLSearchParams()
  if (params.cursor) qs.set("cursor", params.cursor)
  if (params.limit) qs.set("limit", String(params.limit))
  if (params.genre) qs.set("genre", params.genre)
  if (params.sort) qs.set("sort", params.sort)
  if (params.type) qs.set("type", params.type)
  const query = qs.toString()
  return authedFetch(`/feed${query ? `?${query}` : ""}`)
}

export async function publishPost(body: Record<string, unknown>): Promise<unknown> {
  return authedFetch("/feed", { method: "POST", body: JSON.stringify(body) })
}

export async function toggleLike(id: string): Promise<LikeResult> {
  return authedFetch(`/feed/${id}/like`, { method: "POST" })
}

export async function createRemix(id: string, newProjectId?: string): Promise<RemixResult> {
  return authedFetch(`/feed/${id}/remix`, {
    method: "POST",
    body: JSON.stringify({ newProjectId }),
  })
}
