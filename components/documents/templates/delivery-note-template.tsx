"use client"
import { format } from "date-fns"
import type { Database } from "@/types/supabase"
import { formatCurrency } from "@/lib/utils"
import { PaymentDetails } from "../payment-details"
import Image from "next/image"
import { useState } from "react"
import { formatTaxRate, getTaxAmount, DEFAULT_PAYMENT_INSTRUCTIONS } from "../template-selector"

type Document = Database["public"]["Tables"]["documents"]["Row"]
type DocumentItem = Database["public"]["Tables"]["document_items"]["Row"]
interface DeliveryNoteTemplateProps {
  document: Document
  items: DocumentItem[]
  companyLogo?: string | null
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  signature?: string | null
}

export function DeliveryNoteTemplate({
  document,
  items,
  companyLogo,
  companyName = "Mukono Energies",
  companyAddress = "Mukono Industrial Area.\nPlot9 Njogezi Close",
  companyPhone = "+256756983872",
  companyEmail,
  signature,
}: DeliveryNoteTemplateProps) {
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
  
  // Get reference information
  const orderNumber = data.order_number || data.reference || ""
  const invoiceNumber = data.invoice_number || ""

  return (
    <div className="font-sans text-black p-10 leading-relaxed">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-12">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold uppercase tracking-tight text-gray-800 mb-1">DELIVERY NOTE</h1>
          <p className="text-xl font-semibold text-gray-700">{document.document_number}</p>
          <div className="w-20 h-1 bg-primary mt-2"></div>
        </div>
        
        <div className="text-right">
          <LogoComponent />
          <h3 className="text-xl font-semibold text-gray-800">{companyName}</h3>
          <p className="text-gray-600 whitespace-pre-line mt-1">{companyAddress}</p>
          <p className="text-gray-600 mt-1">{companyPhone}</p>
          {companyEmail && <p className="text-gray-600 mt-1">{companyEmail}</p>}
        </div>
      </div>

      {/* Customer and Delivery Details Section */}
      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="space-y-2 bg-gray-50 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold text-gray-700 mb-3 uppercase tracking-wide">Deliver To:</h2>
          <p className="font-medium text-lg">{customerName}</p>
          {customerEmail && <p className="text-gray-600">{customerEmail}</p>}
          {data.delivery_address ? (
            <p className="whitespace-pre-line text-gray-600 mt-2">{data.delivery_address}</p>
          ) : (
            customerAddress && <p className="whitespace-pre-line text-gray-600 mt-2">{customerAddress}</p>
          )}
          {customerPhone && <p className="text-gray-600">{customerPhone}</p>}
        </div>
        
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold text-gray-700 mb-3 uppercase tracking-wide text-right">Delivery Details:</h2>
          <div className="grid grid-cols-2 gap-2">
            <p className="font-semibold text-gray-700 text-right">Delivery Date:</p>
            <p className="text-right">{format(new Date(document.issue_date), "dd/MM/yyyy")}</p>
            
            {orderNumber && (
              <>
                <p className="font-semibold text-gray-700 text-right">Order Reference:</p>
                <p className="text-right">{orderNumber}</p>
              </>
            )}
            
            {invoiceNumber && (
              <>
                <p className="font-semibold text-gray-700 text-right">Invoice Number:</p>
                <p className="text-right">{invoiceNumber}</p>
              </>
            )}
            
            {data.carrier && (
              <>
                <p className="font-semibold text-gray-700 text-right">Carrier:</p>
                <p className="text-right">{data.carrier}</p>
              </>
            )}
            
            {data.tracking_number && (
              <>
                <p className="font-semibold text-gray-700 text-right">Tracking No:</p>
                <p className="text-right">{data.tracking_number}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-12 overflow-x-auto">
        <table className="w-full border-collapse table-pdf">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="py-4 px-6 border-b-2 border-gray-200 font-bold text-gray-700 uppercase tracking-wider">#</th>
              <th className="py-4 px-6 border-b-2 border-gray-200 font-bold text-gray-700 uppercase tracking-wider">Description</th>
              <th className="py-4 px-6 border-b-2 border-gray-200 font-bold text-gray-700 uppercase tracking-wider text-right">Qty</th>
              {data.show_prices && (
                <>
                  <th className="py-4 px-6 border-b-2 border-gray-200 font-bold text-gray-700 uppercase tracking-wider text-right">Unit Price</th>
                  <th className="py-4 px-6 border-b-2 border-gray-200 font-bold text-gray-700 uppercase tracking-wider text-right">Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="py-4 px-6 border-b border-gray-200">{index + 1}</td>
                <td className="py-4 px-6 border-b border-gray-200">
                  <div>
                    <p className="font-medium">{item.description}</p>
                  </div>
                </td>
                <td className="py-4 px-6 border-b border-gray-200 text-right">{item.quantity}</td>
                {data.show_prices && (
                  <>
                    <td className="py-4 px-6 border-b border-gray-200 text-right">
                      {formatCurrency(item.unit_price, document.currency)}
                    </td>
                    <td className="py-4 px-6 border-b border-gray-200 text-right font-medium">
                      {formatCurrency(item.amount, document.currency)}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section - Only show if prices are shown */}
      {data.show_prices && (
        <div className="flex justify-end mb-12">
          <div className="w-96 bg-gray-50 rounded-lg shadow-sm p-6">
            <div className="flex justify-between py-3 border-t-2 border-gray-300">
              <p className="text-xl font-bold text-gray-800">Total:</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(document.total_amount, document.currency)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Notes Section */}
      {document.notes && (
        <div className="mb-8 bg-gray-50 p-6 rounded-lg">
          <h2 className="text-lg font-bold text-gray-700 mb-3 uppercase tracking-wide">Notes</h2>
          <p className="whitespace-pre-line text-gray-700">{document.notes}</p>
        </div>
      )}

      {/* Recipient Signature Section */}
      <div className="mt-16 grid grid-cols-2 gap-16">
        <div className="border-t-2 border-gray-400 pt-2">
          <p className="text-sm text-gray-600">Received By (Signature & Date)</p>
        </div>
        
        {signature && (
          <div className="border-t-2 border-gray-400 pt-2">
            <p className="text-sm text-gray-600">Authorized Signature</p>
          </div>
        )}
      </div>
    </div>
  )
}








