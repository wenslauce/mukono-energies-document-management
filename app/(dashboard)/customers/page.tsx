import { createServerSupabaseClient } from "@/lib/supabase/server"
import { CustomersList } from "@/components/customers/customers-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { redirect } from "next/navigation"

export default async function CustomersPage() {
  const supabase = await createServerSupabaseClient()

  // Check if user is logged in
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  // Fetch all customers
  const { data: customers, error } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .order("name")

  if (error) {
    console.error("Error fetching customers:", error)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <Button asChild>
          <Link href="/customers/create">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Link>
        </Button>
      </div>

      <CustomersList initialCustomers={customers || []} />
    </div>
  )
} 