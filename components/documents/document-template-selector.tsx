"use client"

import type { Database } from "@/types/supabase"
import { InvoiceTemplate } from "./templates/invoice-template"
import { TaxInvoiceTemplate } from "./templates/tax-invoice-template"
import { ProformaInvoiceTemplate } from "./templates/proforma-invoice-template"
import { ReceiptTemplate } from "./templates/receipt-template"
import { SalesReceiptTemplate } from "./templates/sales-receipt-template"
import { CashReceiptTemplate } from "./templates/cash-receipt-template"
import { QuoteTemplate } from "./templates/quote-template"
import { EstimateTemplate } from "./templates/estimate-template"
import { CreditNoteTemplate } from "./templates/credit-note-template"
import { PurchaseOrderTemplate } from "./templates/purchase-order-template"
import { DeliveryNoteTemplate } from "./templates/delivery-note-template"
import { DocumentWatermark } from "./document-watermark"

type Document = Database["public"]["Tables"]["documents"]["Row"]
type DocumentItem = Database["public"]["Tables"]["document_items"]["Row"]

interface DocumentTemplateSelectorProps {
  document: Document
  items: DocumentItem[]
  companyLogo?: string | null
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  signature?: string | null
}

export function DocumentTemplateSelector({
  document,
  items,
  companyLogo,
  companyName,
  companyAddress,
  companyPhone,
  companyEmail,
  signature,
}: DocumentTemplateSelectorProps) {
  const commonProps = {
    document,
    items,
    companyLogo,
    companyName,
    companyAddress,
    companyPhone,
    companyEmail,
    signature,
  }

  // Ensure logo is a valid string
  const logoSrc = companyLogo || "/logo.png"

  // Ensure the container has the proper watermark and PDF export classes
  const templateWithWatermark = (
    <div className="relative font-invoice">
      <DocumentWatermark companyLogo={logoSrc} opacity={0.1} />
      <div className="relative z-10">
        {renderTemplate()}
      </div>
    </div>
  )

  function renderTemplate() {
    switch (document.type) {
      case "invoice":
        return <InvoiceTemplate {...commonProps} />
      case "tax_invoice":
        return <TaxInvoiceTemplate {...commonProps} />
      case "proforma_invoice":
        return <ProformaInvoiceTemplate {...commonProps} />
      case "receipt":
        return <ReceiptTemplate {...commonProps} />
      case "sales_receipt":
        return <SalesReceiptTemplate {...commonProps} />
      case "cash_receipt":
        return <CashReceiptTemplate {...commonProps} />
      case "quote":
        return <QuoteTemplate {...commonProps} />
      case "estimate":
        return <EstimateTemplate {...commonProps} />
      case "credit_memo":
      case "credit_note":
        return <CreditNoteTemplate {...commonProps} />
      case "purchase_order":
        return <PurchaseOrderTemplate {...commonProps} />
      case "delivery_note":
        return <DeliveryNoteTemplate {...commonProps} />
      default:
        return <InvoiceTemplate {...commonProps} />
    }
  }

  return templateWithWatermark
}

