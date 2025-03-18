"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Eye, Download, Edit, Trash, Check, X } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { useSupabase } from "@/lib/supabase/provider"
import { useRouter } from "next/navigation"
import type { Database } from "@/types/supabase"

type Document = Database["public"]["Tables"]["documents"]["Row"]

interface DocumentListProps {
  initialDocuments: Document[]
  types?: string[]
  status?: string
  limit?: number
  page?: number
  totalPages?: number
}

export function DocumentList({
  initialDocuments,
  types,
  status,
  limit = 10,
  page = 1,
  totalPages = 1,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [currentPage, setCurrentPage] = useState(page)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [markAsPaidDialogOpen, setMarkAsPaidDialogOpen] = useState(false)
  const [documentToMarkAsPaid, setDocumentToMarkAsPaid] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { supabase } = useSupabase()
  const router = useRouter()

  const handleDelete = async () => {
    if (!documentToDelete) return
    
    setIsLoading(true)
    try {
      // Make the actual Supabase call to delete the document
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentToDelete.id)

      if (error) throw error

      // Update local state after successful deletion
      setDocuments(documents.filter((doc) => doc.id !== documentToDelete.id))

      toast({
        title: "Document deleted",
        description: `${formatDocumentType(documentToDelete.type)} ${documentToDelete.document_number} has been deleted.`,
      })
      
      // Refresh the page to reflect the changes
      router.refresh()
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        title: "Error deleting document",
        description: "An error occurred while deleting the document.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!documentToMarkAsPaid) return
    
    setIsLoading(true)
    try {
      // Make the actual Supabase call to update the document status
      const { error } = await supabase
        .from("documents")
        .update({ status: "paid" })
        .eq("id", documentToMarkAsPaid.id)

      if (error) throw error

      // Update local state after successful update
      setDocuments(documents.map((doc) => 
        doc.id === documentToMarkAsPaid.id ? { ...doc, status: "paid" } : doc
      ))

      toast({
        title: "Document marked as paid",
        description: `${formatDocumentType(documentToMarkAsPaid.type)} ${documentToMarkAsPaid.document_number} has been marked as paid.`,
      })
      
      // Refresh the page to reflect the changes
      router.refresh()
    } catch (error) {
      console.error("Error updating document:", error)
      toast({
        title: "Error updating document",
        description: "An error occurred while updating the document.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setMarkAsPaidDialogOpen(false)
      setDocumentToMarkAsPaid(null)
    }
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-muted-foreground">No documents found</p>
        <Button asChild className="mt-4">
          <Link href="/documents/create">Create your first document</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/documents/${doc.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/documents/${doc.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          window.location.href = `/documents/${doc.id}/download`
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      {(doc.type === "invoice" || doc.type === "tax_invoice" || doc.type === "proforma_invoice") &&
                        doc.status !== "paid" && (
                          <DropdownMenuItem
                            onClick={() => {
                              setDocumentToMarkAsPaid(doc)
                              setMarkAsPaidDialogOpen(true)
                            }}
                            disabled={isLoading}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setDocumentToDelete(doc)
                          setDeleteDialogOpen(true)
                        }}
                        disabled={isLoading}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (currentPage > 1) setCurrentPage(currentPage - 1)
                }}
                className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }).map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentPage(i + 1)
                  }}
                  isActive={currentPage === i + 1}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                }}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {documentToDelete?.document_number}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={markAsPaidDialogOpen} onOpenChange={setMarkAsPaidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Paid</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark {documentToMarkAsPaid?.document_number} as paid?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsPaid} disabled={isLoading}>
              {isLoading ? "Processing..." : "Mark as Paid"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
  let variant: "default" | "secondary" | "destructive" | "outline" | "success" = "outline"
  let icon = null

  switch (status) {
    case "draft":
      variant = "secondary"
      break
    case "final":
      variant = "default"
      break
    case "paid":
      variant = "success"
      icon = <Check className="mr-1 h-3 w-3" />
      break
    case "canceled":
      variant = "destructive"
      icon = <X className="mr-1 h-3 w-3" />
      break
    case "overdue":
      variant = "destructive"
      break
  }

  return (
    <Badge variant={variant as any} className="capitalize flex items-center w-fit">
      {icon}
      {status}
    </Badge>
  )
}

