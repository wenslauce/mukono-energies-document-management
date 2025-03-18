"use client"

import type React from "react"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, Filter, X } from "lucide-react"

export function DocumentFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [type, setType] = useState(searchParams.get("type") || "all")
  const [status, setStatus] = useState(searchParams.get("status") || "all")
  const [isFiltered, setIsFiltered] = useState(false)

  useEffect(() => {
    setIsFiltered(
      searchParams.has("search") ||
        (searchParams.has("type") && searchParams.get("type") !== "all") ||
        (searchParams.has("status") && searchParams.get("status") !== "all"),
    )
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters()
  }

  const applyFilters = () => {
    const params = new URLSearchParams()

    if (search) params.set("search", search)
    if (type && type !== "all") params.set("type", type)
    if (status && status !== "all") params.set("status", status)

    // Reset to page 1 when filters change
    params.set("page", "1")

    router.push(`/documents?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch("")
    setType("all")
    setStatus("all")
    router.push("/documents")
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <form onSubmit={handleSearch} className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search documents..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>
      <div className="flex flex-wrap gap-2">
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value)
            applyFilters()
          }}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Document Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="invoice">Invoice</SelectItem>
            <SelectItem value="tax_invoice">Tax Invoice</SelectItem>
            <SelectItem value="proforma_invoice">Proforma Invoice</SelectItem>
            <SelectItem value="receipt">Receipt</SelectItem>
            <SelectItem value="quote">Quote</SelectItem>
            <SelectItem value="estimate">Estimate</SelectItem>
            <SelectItem value="credit_note">Credit Note</SelectItem>
            <SelectItem value="purchase_order">Purchase Order</SelectItem>
            <SelectItem value="delivery_note">Delivery Note</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            applyFilters()
          }}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="final">Final</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        {isFiltered && (
          <Button variant="outline" size="icon" onClick={clearFilters} title="Clear filters">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

