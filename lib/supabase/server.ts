import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

// Supabase credentials
const supabaseUrl = "https://grftgdsjwrxpuoekesub.supabase.co"
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZnRnZHNqd3J4cHVvZWtlc3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMjI3MTcsImV4cCI6MjA1Nzc5ODcxN30.SbZ01mDtNCSecHjpjuGhs5cf-A9rEBaLqH7vwZZjhMg"

export async function createServerSupabaseClient() {
  const cookieStore = cookies()
  return createServerComponentClient<Database>({ cookies: () => cookieStore })
}

