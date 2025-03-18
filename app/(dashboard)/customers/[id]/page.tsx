import { createServerSupabaseClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Edit, FileText, Mail, Phone, MapPin } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { DocumentList } from "@/components/documents/document-list"

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()

  // Check if user is logged in
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Fetch customer details
  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .single()

  if (error || !customer) {
    console.error("Error fetching customer:", error)
    notFound()
  }

  // Fetch customer documents
  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("*")
    .eq("customer_id", params.id)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  if (documentsError) {
    console.error("Error fetching customer documents:", documentsError)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/customers/${customer.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/documents/create?customer=${customer.id}`}>
              <FileText className="mr-2 h-4 w-4" />
              Create Document
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.email && (
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                </div>
              </div>
            )}
            
            {customer.phone && (
              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                </div>
              </div>
            )}
            
            {customer.address && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{customer.address}</p>
                </div>
              </div>
            )}
            
            {customer.tax_id && (
              <div className="flex items-start gap-2">
                <div className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="text-sm font-medium">Tax ID</p>
                  <p className="text-sm text-muted-foreground">{customer.tax_id}</p>
                </div>
              </div>
            )}

            <div className="pt-2">
              <p className="text-xs text-muted-foreground">
                Created {formatDistanceToNow(new Date(customer.created_at), { addSuffix: true })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {documents && documents.length > 0 ? (
              <DocumentList initialDocuments={documents} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground">No documents found for this customer</p>
                <Button asChild className="mt-4">
                  <Link href={`/documents/create?customer=${customer.id}`}>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Document
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 