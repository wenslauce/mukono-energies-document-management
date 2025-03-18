"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/components/ui/use-toast"
import { DocumentViewer } from "@/components/documents/document-viewer"
import { Button } from "@/components/ui/button"
import { Loader2, Download, ArrowLeft } from "lucide-react"
import type { Database } from "@/types/supabase"
import { imageUtils } from "@/lib/utils"

type Document = Database["public"]["Tables"]["documents"]["Row"]
type DocumentItem = Database["public"]["Tables"]["document_items"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

interface DocumentDownloadClientProps {
  id: string
}

export default function DocumentDownloadClient({ id }: DocumentDownloadClientProps) {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()
  const documentRef = useRef<HTMLDivElement>(null)
  
  const [document, setDocument] = useState<Document | null>(null)
  const [items, setItems] = useState<DocumentItem[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [downloadAttempts, setDownloadAttempts] = useState(0)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [logoLoaded, setLogoLoaded] = useState(false)

  // Load data on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !sessionData.session) {
          router.push("/login")
          return
        }

        // Fetch profile data
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single()
          
        setProfile(profileData)

        // Fetch the document
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .eq("id", id)
          .single()
          
        if (error || !data) {
          toast({
            title: "Error",
            description: "Document not found",
            variant: "destructive",
          })
          router.push("/documents")
          return
        }
        
        setDocument(data)

        // Fetch document items
        const { data: itemsData, error: itemsError } = await supabase
          .from("document_items")
          .select("*")
          .eq("document_id", id)
          .order("id")
          
        if (itemsError) {
          console.error("Error fetching document items:", itemsError)
        } else {
          setItems(itemsData || [])
        }

        // Preload logo
        await preloadLogo(profileData?.company_logo || "/logo.png")
      } catch (error) {
        console.error("Error fetching document:", error)
        toast({
          title: "Error",
          description: "Failed to load document",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [id, router, supabase, toast])

  // Preload the logo image
  const preloadLogo = async (logoUrl: string) => {
    try {
      await imageUtils.preloadImage(logoUrl)
      setLogoLoaded(true)
    } catch (error) {
      console.error("Error preloading logo:", error)
      // Continue anyway as we have fallbacks
      setLogoLoaded(true)
    }
  }

  // Trigger download automatically when component is ready
  useEffect(() => {
    if (!loading && document && items.length > 0 && logoLoaded && !downloading && downloadAttempts < 3) {
      // Wait a bit for rendering before downloading
      const timer = setTimeout(() => {
        triggerDownload()
      }, 1500)
      
      return () => clearTimeout(timer)
    }
  }, [loading, document, items, logoLoaded, downloading, downloadAttempts])

  const triggerDownload = async () => {
    if (!documentRef.current || !document) return
    
    setDownloading(true)
    setDownloadError(null)
    
    try {
      // Find and click the PDF download button
      const pdfButton = documentRef.current.querySelector('button')
      
      if (pdfButton) {
        pdfButton.click()
        setDownloadAttempts(prev => prev + 1)
        
        // After a delay, redirect back to document view
        setTimeout(() => {
          router.push(`/documents/${id}`)
        }, 3000)
      } else {
        setDownloadError('PDF download button not found')
        setDownloading(false)
      }
    } catch (error) {
      console.error('Download error:', error)
      setDownloadError(`Failed to download: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p>Loading document for download...</p>
        </div>
      </div>
    )
  }

  if (!document) {
    return null
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="fixed top-0 left-0 right-0 bg-background z-50 p-4 border-b shadow-sm">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => router.push(`/documents/${id}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Document</span>
          </Button>
          
          <div className="flex items-center gap-2">
            {downloading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Generating PDF...</span>
              </div>
            ) : (
              <Button 
                onClick={triggerDownload}
                className="flex items-center gap-2"
                disabled={downloadAttempts >= 3}
              >
                <Download className="h-4 w-4" />
                <span>{downloadAttempts >= 3 ? 'Download Failed' : 'Download Now'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {downloadError && (
        <div className="fixed top-16 left-0 right-0 bg-destructive/10 text-destructive p-4 z-50">
          <div className="max-w-screen-xl mx-auto">
            <p>Error: {downloadError}</p>
            <p className="text-sm mt-1">Try clicking the "Download Now" button manually, or go back to the document page.</p>
          </div>
        </div>
      )}
      
      <div className="mt-20 pb-10 px-4 max-w-screen-xl mx-auto w-full">
        <div ref={documentRef} className="bg-white mx-auto max-w-4xl">
          <DocumentViewer
            document={document}
            items={items}
            profile={profile}
          />
        </div>
      </div>
    </div>
  )
} 