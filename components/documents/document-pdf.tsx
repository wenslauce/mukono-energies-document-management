"use client"
import { format } from "date-fns"
import type { Database } from "@/types/supabase"
import { PaymentDetails } from "./payment-details"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import { useToast } from "@/components/ui/use-toast"
import { useSupabase } from "@/lib/supabase/provider"
import { useRouter, useSearchParams } from "next/navigation"
import { imageUtils } from "@/lib/utils"

type Document = Database["public"]["Tables"]["documents"]["Row"]

interface DocumentPDFProps {
  documentId?: string
  documentType: string
  documentNumber: string
  containerRef?: React.RefObject<HTMLDivElement | null>
}

export function DocumentPDF({ documentId, documentType, documentNumber, containerRef: externalRef }: DocumentPDFProps) {
  const [downloading, setDownloading] = useState(false)
  const [pdfDebug, setPdfDebug] = useState<string | null>(null)
  const { toast } = useToast()
  const { supabase } = useSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const internalRef = useRef<HTMLDivElement | null>(null)

  // Use the containerRef provided, or fall back to the internal ref
  const containerRef = externalRef || internalRef

  // Check if we should automatically download based on URL parameter
  useEffect(() => {
    const shouldDownload = searchParams.get('download') === 'true'
    if (shouldDownload && !downloading) {
      downloadPdf()
    }
  }, [searchParams])

  // Update document status to "downloaded" if we have a documentId
  const updateDocumentStatus = async () => {
    if (!documentId) return
    
    try {
      // Only mark as downloaded if it's an invoice and not yet paid
      const { data: document } = await supabase
        .from("documents")
        .select("status, type")
        .eq("id", documentId)
        .single()
      
      if (!document) return
      
      // Only update status if it's an invoice-type document
      if (["invoice", "tax_invoice", "proforma_invoice"].includes(document.type) && document.status !== "paid") {
        await supabase
          .from("documents")
          .update({ status: "sent" })
          .eq("id", documentId)
      }
    } catch (error) {
      console.error("Error updating document status:", error)
    }
  }

  const downloadPdf = async () => {
    // If we don't have a containerRef, we're likely handling a download directly
    if (!containerRef?.current && documentId) {
      router.push(`/documents/${documentId}`)
      return
    }
    
    if (!containerRef?.current) {
      toast({
        title: "Error",
        description: "Could not generate PDF. Document container not found.",
        variant: "destructive",
      })
      return
    }

    setDownloading(true)
    setPdfDebug(null)
    
    try {
      const container = containerRef.current
      
      // Add PDF generation classes and show watermark
      container.classList.add('for-pdf-export')
      
      // Log for debugging
      console.log("Starting PDF generation process")
      
      // Preload all images before capturing
      console.log("Preloading images...")
      await imageUtils.loadAllImages(container)
      
      // Make sure watermarks are visible
      const watermarks = container.querySelectorAll('.pdf-watermark')
      watermarks.forEach((watermark) => {
        const element = watermark as HTMLElement
        element.style.display = 'flex'
        element.style.opacity = '0.1'
        element.style.zIndex = '10'
        element.style.pointerEvents = 'none'
      })
      
      // Create a clone of the container to avoid modifying the original
      const containerClone = container.cloneNode(true) as HTMLElement
      document.body.appendChild(containerClone)
      containerClone.style.position = 'absolute'
      containerClone.style.left = '-9999px'
      containerClone.style.transform = 'none'
      
      // Add a style element to the cloned container to ensure proper rendering
      const styleElement = document.createElement('style')
      styleElement.textContent = `
        .pdf-watermark {
          display: flex !important;
          opacity: 0.1 !important;
          z-index: 100 !important;
          pointer-events: none !important;
        }
        img {
          max-width: 100%;
          height: auto;
        }
        .logo {
          width: 200px;
          height: auto;
        }
        @page {
          margin: 0;
          size: A4;
        }
        body {
          margin: 0;
          padding: 0;
        }
      `
      containerClone.appendChild(styleElement)
      
      // Force image loading in the clone
      const images = containerClone.querySelectorAll('img')
      await Promise.all(
        Array.from(images).map((img: HTMLImageElement) => {
          return new Promise<void>((resolve) => {
            if (img.complete) {
              resolve()
            } else {
              img.onload = () => resolve()
              img.onerror = () => resolve()
            }
          })
        })
      )
      
      try {
        // A4 dimensions (mm)
        const pageWidth = 210
        const pageHeight = 297
        
        // Create PDF document with better compression
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
          compress: true
        })
        
        // Capture the clone with html2canvas
        const canvas = await html2canvas(containerClone, {
          scale: 3, // Higher scale for better quality
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: "#ffffff",
          imageTimeout: 15000,
          onclone: (clonedDoc) => {
            // Force any background images to load
            Array.from(clonedDoc.querySelectorAll('img')).forEach((img: HTMLImageElement) => {
              img.crossOrigin = "anonymous"
            })
          }
        })
        
        // Calculate dimensions to fit width to A4
        const imgWidth = pageWidth
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        
        // If content fits on one page
        if (imgHeight <= pageHeight) {
          pdf.addImage(
            canvas.toDataURL('image/jpeg', 0.95), 
            'JPEG', 
            0, 0, 
            imgWidth, imgHeight
          )
        } else {
          // For multi-page content
          let heightLeft = imgHeight
          let position = 0
          let pageCount = 0
          
          // Calculate how many pages we need
          const totalPages = Math.ceil(imgHeight / pageHeight)
          
          while (heightLeft > 0) {
            // Add a new page after the first page
            if (pageCount > 0) {
              pdf.addPage()
            }
            
            // Add the image, using a negative position to show the correct portion
            pdf.addImage(
              canvas.toDataURL('image/jpeg', 0.95),
              'JPEG',
              0, position,
              imgWidth, imgHeight
            )
            
            // Reduce height left to print and increase negative position
            heightLeft -= pageHeight
            position -= pageHeight
            pageCount++
          }
        }
        
        // Format document type for filename
        const formattedType = documentType.replace(/_/g, '-')
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const fileName = `${formattedType}-${documentNumber}-${timestamp}.pdf`
        
        // Save the PDF
        pdf.save(fileName)
        
        // Update document status
        if (documentId) {
          await updateDocumentStatus()
        }
        
        toast({
          title: "PDF Generated",
          description: `${fileName} has been downloaded successfully.`,
        })
        
      } catch (canvasError) {
        console.error("Canvas generation error:", canvasError)
        setPdfDebug(`Canvas error: ${canvasError instanceof Error ? canvasError.message : 'Unknown canvas error'}`)
        throw new Error(`PDF canvas generation failed: ${canvasError instanceof Error ? canvasError.message : 'Unknown error'}`)
      } finally {
        // Clean up the clone
        if (document.body.contains(containerClone)) {
          document.body.removeChild(containerClone)
        }
      }
      
      // Remove the export class and restore original styles
      container.classList.remove('for-pdf-export')
      watermarks.forEach((watermark) => {
        const element = watermark as HTMLElement
        element.style.removeProperty('display')
        element.style.removeProperty('opacity')
        element.style.removeProperty('z-index')
      })
      
      // Remove the download parameter from the URL
      if (searchParams.get('download') === 'true') {
        router.replace(window.location.pathname)
      }
      
      // Refresh to reflect changes
      router.refresh()
      
    } catch (error) {
      console.error("PDF generation error:", error)
      setPdfDebug(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      toast({
        title: "PDF Generation Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button 
        onClick={downloadPdf} 
        variant="outline" 
        disabled={downloading}
        className="flex items-center gap-2"
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating PDF...</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </>
        )}
      </Button>
      
      {process.env.NODE_ENV === 'development' && pdfDebug && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
          <div className="font-semibold">PDF Debug:</div>
          <div>{pdfDebug}</div>
        </div>
      )}
    </div>
  )
}

function formatDocumentType(type: string) {
  return type.replace(/_/g, " ")
}

function formatCurrency(amount: number, currency: string) {
  const formatter = new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: "currency",
    currency: currency,
  })

  return formatter.format(amount)
}

function getCurrencyLocale(currency: string) {
  switch (currency) {
    case "KES":
      return "en-KE"
    case "UGX":
      return "en-UG"
    case "USD":
      return "en-US"
    default:
      return "en-US"
  }
}

