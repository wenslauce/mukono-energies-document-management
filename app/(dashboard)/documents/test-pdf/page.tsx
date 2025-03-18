import { Metadata } from "next"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import TestPdfClient from "./test-pdf-client"

export const metadata: Metadata = {
  title: "Test PDF Generation",
  description: "Debug and test PDF generation capabilities",
}

export default async function TestPdfPage() {  
  const supabase = await createServerSupabaseClient()
  
  // Get session to check authentication
  const { data: { session } } = await supabase.auth.getSession()
  
  // Redirect to login if not authenticated
  if (!session) {
    redirect("/login")
  }
  
  // Get the first document for testing
  const { data: document } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()
    
  if (!document) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold">No documents found</h1>
        <p className="mt-2">Create a document first to test PDF generation</p>
      </div>
    )
  }
  
  // Get the document items
  const { data: items } = await supabase
    .from("document_items")
    .select("*")
    .eq("document_id", document.id)
    
  // Get the user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single()
    
  return (
    <div className="container py-10">
      <TestPdfClient 
        document={document} 
        items={items || []}
        profile={profile || null}
      />
    </div>
  )
} 