import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Receipt, Clock, AlertCircle } from "lucide-react"

export async function DocumentStats() {
  const supabase = await createServerSupabaseClient()

  // Get total documents count
  const { count: totalCount } = await supabase.from("documents").select("*", { count: "exact", head: true })

  // Get draft documents count
  const { count: draftCount } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "draft")

  // Get paid documents count
  const { count: paidCount } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "paid")

  // Get overdue documents count
  const { count: overdueCount } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "overdue")

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCount || 0}</div>
          <p className="text-xs text-muted-foreground">All documents in the system</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Draft Documents</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{draftCount || 0}</div>
          <p className="text-xs text-muted-foreground">Documents in draft status</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paid Documents</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{paidCount || 0}</div>
          <p className="text-xs text-muted-foreground">Documents marked as paid</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Documents</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overdueCount || 0}</div>
          <p className="text-xs text-muted-foreground">Documents past due date</p>
        </CardContent>
      </Card>
    </div>
  )
}

