import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { sqlite } from "./sqlite"

// Database mode: "sqlite" for local dev, "supabase" for production
const dbMode = process.env.DATABASE_MODE || "sqlite"

// Export a unified client that works the same way in both modes
export const supabase: SupabaseClient = (dbMode === "supabase" ? createSupabaseClient() : sqlite) as unknown as SupabaseClient

function createSupabaseClient(): SupabaseClient {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    "http://localhost:54321"

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    ""

  return createClient(supabaseUrl, supabaseKey)
}

// Export sqlite directly for schema operations
export { sqlite }
