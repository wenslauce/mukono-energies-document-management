import { CreateCustomerForm } from "@/components/customers/create-customer-form"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function CreateCustomerPage() {
  const supabase = await createServerSupabaseClient()

  // Check if user is logged in
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Create Customer</h1>
      <CreateCustomerForm userId={session.user.id} />
    </div>
  )
} 