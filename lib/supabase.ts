import { createBrowserClient } from "@supabase/ssr"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hxuaokwrmindawoxzwxi.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4dWFva3dybWluZGF3b3h6d3hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwOTE5NDAsImV4cCI6MjA2NzY2Nzk0MH0.xKV2zuW-uGaIxN7BTamhiQimw9iQu4OdEtcn79wkE-A",
    )
  }
  return supabaseClient
}
