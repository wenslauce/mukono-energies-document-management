import { createServerSupabaseClient } from "@/lib/supabase/server"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Database } from "@/types/supabase"

type Document = Database["public"]["Tables"]["documents"]["Row"]

interface RecentDocumentsProps {
  limit?: number
  type?: string
  status?: string
  compact?: boolean
}

export async function RecentDocuments({ limit = 5, type, status, compact = false }: RecentDocumentsProps) {
  const supabase = await createServerSupabaseClient()

  let query = supabase.from("documents").select("*").order("created_at", { ascending: false }).limit(limit)

  if (type) {
    query = query.eq("type", type)
  }

  if (status) {
    query = query.eq("status", status)
  }

  const { data: documents, error } = await query

  if (error) {
    console.error("Error fetching documents:", error)
    return <div>Failed to load documents</div>
  }

  if (documents.length === 0) {
    return <div className="text-center text-muted-foreground py-4">No documents found</div>
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {documents.map((doc) => (
          <Link key={doc.id} href={`/documents/${doc.id}`} className="block rounded-md p-2 hover:bg-muted">
            <div className="flex items-center justify-between">
              <div className="truncate font-medium">{doc.customer_name}</div>
              <div className="text-sm text-muted-foreground">{formatCurrency(doc.total_amount, doc.currency)}</div>
            </div>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document #</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell>
              <Link href={`/documents/${doc.id}`} className="font-medium hover:underline">
                {doc.document_number}
              </Link>
            </TableCell>
            <TableCell>{doc.customer_name}</TableCell>
            <TableCell className="capitalize">{formatDocumentType(doc.type)}</TableCell>
            <TableCell>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</TableCell>
            <TableCell>{formatCurrency(doc.total_amount, doc.currency)}</TableCell>
            <TableCell>
              <StatusBadge status={doc.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
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

function formatDocumentType(type: string) {
  return type.replace(/_/g, " ")
}

function StatusBadge({ status }: { status: string }) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline"

  switch (status) {
    case "draft":
      variant = "secondary"
      break
    case "final":
      variant = "default"
      break
    case "paid":
      variant = "default"
      break
    case "canceled":
      variant = "destructive"
      break
    case "overdue":
      variant = "destructive"
      break
  }

  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  )
}

