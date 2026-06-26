import { supabase } from "../lib/supabase"

export async function cleanupExpiredProjects(): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: expiredProjects } = await supabase
    .from("projects")
    .select("id")
    .eq("is_deleted", true)
    .lt("deleted_at", thirtyDaysAgo)

  if (!expiredProjects || expiredProjects.length === 0) return 0

  const ids = expiredProjects.map((p: { id: string }) => p.id)

  await supabase.from("tracks").delete().in("project_id", ids)
  await supabase.from("projects").delete().in("id", ids)

  return ids.length
}
