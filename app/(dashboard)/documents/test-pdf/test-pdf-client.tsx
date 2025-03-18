"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DocumentViewer } from "@/components/documents/document-viewer"
import type { Database } from "@/types/supabase"
import { DocumentPDF } from "@/components/documents/document-pdf"
import Image from "next/image"

type Document = Database["public"]["Tables"]["documents"]["Row"]
type DocumentItem = Database["public"]["Tables"]["document_items"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

interface TestPdfClientProps {
  document: Document
  items: DocumentItem[]
  profile: Profile | null
}

export default function TestPdfClient({ document, items, profile }: TestPdfClientProps) {
  const [activeTab, setActiveTab] = useState("preview")
  const documentRef = useRef<HTMLDivElement>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  
  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${info}`])
  }
  
  const checkImageLoading = () => {
    if (!documentRef.current) {
      addDebugInfo("Document reference not found")
      return
    }
    
    const images = documentRef.current.querySelectorAll('img')
    addDebugInfo(`Found ${images.length} images in document`)
    
    images.forEach((img, index) => {
      addDebugInfo(`Image ${index + 1}: ${img.src.substring(0, 50)}... | Complete: ${img.complete} | Natural size: ${img.naturalWidth}x${img.naturalHeight}`)
    })
  }
  
  const testWatermark = () => {
    if (!documentRef.current) {
      addDebugInfo("Document reference not found")
      return
    }
    
    const watermarks = documentRef.current.querySelectorAll('.pdf-watermark')
    addDebugInfo(`Found ${watermarks.length} watermarks in document`)
    
    if (watermarks.length === 0) {
      addDebugInfo("❌ No watermarks found - possible template issue")
    } else {
      // Try to fix watermark display issues
      watermarks.forEach((watermark, index) => {
        const element = watermark as HTMLElement
        element.style.display = 'flex'
        element.style.opacity = '0.2'
        element.style.zIndex = '0'
        addDebugInfo(`✅ Applied display fixes to watermark ${index + 1}`)
      })
    }
  }
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          PDF Generation Test
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={checkImageLoading}>
            Check Images
          </Button>
          <Button variant="outline" onClick={testWatermark}>
            Test Watermark
          </Button>
          <DocumentPDF 
            documentId={document.id}
            documentType={document.type}
            documentNumber={document.document_number}
            containerRef={documentRef}
          />
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="preview">Document Preview</TabsTrigger>
          <TabsTrigger value="debug">Debug Info</TabsTrigger>
          <TabsTrigger value="watermark">Watermark Test</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                ref={documentRef}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 document-container"
              >
                <DocumentViewer 
                  document={document}
                  items={items}
                  profile={profile}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="debug" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded border font-mono text-sm max-h-[400px] overflow-y-auto">
                {debugInfo.length === 0 ? (
                  <p className="text-gray-500">No debug information available. Click "Check Images" or "Test Watermark".</p>
                ) : (
                  debugInfo.map((info, i) => (
                    <div key={i} className="mb-1 border-b border-gray-100 pb-1">{info}</div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="watermark" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Watermark Test</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-[500px] bg-white border rounded-lg p-8">
                <div className="pdf-watermark absolute inset-0 flex items-center justify-center">
                  <div className="relative w-[400px] h-[400px] opacity-20">
                    <Image 
                      src="/logo.png"
                      alt="Watermark test"
                      fill
                      className="object-contain"
                      unoptimized
                      priority
                      sizes="400px"
                    />
                  </div>
                </div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-4">Sample Content</h2>
                  <p className="mb-4">This is a test page to ensure watermarks are displaying correctly. The logo should appear behind this text as a faded watermark.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 