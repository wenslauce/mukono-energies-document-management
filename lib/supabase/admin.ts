import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { getDatabaseErrorDetails } from "@/lib/utils"

// Supabase credentials with service role key
const supabaseUrl = "https://grftgdsjwrxpuoekesub.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZnRnZHNqd3J4cHVvZWtlc3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjIyMjcxNywiZXhwIjoyMDU3Nzk4NzE3fQ.-FilG7hk398WVdNIzClKm-SuO7ctaFwNrzMQnqkHkXQ"

// Create the admin client with service role key
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

/**
 * Creates a user profile bypassing RLS
 */
export async function createUserProfileAdmin(userId: string, email: string, fullName: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        email: email || "",
        full_name: fullName || "User",
        role: "manager",
        default_currency: "UGX"
      })
      .select()

    if (error) {
      console.error("Admin API error creating profile:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Unexpected error in admin API:", error)
    return { success: false, error }
  }
}

/**
 * Creates user settings bypassing RLS
 */
export async function createUserSettingsAdmin(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("settings")
      .insert({
        user_id: userId,
        default_tax_rate: 18,
        default_currency: "UGX",
        auto_numbering: true,
      })
      .select()

    if (error) {
      console.error("Admin API error creating settings:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Unexpected error in admin API:", error)
    return { success: false, error }
  }
}

/**
 * Creates a document with items bypassing RLS
 */
export async function createDocumentWithItemsAdmin(
  documentData: Partial<Database["public"]["Tables"]["documents"]["Insert"]>,
  items: Array<Omit<Database["public"]["Tables"]["document_items"]["Insert"], "document_id">>
) {
  try {
    // Step 1: Insert the document
    const { data: documentResult, error: documentError } = await supabaseAdmin
      .from("documents")
      .insert(documentData)
      .select()

    if (documentError) {
      console.error("Admin API error creating document:", documentError)
      return { success: false, error: documentError }
    }

    if (!documentResult || documentResult.length === 0) {
      return { success: false, error: new Error("No document data returned") }
    }

    const documentId = documentResult[0].id

    // Step 2: Insert all items
    for (const item of items) {
      const { error: itemError } = await supabaseAdmin
        .from("document_items")
        .insert({
          ...item,
          document_id: documentId
        })

      if (itemError) {
        console.error("Admin API error creating document item:", itemError)
        return { success: false, error: itemError }
      }
    }

    return { 
      success: true, 
      data: { 
        document: documentResult[0],
        documentId 
      } 
    }
  } catch (error) {
    console.error("Unexpected error in admin API:", error)
    return { success: false, error }
  }
}

/**
 * Tests database connections and reports status
 */
export async function testDatabaseConnectionAdmin() {
  try {
    // Test basic query to ensure connection works
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("count")
      .limit(1)
      .single()

    if (error) {
      console.error("Database connection test failed:", getDatabaseErrorDetails(error))
      return { 
        success: false, 
        error,
        message: `Connection test failed: ${getDatabaseErrorDetails(error)}`
      }
    }

    return { 
      success: true, 
      message: "Database connection successful with service role" 
    }
  } catch (error) {
    console.error("Unexpected error testing connection:", error)
    return { 
      success: false, 
      error,
      message: `Connection error: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * Diagnoses common Supabase issues
 */
export async function diagnoseDatabaseIssues(userId?: string) {
  const issues = [] as string[]
  let hasIssues = false

  try {
    // 1. Check basic connection
    const connectionTest = await testDatabaseConnectionAdmin()
    if (!connectionTest.success) {
      issues.push(`Database connection issue: ${connectionTest.message}`)
      hasIssues = true
    }

    // 2. If we have a userId, check if profile exists
    if (userId) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single()

      if (profileError) {
        if (profileError.code === "PGRST116") {
          issues.push(`User profile missing for ID: ${userId}`)
        } else {
          issues.push(`Profile access error: ${getDatabaseErrorDetails(profileError)}`)
        }
        hasIssues = true
      }
    }

    // 3. Check if tables exist
    const tables = ["profiles", "documents", "document_items", "settings"]
    
    for (const table of tables) {
      const { error: tableError } = await supabaseAdmin
        .from(table)
        .select("count")
        .limit(1)

      if (tableError) {
        issues.push(`Table '${table}' issue: ${getDatabaseErrorDetails(tableError)}`)
        hasIssues = true
      }
    }

    return {
      success: !hasIssues,
      issues,
      message: hasIssues 
        ? `Found ${issues.length} issues with database` 
        : "No database issues detected"
    }
  } catch (error) {
    console.error("Diagnostic error:", error)
    return {
      success: false,
      issues: [`Diagnostic error: ${error instanceof Error ? error.message : String(error)}`],
      message: "Error running database diagnostics"
    }
  }
}

/**
 * Updates a document and its items bypassing RLS
 */
export async function updateDocumentWithItemsAdmin(
  documentId: string,
  documentData: Partial<Database["public"]["Tables"]["documents"]["Update"]>,
  items: Array<Partial<Database["public"]["Tables"]["document_items"]["Insert"]> & { id?: string }>
) {
  try {
    // Step 1: Update the document
    const { data: documentResult, error: documentError } = await supabaseAdmin
      .from("documents")
      .update(documentData)
      .eq("id", documentId)
      .select()

    if (documentError) {
      console.error("Admin API error updating document:", documentError)
      return { success: false, error: documentError }
    }

    if (!documentResult || documentResult.length === 0) {
      return { success: false, error: new Error("No document data returned") }
    }

    // Step 2: Handle items - update existing, insert new, delete removed
    // First, get existing items
    const { data: existingItems, error: fetchError } = await supabaseAdmin
      .from("document_items")
      .select("id")
      .eq("document_id", documentId)

    if (fetchError) {
      console.error("Admin API error fetching existing items:", fetchError)
      return { success: false, error: fetchError }
    }

    // Create a map of existing item IDs
    const existingItemIds = new Set((existingItems || []).map(item => item.id))
    
    // Track which items we're keeping
    const keepingItemIds = new Set()

    // Step 3: Update or insert items
    for (const item of items) {
      if (item.id && existingItemIds.has(item.id)) {
        // Update existing item
        keepingItemIds.add(item.id)
        const { error: updateError } = await supabaseAdmin
          .from("document_items")
          .update({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            discount_rate: item.discount_rate,
            discount_amount: item.discount_amount,
            amount: item.amount
          })
          .eq("id", item.id)

        if (updateError) {
          console.error("Admin API error updating item:", updateError)
          return { success: false, error: updateError }
        }
      } else {
        // Insert new item
        const { data: newItem, error: insertError } = await supabaseAdmin
          .from("document_items")
          .insert({
            ...item,
            document_id: documentId
          })
          .select()

        if (insertError) {
          console.error("Admin API error inserting item:", insertError)
          return { success: false, error: insertError }
        }
        
        if (newItem && newItem.length > 0) {
          keepingItemIds.add(newItem[0].id)
        }
      }
    }

    // Step 4: Delete items that were removed
    const itemsToDelete = Array.from(existingItemIds).filter(id => !keepingItemIds.has(id))
    
    if (itemsToDelete.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("document_items")
        .delete()
        .in("id", itemsToDelete)

      if (deleteError) {
        console.error("Admin API error deleting items:", deleteError)
        return { success: false, error: deleteError }
      }
    }

    return { 
      success: true, 
      data: { 
        documentId, 
        updatedItems: items.length,
        deletedItems: itemsToDelete.length
      } 
    }
  } catch (error) {
    console.error("Unexpected error in admin API:", error)
    return { success: false, error }
  }
}

/**
 * Creates a customer bypassing RLS
 */
export async function createCustomerAdmin(
  customerData: Partial<Database["public"]["Tables"]["customers"]["Insert"]>
) {
  try {
    // Insert the customer with service role
    const { data, error } = await supabaseAdmin
      .from("customers")
      .insert(customerData)
      .select()

    if (error) {
      console.error("Admin API error creating customer:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Unexpected error in admin API:", error)
    return { success: false, error }
  }
}

export { supabaseAdmin }