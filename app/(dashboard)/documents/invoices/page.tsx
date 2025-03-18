import { Suspense } from "react"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle } from "lucide-react"
import { DocumentList } from "@/components/documents/document-list"
import { Skeleton } from "@/components/ui/skeleton"
import { DocumentFilters } from "@/components/documents/document-filters"

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await createServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Parse search parameters
  const page = searchParams.page ? Number.parseInt(searchParams.page as string) : 1
  const limit = searchParams.limit ? Number.parseInt(searchParams.limit as string) : 10
  const status = searchParams.status as string | undefined
  const search = searchParams.search as string | undefined

  // Build the query
  let query = supabase
    .from("documents")
    .select("*", { count: "exact" })
    .in("type", ["invoice", "tax_invoice", "proforma_invoice"])

  if (status) {
    query = query.eq("status", status)
  }

  if (search) {
    query = query.or(`document_number.ilike.%${search}%,customer_name.ilike.%${search}%`)
  }

  // Calculate pagination
  const from = (page - 1) * limit
  const to = from + limit - 1

  // Execute the query with pagination
  const { data: documents, error, count } = await query.order("created_at", { ascending: false }).range(from, to)

  if (error) {
    console.error("Error fetching invoices:", error)
    throw new Error("Failed to fetch invoices")
  }

  // Calculate total pages
  const totalPages = count ? Math.ceil(count / limit) : 1

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <Button asChild>
          <Link href="/documents/create?type=invoice">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Invoice
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Management</CardTitle>
          <CardDescription>
            View, filter, and manage all your invoices, tax invoices, and proforma invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <DocumentFilters />

            <Suspense fallback={<DocumentListSkeleton />}>
              <DocumentList
                initialDocuments={documents}
                types={["invoice", "tax_invoice", "proforma_invoice"]}
                page={page}
                totalPages={totalPages}
              />
            </Suspense>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DocumentListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

