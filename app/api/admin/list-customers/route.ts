import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { PostgrestError } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    // Verify the user is authenticated
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    
    // Fetch customers using the admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from("customers")
      .select("id, name, email, phone, address, city, country, tax_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("name")

    if (error) {
      console.error("Error fetching customers with admin client:", error)
      const errorMessage = error instanceof PostgrestError 
        ? error.message 
        : "Failed to fetch customers"
      
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error in list-customers API route:", error)
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
} 