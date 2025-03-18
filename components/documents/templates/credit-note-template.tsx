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
interface CreditNoteTemplateProps {
  document: Document
  items: DocumentItem[]
  companyLogo?: string | null
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  signature?: string | null
}

export function CreditNoteTemplate({
  document,
  items,
  companyLogo,
  companyName = "Mukono Energies",
  companyAddress = "Mukono Industrial Area.\nPlot9 Njogezi Close",
  companyPhone = "+256756983872",
  companyEmail,
  signature,
}: CreditNoteTemplateProps) {
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
  
  // Extract tax amount using helper function
  const taxAmount = getTaxAmount(document)
  
  // Extract customer information - ensure we handle all possible data structures
  const customerName = data.customer_name || document.customer_name || ""
  const customerEmail = data.customer_email || ""
  const customerAddress = data.customer_address || ""
  const customerPhone = data.customer_phone || ""
  const customerTaxId = data.customer_tax_id || ""
  
  // Format the reference invoice information
  const invoiceReference = data.invoice_number || data.reference || ""
  const invoiceDate = data.invoice_date ? format(new Date(data.invoice_date), "dd/MM/yyyy") : ""

  return (
    <div className="font-sans text-black p-10 leading-relaxed">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-12">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold uppercase tracking-tight text-gray-800 mb-1">CREDIT NOTE</h1>
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

      {/* Customer and Credit Note Details Section */}
      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="space-y-2 bg-gray-50 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold text-gray-700 mb-3 uppercase tracking-wide">Credit To:</h2>
          <p className="font-medium text-lg">{customerName}</p>
          {customerEmail && <p className="text-gray-600">{customerEmail}</p>}
          {customerAddress && (
            <p className="whitespace-pre-line text-gray-600 mt-2">{customerAddress}</p>
          )}
          {customerPhone && <p className="text-gray-600">{customerPhone}</p>}
          {customerTaxId && (
            <p className="font-medium mt-2">TIN: {customerTaxId}</p>
          )}
        </div>
        
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold text-gray-700 mb-3 uppercase tracking-wide text-right">Credit Note Details:</h2>
          <div className="grid grid-cols-2 gap-2">
            <p className="font-semibold text-gray-700 text-right">Credit Date:</p>
            <p className="text-right">{format(new Date(document.issue_date), "dd/MM/yyyy")}</p>
            
            {invoiceReference && (
              <>
                <p className="font-semibold text-gray-700 text-right">Original Invoice:</p>
                <p className="text-right">{invoiceReference}</p>
              </>
            )}
            
            {invoiceDate && (
              <>
                <p className="font-semibold text-gray-700 text-right">Invoice Date:</p>
                <p className="text-right">{invoiceDate}</p>
              </>
            )}
            
            {data.reason && (
              <>
                <p className="font-semibold text-gray-700 text-right">Reason:</p>
                <p className="text-right">{data.reason}</p>
              </>
            )}
            
            <p className="font-semibold text-gray-700 text-right">Tax Rate:</p>
            <p className="text-right">{taxRateFormatted}</p>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-12 overflow-x-auto">
        <table className="w-full border-collapse table-pdf">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="py-4 px-6 border-b-2 border-gray-200 font-bold text-gray-700 uppercase tracking-wider">#</th>
              <th className="py-4 px-6 border-b-2 border-gray-200 font-bold text-gray-700 uppercase tracking-wider">Item & Description</th>
              <th className="py-4 px-6 border-b-2 border-gray-200 font-bold text-gray-700 uppercase tracking-wider text-right">Qty</th>
              <th className="py-4 px-6 border-b-2 border-gray-200 font-bold text-gray-700 uppercase tracking-wider text-right">Rate</th>
              <th className="py-4 px-6 border-b-2 border-gray-200 font-bold text-gray-700 uppercase tracking-wider text-right">Amount</th>
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
                <td className="py-4 px-6 border-b border-gray-200 text-right">
                  {formatCurrency(item.unit_price, document.currency)}
                </td>
                <td className="py-4 px-6 border-b border-gray-200 text-right font-medium">
                  {formatCurrency(item.amount, document.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mb-12">
        <div className="w-96 bg-gray-50 rounded-lg shadow-sm p-6">
          <div className="flex justify-between py-2 border-b">
            <p className="font-medium text-gray-700">Subtotal:</p>
            <p>{formatCurrency(Number(data.subtotal || document.total_amount - taxAmount), document.currency)}</p>
          </div>
          <div className="flex justify-between py-2 border-b">
            <p className="font-medium text-gray-700">
              Tax ({taxRateFormatted}):
            </p>
            <p>{formatCurrency(taxAmount, document.currency)}</p>
          </div>
          <div className="flex justify-between py-3 mt-2 border-t-2 border-gray-300">
            <p className="text-xl font-bold text-gray-800">Total Credit:</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(document.total_amount, document.currency)}</p>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {document.notes && (
        <div className="mb-8 bg-gray-50 p-6 rounded-lg">
          <h2 className="text-lg font-bold text-gray-700 mb-3 uppercase tracking-wide">Notes</h2>
          <p className="whitespace-pre-line text-gray-700">{document.notes}</p>
        </div>
      )}

      {/* Payment Instructions */}
      <div className="mb-10">
        <PaymentDetails
          currency={document.currency}
          paymentInstructions={data.payment_instructions || DEFAULT_PAYMENT_INSTRUCTIONS}
        />
      </div>

      {/* Disclaimer message */}
      <div className="mt-8 border-t border-gray-300 pt-4 text-center text-sm text-gray-600">
        <p>This credit note is issued in reference to the original invoice and reduces the amount owed.</p>
      </div>

      {/* Signature */}
      {signature && (
        <div className="mt-16 flex justify-start">
          <div className="border-t-2 border-gray-400 w-64 pt-2">
            <p className="text-sm text-gray-600">Authorized Signature</p>
          </div>
        </div>
      )}
    </div>
  )
}








