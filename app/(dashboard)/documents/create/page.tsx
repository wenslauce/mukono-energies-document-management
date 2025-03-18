"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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

export default function CreateDocumentPage() {
  const searchParams = useSearchParams()
  const initialType = searchParams.get("type") || "invoice"
  const [documentType, setDocumentType] = useState(initialType)
  const router = useRouter()
  const { supabase, user } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const checkUser = async () => {
      try {
        if (!user) {
          router.push("/login")
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error("Error checking user:", error)
        toast({
          title: "Authentication Error",
          description: "Please try logging in again",
          variant: "destructive",
        })
        router.push("/login")
      }
    }

    checkUser()
  }, [user, router, toast])

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Create Document</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Document</CardTitle>
          <CardDescription>Create a new document by selecting a type and filling in the details</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={documentType} onValueChange={setDocumentType}>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
              <TabsTrigger value="invoice">Invoice</TabsTrigger>
              <TabsTrigger value="receipt">Receipt</TabsTrigger>
              <TabsTrigger value="quote">Quote</TabsTrigger>
              <TabsTrigger value="credit_note">Credit Note</TabsTrigger>
              <TabsTrigger value="purchase_order">Purchase Order</TabsTrigger>
              <TabsTrigger value="delivery_note">Delivery Note</TabsTrigger>
            </TabsList>
            <TabsContent value="invoice" className="mt-6">
              <InvoiceForm />
            </TabsContent>
            <TabsContent value="receipt" className="mt-6">
              <ReceiptForm />
            </TabsContent>
            <TabsContent value="quote" className="mt-6">
              <QuoteForm />
            </TabsContent>
            <TabsContent value="credit_note" className="mt-6">
              <CreditNoteForm />
            </TabsContent>
            <TabsContent value="purchase_order" className="mt-6">
              <PurchaseOrderForm />
            </TabsContent>
            <TabsContent value="delivery_note" className="mt-6">
              <DeliveryNoteForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

