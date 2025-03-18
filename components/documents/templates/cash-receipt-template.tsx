"use client"
import { format } from "date-fns"
import type { Database } from "@/types/supabase"
import { formatCurrency } from "@/lib/utils"
import { PaymentDetails } from "../payment-details"
import Image from "next/image"
import { useState } from "react"
import { formatTaxRate, getTaxAmount } from "../template-selector"

type Document = Database["public"]["Tables"]["documents"]["Row"]
type DocumentItem = Database["public"]["Tables"]["document_items"]["Row"]
interface CashReceiptTemplateProps {
  document: Document
  items: DocumentItem[]
  companyLogo?: string | null
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  signature?: string | null
}
export function CashReceiptTemplate({
  document,
  items,
  companyLogo,
  companyName = "Mukono Energies",
  companyAddress = "Mukono Industrial Area.\nPlot9 Njogezi Close",
  companyPhone = "+256756983872",
  companyEmail,
  signature,
}: CashReceiptTemplateProps) {
  const data = document.data as any
  const [logoError, setLogoError] = useState(false)
  
  // Handle logo loading errors
  const handleLogoError = () => {
    console.error("Failed to load logo image")
    setLogoError(true)
  }

  // Logo component with error handling
  const LogoComponent = () => {
    if (logoError) {
      return (
        <div className="h-[80px] w-[200px] bg-gray-100 flex items-center justify-center rounded">
          <span className="text-gray-500 font-medium">{companyName}</span>
        </div>
      )
    }
    
    return (
      <div className="relative h-[100px] logo mb-4 ml-auto">
        <Image 
          src={companyLogo || "/logo.png"}
          alt={companyName}
          fill
          className="object-contain object-right"
          priority
          sizes="(max-width: 768px) 150px, 200px"
          unoptimized
          onError={handleLogoError}
          crossOrigin="anonymous"
        />
      </div>
    )
  }

  // Get properly formatted tax rate
  const taxRateFormatted = formatTaxRate(document)
  
  // Extract customer information - ensure we handle all possible data structures
  const customerName = data.customer_name || document.customer_name || ""
  const customerEmail = data.customer_email || ""
  const customerAddress = data.customer_address || ""
  const customerPhone = data.customer_phone || ""
  const customerTaxId = data.customer_tax_id || ""

  return (
    <div className="font-sans text-black p-10 leading-relaxed">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase">CASH RECEIPT</h1>
          <p className="text-lg">{document.document_number}</p>
        </div>
        <div className="text-right">
          <LogoComponent />
          {companyAddress && <p className="whitespace-pre-line">{companyAddress}</p>}
          {companyPhone && <p>Tel: {companyPhone}</p>}
          {companyEmail && <p>{companyEmail}</p>}
        </div>
      </div>
      <div className="mt-8 border-2 border-gray-300 p-4 rounded-md">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="font-bold">Received From:</h3>
            <p className="font-bold">{document.customer_name}</p>
            {customerEmail && <p>{customerEmail}</p>}
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="font-bold">Receipt Number:</span>
                <span>{document.document_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Date:</span>
                <span>{format(new Date(document.issue_date), "PPP")}</span>
              </div>
              <div className="flex justify-between">
                <p className="font-semibold text-gray-700 text-right">Tax Rate:</p>
                <p className="text-right">{taxRateFormatted}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <div className="font-bold">Amount:</div>
          <div className="text-2xl font-bold">{formatCurrency(document.total_amount, document.currency)}</div>
        </div>
        <div className="mt-4">
          <div className="font-bold">Amount in Words:</div>
          <div className="border-b border-gray-300 py-2">{data.amount_in_words || ""}</div>
        </div>
        <div className="mt-4">
          <div className="font-bold">For Payment Of:</div>
          <div className="border-b border-gray-300 py-2">{items.map((item) => item.description).join(", ")}</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-8">
          <div>
            <div className="font-bold">Payment Method:</div>
            <div className="border-b border-gray-300 py-2">{data.payment_method || "Cash"}</div>
          </div>
          {data.reference && (
            <div>
              <div className="font-bold">Reference:</div>
              <div className="border-b border-gray-300 py-2">{data.reference}</div>
            </div>
          )}
        </div>
      </div>
      {document.notes && (
        <div className="mt-8">
          <h3 className="font-bold">Notes:</h3>
          <p className="whitespace-pre-line">{document.notes}</p>
        </div>
      )}
      <PaymentDetails />
      <div className="mt-8 grid grid-cols-2 gap-8">
        <div className="flex flex-col items-start">
          <p className="font-bold">Received By:</p>
          {signature ? (
            <img src={signature || "/placeholder.svg"} alt="Signature" className="h-16 mt-2" />
          ) : (
            <div className="h-16 w-40 mt-2 border-b border-black"></div>
          )}
        </div>
        <div className="flex flex-col items-end">
          <p className="font-bold">Customer Signature:</p>
          <div className="h-16 w-40 mt-2 border-b border-black"></div>
        </div>
      </div>
      <div className="mt-8 border-t border-gray-300 pt-4 text-center text-sm text-gray-500">
        <p>Thank you for your payment!</p>
      </div>
    </div>
  )
}





