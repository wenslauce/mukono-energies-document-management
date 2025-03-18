"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"

export function DocumentSettings() {
  const { toast } = useToast()

  const [saving, setSaving] = useState(false)
  const [defaultNotes, setDefaultNotes] = useState("")
  const [defaultTerms, setDefaultTerms] = useState("")
  const [defaultTaxRate, setDefaultTaxRate] = useState("18")
  const [autoNumbering, setAutoNumbering] = useState(true)
  const [invoicePrefix, setInvoicePrefix] = useState("INV-")
  const [receiptPrefix, setReceiptPrefix] = useState("RCT-")
  const [quotePrefix, setQuotePrefix] = useState("QT-")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSaving(true)

    try {
      // This would normally save to the database
      // For now, we'll just show a success message

      toast({
        title: "Document settings updated",
        description: "Your document settings have been updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error updating document settings",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="defaultNotes">Default Notes</Label>
          <Textarea
            id="defaultNotes"
            value={defaultNotes}
            onChange={(e) => setDefaultNotes(e.target.value)}
            placeholder="Enter default notes for documents"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultTerms">Default Terms & Conditions</Label>
          <Textarea
            id="defaultTerms"
            value={defaultTerms}
            onChange={(e) => setDefaultTerms(e.target.value)}
            placeholder="Enter default terms and conditions"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
          <Input
            id="defaultTaxRate"
            type="number"
            min="0"
            max="100"
            value={defaultTaxRate}
            onChange={(e) => setDefaultTaxRate(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between space-y-0 pt-2">
          <Label htmlFor="autoNumbering">Auto Document Numbering</Label>
          <Switch id="autoNumbering" checked={autoNumbering} onCheckedChange={setAutoNumbering} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
            <Input
              id="invoicePrefix"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              placeholder="INV-"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiptPrefix">Receipt Prefix</Label>
            <Input
              id="receiptPrefix"
              value={receiptPrefix}
              onChange={(e) => setReceiptPrefix(e.target.value)}
              placeholder="RCT-"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quotePrefix">Quote Prefix</Label>
            <Input
              id="quotePrefix"
              value={quotePrefix}
              onChange={(e) => setQuotePrefix(e.target.value)}
              placeholder="QT-"
            />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  )
}

