"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/supabase/provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface Customer {
  id: string
  name: string
  total: number
  currency: string
  document_count: number
}

export function TopCustomers() {
  const { supabase, user } = useSupabase()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTopCustomers = async () => {
      if (!user) return
      
      setLoading(true)
      try {
        // Get customer IDs with their total amount from documents
        const { data: customerData, error: customerError } = await supabase
          .from('documents')
          .select(`
            customer_id,
            customer_name,
            total_amount,
            currency
          `)
          .eq('user_id', user.id)
          .not('customer_id', 'is', null)
          .order('created_at', { ascending: false })
        
        if (customerError) throw customerError

        // Process data to group by customer and calculate total amount
        const customerMap = new Map<string, Customer>()
        
        customerData?.forEach(doc => {
          if (!doc.customer_id) return
          
          const key = doc.customer_id
          if (customerMap.has(key)) {
            const customer = customerMap.get(key)!
            customerMap.set(key, {
              ...customer,
              total: customer.total + doc.total_amount,
              document_count: customer.document_count + 1
            })
          } else {
            customerMap.set(key, {
              id: doc.customer_id,
              name: doc.customer_name,
              total: doc.total_amount,
              currency: doc.currency,
              document_count: 1
            })
          }
        })
        
        // Convert to array, sort by total, and take top 5
        const topCustomers = Array.from(customerMap.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
        
        setCustomers(topCustomers)
      } catch (error) {
        console.error("Error fetching top customers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTopCustomers()
  }, [supabase, user])

  if (loading) {
    return (
      <div className="space-y-0 divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">No customer data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-0 divide-y">
      {customers.map((customer) => (
        <Link 
          key={customer.id} 
          href={`/customers/${customer.id}`} 
          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {customer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-sm font-medium">{customer.name}</span>
              <p className="text-xs text-muted-foreground">{customer.document_count} documents</p>
            </div>
          </div>
          <span className="text-sm font-medium">
            {new Intl.NumberFormat("en-UG", {
              style: "currency",
              currency: customer.currency,
              maximumFractionDigits: 0,
            }).format(customer.total)}
          </span>
        </Link>
      ))}
    </div>
  )
}

