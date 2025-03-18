"use client"

import { useRef, useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { Edit, ArrowLeft, Loader2 } from "lucide-react"
import { DocumentPDF } from "@/components/documents/document-pdf"
import { useToast } from "@/components/ui/use-toast"
import type { Database } from "@/types/supabase"
import { DocumentViewer } from "@/components/documents/document-viewer"

type Document = Database["public"]["Tables"]["documents"]["Row"]
type DocumentItem = Database["public"]["Tables"]["document_items"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

interface DocumentClientProps {
  id: string
}

export default function DocumentClient({ id }: DocumentClientProps) {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  const { toast } = useToast();
  const documentRef = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocumentAndItems = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          router.push("/login");
          return;
        }
        
        // Fetch user profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
        }
        
        // Fetch document
        const { data, error } = await supabase.from("documents").select("*").eq("id", id).single();
        
        if (error || !data) {
          toast({
            title: "Error",
            description: "Document not found",
            variant: "destructive",
          });
          router.push("/documents");
          return;
        }
        
        setDocument(data);
        
        // Fetch document items
        const { data: itemsData, error: itemsError } = await supabase
          .from("document_items")
          .select("*")
          .eq("document_id", id)
          .order("id");
          
        if (itemsError) {
          console.error("Error fetching document items:", itemsError);
          toast({
            title: "Warning",
            description: "Could not load document items",
            variant: "destructive",
          });
        } else {
          setItems(itemsData || []);
        }
      } catch (error) {
        console.error("Error fetching document:", error);
        toast({
          title: "Error",
          description: "Failed to load document",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocumentAndItems();
  }, [id, router, supabase, toast]);

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!document) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link href="/documents">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to documents</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {formatDocumentType(document.type)} {document.document_number}
          </h1>
          <StatusBadge status={document.status} />
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/documents/${document.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DocumentPDF 
            documentId={document.id}
            documentType={document.type}
            documentNumber={document.document_number}
            containerRef={documentRef}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Document Preview</CardTitle>
              <CardDescription>Preview how your document will look when downloaded</CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={documentRef}>
                <DocumentViewer 
                  document={document}
                  items={items}
                  profile={profile}
                  className="print:shadow-none print:border-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Document Type</h3>
                <p className="capitalize">{formatDocumentType(document.type)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Document Number</h3>
                <p>{document.document_number}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Customer</h3>
                <p>{document.customer_name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Date</h3>
                <p>{format(new Date(document.issue_date), "PPP")}</p>
              </div>
              {document.due_date && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Due Date</h3>
                  <p>{format(new Date(document.due_date), "PPP")}</p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Total Amount</h3>
                <p className="text-lg font-bold">{formatCurrency(document.total_amount, document.currency)}</p>
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                <StatusBadge status={document.status} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2">
              <DocumentPDF
                documentId={document.id}
                documentType={document.type}
                documentNumber={document.document_number}
                containerRef={documentRef}
              />
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/documents/${document.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Document
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatDocumentType(type: string) {
  return type.replace(/_/g, " ")
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

function StatusBadge({ status }: { status: string }) {
  let variant: "default" | "secondary" | "destructive" | "outline" | "success" = "outline"

  switch (status) {
    case "draft":
      variant = "secondary"
      break
    case "final":
      variant = "default"
      break
    case "paid":
      variant = "success"
      break
    case "sent":
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
    <Badge variant={variant as any} className="capitalize">
      {status}
    </Badge>
  )
} 