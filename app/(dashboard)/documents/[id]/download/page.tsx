import { Metadata } from "next"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DocumentDownloadClient from "./document-download-client"

export const metadata: Metadata = {
  title: "Download Document",
  description: "Download a document as PDF",
}

export default async function DocumentDownloadPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createServerSupabaseClient()
  
  // Get session to check authentication
  const { data: { session } } = await supabase.auth.getSession()
  
  // Redirect to login if not authenticated
  if (!session) {
    redirect("/login")
  }
  
  // Check if document exists and belongs to the user
  const { data: document } = await supabase
    .from("documents")
    .select("id")
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .single()
    
  // If document doesn't exist or doesn't belong to the user, redirect to documents page
  if (!document) {
    redirect("/documents")
  }
  
  return <DocumentDownloadClient id={params.id} />
}

