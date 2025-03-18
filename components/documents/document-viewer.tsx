"use client"

import { useRef } from "react"
import type { Database } from "@/types/supabase"
import { DocumentPDF } from "./document-pdf"
import { cn } from "@/lib/utils"
import { DocumentTemplateSelector } from "./document-template-selector"

type Document = Database["public"]["Tables"]["documents"]["Row"]
type DocumentItem = Database["public"]["Tables"]["document_items"]["Row"]

interface DocumentViewerProps {
  document: Document
  items: DocumentItem[]
  profile?: Database["public"]["Tables"]["profiles"]["Row"] | null
  className?: string
}

export function DocumentViewer({ document, items, profile, className }: DocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex justify-end">
        <DocumentPDF
          documentId={document.id}
          documentType={document.type}
          documentNumber={document.document_number}
          containerRef={containerRef}
        />
      </div>
      <div 
        ref={containerRef} 
        className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-none document-container for-pdf-export"
        style={{ minHeight: "842px", width: "100%" }}
      >
        <DocumentTemplateSelector
          document={document}
          items={items}
          companyLogo={profile?.company_logo || "/logo.png"}
          companyName={profile?.company_name || undefined}
          companyAddress={profile?.company_address || undefined}
          companyPhone={profile?.company_phone || undefined}
          companyEmail={profile?.company_email || undefined}
          signature={profile?.signature || undefined}
        />
      </div>
    </div>
  )
} 