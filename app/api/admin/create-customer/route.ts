import { NextResponse } from "next/server"
import { createCustomerAdmin } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { PostgrestError } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    // Verify the user is authenticated
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get customer data from request
    const customerData = await request.json()
    
    // Ensure user_id is set
    if (!customerData.user_id) {
      customerData.user_id = session.user.id
    }

    // Create customer using admin service role to bypass RLS
    const { success, data, error } = await createCustomerAdmin(customerData)

    if (!success) {
      console.error("Error creating customer via admin API:", error)
      const errorMessage = error instanceof PostgrestError 
        ? error.message 
        : "Failed to create customer"
      
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("Error in create-customer API route:", error)
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    )
  }
} 