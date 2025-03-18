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
import { motion, AnimatePresence } from "framer-motion"

type Document = Database["public"]["Tables"]["documents"]["Row"]
type DocumentItem = Database["public"]["Tables"]["document_items"]["Row"]

// Default payment instructions to use across all templates
export const DEFAULT_PAYMENT_INSTRUCTIONS = {
  account_name: "Mukono Energies Limited",
  account_number: "6008966891",
  bank_name: "Absa Bank (U) Limited",
  swift_code: "BARCUGKX",
  branch_name: "LUGOGO",
  payment_terms: "Payment due within 30 days"
}

// Format tax rate function
export function formatTaxRate(document: Document): string {
  const data = document.data as any
  
  // If tax_rate is explicitly provided in the document data
  if (data?.tax_rate !== undefined) {
    return `${data.tax_rate}%`
  }
  
  // If tax_amount and total are both available, calculate the rate
  if (document.tax_amount && document.total_amount) {
    const subtotal = document.total_amount - document.tax_amount
    if (subtotal > 0) {
      const calculatedRate = (document.tax_amount / subtotal) * 100
      return `${calculatedRate.toFixed(1)}%`
    }
  }
  
  // Default to 0% if no tax information is available
  return "0%"
}

// Get tax amount helper function
export function getTaxAmount(document: Document): number {
  const data = document.data as any
  
  // If tax_amount is explicitly set in the document
  if (document.tax_amount !== null && document.tax_amount !== undefined) {
    return document.tax_amount
  }
  
  // If tax_amount is in the data object
  if (data?.tax_amount !== null && data?.tax_amount !== undefined) {
    return Number(data.tax_amount)
  }
  
  // If no tax amount is available, return 0
  return 0
}

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

  // Animation variants for template transitions
  const templateAnimationVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.3,
        ease: "easeOut" 
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.98,
      transition: { 
        duration: 0.2,
        ease: "easeIn" 
      }
    }
  }

  // Ensure the container has the proper watermark and PDF export classes
  const templateWithWatermark = (
    <div className="relative font-invoice">
      <DocumentWatermark companyLogo={logoSrc} opacity={0.1} />
      <AnimatePresence mode="wait">
        <motion.div 
          key={document.type} 
          className="relative z-10"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={templateAnimationVariants}
        >
          {renderTemplate()}
        </motion.div>
      </AnimatePresence>
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
