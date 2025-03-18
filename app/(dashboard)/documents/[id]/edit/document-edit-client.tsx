"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase/provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { InvoiceForm } from "@/components/documents/invoice-form"
import { ReceiptForm } from "@/components/documents/receipt-form"
import { QuoteForm } from "@/components/documents/quote-form"
import { CreditNoteForm } from "@/components/documents/credit-note-form"
import { PurchaseOrderForm } from "@/components/documents/purchase-order-form"
import { DeliveryNoteForm } from "@/components/documents/delivery-note-form"
import { Loader2 } from "lucide-react"

interface DocumentEditClientProps {
  documentId: string
}

export default function DocumentEditClient({ documentId }: DocumentEditClientProps) {
  const [document, setDocument] = useState<any>(null)
  const [documentItems, setDocumentItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const { supabase, user } = useSupabase()
  const { toast } = useToast()

  useEffect(() => {
    // Check if user is authenticated and fetch document data
    const fetchData = async () => {
      try {
        if (!user) {
          router.push("/login")
          return
        }

        // Fetch document
        const { data: documentData, error: documentError } = await supabase
          .from("documents")
          .select("*")
          .eq("id", documentId)
          .eq("user_id", user.id)
          .single()

        if (documentError) {
          throw new Error(`Error fetching document: ${documentError.message}`)
        }

        if (!documentData) {
          throw new Error("Document not found")
        }

        // Fetch document items
        const { data: itemsData, error: itemsError } = await supabase
          .from("document_items")
          .select("*")
          .eq("document_id", documentId)
          .order("created_at", { ascending: true })

        if (itemsError) {
          throw new Error(`Error fetching document items: ${itemsError.message}`)
        }

        setDocument(documentData)
        setDocumentItems(itemsData || [])
        setLoading(false)
      } catch (error: any) {
        console.error("Error:", error)
        setError(error.message)
        setLoading(false)
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      }
    }

    fetchData()
  }, [user, documentId, router, supabase, toast])

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold text-destructive">Error Loading Document</h2>
        <p>{error}</p>
      </div>
    )
  }

  // Format items for the form
  const formattedItems = documentItems.map(item => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    tax: item.tax_rate,
    amount: item.amount
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit Document</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit {document.type.replace("_", " ")}</CardTitle>
          <CardDescription>Update the document details</CardDescription>
        </CardHeader>
        <CardContent>
          {document.type === "invoice" && (
            <InvoiceForm isEditing={true} existingDocument={document} existingItems={formattedItems} />
          )}
          {document.type === "receipt" && (
            <ReceiptForm isEditing={true} existingDocument={document} existingItems={formattedItems} />
          )}
          {document.type === "quote" && (
            <QuoteForm isEditing={true} existingDocument={document} existingItems={formattedItems} />
          )}
          {document.type === "credit_note" && (
            <CreditNoteForm isEditing={true} existingDocument={document} existingItems={formattedItems} />
          )}
          {document.type === "purchase_order" && (
            <PurchaseOrderForm isEditing={true} existingDocument={document} existingItems={formattedItems} />
          )}
          {document.type === "delivery_note" && (
            <DeliveryNoteForm isEditing={true} existingDocument={document} existingItems={formattedItems} />
          )}
        </CardContent>
      </Card>
    </div>
  )
} 