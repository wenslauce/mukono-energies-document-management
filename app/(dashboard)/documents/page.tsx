import { Suspense } from "react"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle } from "lucide-react"
import { DocumentList } from "@/components/documents/document-list"
import { Skeleton } from "@/components/ui/skeleton"
import { DocumentFilters } from "@/components/documents/document-filters"

export default async function DocumentsPage({
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
  const type = searchParams.type as string | undefined
  const status = searchParams.status as string | undefined
  const search = searchParams.search as string | undefined

  // Build the query
  let query = supabase.from("documents").select("*", { count: "exact" })

  if (type) {
    query = query.eq("type", type)
  }

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
    console.error("Error fetching documents:", error)
    throw new Error("Failed to fetch documents")
  }

  // Calculate total pages
  const totalPages = count ? Math.ceil(count / limit) : 1

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <Button asChild>
          <Link href="/documents/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Document
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Management</CardTitle>
          <CardDescription>View, filter, and manage all your business documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <DocumentFilters />

            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="receipts">Receipts</TabsTrigger>
                <TabsTrigger value="quotes">Quotes</TabsTrigger>
                <TabsTrigger value="others">Others</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <Suspense fallback={<DocumentListSkeleton />}>
                  <DocumentList initialDocuments={documents} page={page} totalPages={totalPages} />
                </Suspense>
              </TabsContent>
              <TabsContent value="invoices" className="mt-4">
                <Suspense fallback={<DocumentListSkeleton />}>
                  <DocumentList
                    initialDocuments={documents.filter((doc) =>
                      ["invoice", "tax_invoice", "proforma_invoice"].includes(doc.type),
                    )}
                    types={["invoice", "tax_invoice", "proforma_invoice"]}
                    page={page}
                    totalPages={totalPages}
                  />
                </Suspense>
              </TabsContent>
              <TabsContent value="receipts" className="mt-4">
                <Suspense fallback={<DocumentListSkeleton />}>
                  <DocumentList
                    initialDocuments={documents.filter((doc) =>
                      ["receipt", "sales_receipt", "cash_receipt"].includes(doc.type),
                    )}
                    types={["receipt", "sales_receipt", "cash_receipt"]}
                    page={page}
                    totalPages={totalPages}
                  />
                </Suspense>
              </TabsContent>
              <TabsContent value="quotes" className="mt-4">
                <Suspense fallback={<DocumentListSkeleton />}>
                  <DocumentList
                    initialDocuments={documents.filter((doc) => ["quote", "estimate"].includes(doc.type))}
                    types={["quote", "estimate"]}
                    page={page}
                    totalPages={totalPages}
                  />
                </Suspense>
              </TabsContent>
              <TabsContent value="others" className="mt-4">
                <Suspense fallback={<DocumentListSkeleton />}>
                  <DocumentList
                    initialDocuments={documents.filter((doc) =>
                      ["credit_memo", "credit_note", "purchase_order", "delivery_note"].includes(doc.type),
                    )}
                    types={["credit_memo", "credit_note", "purchase_order", "delivery_note"]}
                    page={page}
                    totalPages={totalPages}
                  />
                </Suspense>
              </TabsContent>
            </Tabs>
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

