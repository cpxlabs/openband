import { supabase } from "./supabase"

type MoodType = "day" | "night" | "sun" | "rain" | "snow"

interface ProjectRow {
  mood: MoodType | null
  genre: string | null
}

const MOOD_LABELS: Record<string, string> = {
  day: "Diurno",
  night: "Noturno",
  sun: "Solar",
  rain: "Chuvoso",
  snow: "Invernal",
}

function topEntries(freq: Record<string, number>, n: number): string[] {
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key)
}

export async function computeCreativeDNA(userId: string): Promise<string[]> {
  const { data: projects } = await supabase
    .from("projects")
    .select("mood, genre")
    .eq("owner_id", userId)
    .eq("is_deleted", false)

  if (!projects || projects.length === 0) {
    await supabase.from("profiles").update({ creative_tags: [] }).eq("id", userId)
    return []
  }

  const rows = projects as ProjectRow[]

  const moodFreq: Record<string, number> = {}
  const genreFreq: Record<string, number> = {}

  for (const p of rows) {
    if (p.mood) moodFreq[p.mood] = (moodFreq[p.mood] || 0) + 1
    if (p.genre) genreFreq[p.genre] = (genreFreq[p.genre] || 0) + 1
  }

  const topGenres = topEntries(genreFreq, 3)
  const topMoods = topEntries(moodFreq, 3)

  const tags: string[] = []

  for (const g of topGenres) {
    tags.push(`Produtor ${g}`)
  }

  for (const m of topMoods) {
    const label = MOOD_LABELS[m] || m
    tags.push(`Ambiente ${label}`)
  }

  if (rows.length >= 10) tags.push("Produtor Prolífico")
  if (topGenres.length === 0 && topMoods.length === 0) tags.push("Explorador Sonoro")

  const uniqueTags = [...new Set(tags)]

  await supabase.from("profiles").update({ creative_tags: uniqueTags }).eq("id", userId)

  return uniqueTags
}
