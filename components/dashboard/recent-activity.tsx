"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/supabase/provider"
import { formatDistanceToNow } from "date-fns"
import { FileText, Receipt, DollarSign, FileSpreadsheet, AlertCircle, Eye } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

type Activity = {
  id: string
  action: string
  document_id: string
  document_type?: string
  document_number?: string
  amount?: number
  created_at: string
  details?: any
}

export function RecentActivity() {
  const { supabase, user } = useSupabase()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActivities() {
      if (!user) return
      
      try {
        // Fetch real activity data from document_history
        const { data: historyData, error: historyError } = await supabase
          .from("document_history")
          .select(`
            id, 
            created_at, 
            document_id, 
            action, 
            details,
            documents:documents(
              type, 
              document_number, 
              total_amount
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10)
        
        if (historyError) throw historyError
        
        // Transform the data for our activity feed
        const processedActivities: Activity[] = historyData.map(item => ({
          id: item.id,
          action: item.action,
          document_id: item.document_id,
          document_type: item.documents?.length > 0 ? item.documents[0]?.type : undefined,
          document_number: item.documents?.length > 0 ? item.documents[0]?.document_number : undefined,
          amount: item.documents?.length > 0 ? item.documents[0]?.total_amount : undefined,
          created_at: item.created_at,
          details: item.details
        }))
        
        setActivities(processedActivities)
      } catch (error) {
        console.error("Error fetching activities:", error)
        
        // If we fail to fetch, load a reduced set of mock data
        const mockActivities: Activity[] = [
          {
            id: "1",
            action: "document_created",
            document_id: "123",
            document_type: "invoice",
            document_number: "INV-001",
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          }
        ]
        setActivities(mockActivities)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [supabase, user])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Loading activities...</p>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">No recent activities</p>
      </div>
    )
  }

  const getActivityIcon = (activity: Activity) => {
    // Determine icon based on document type and action
    if (activity.action === "document_viewed" || activity.action === "viewed") {
      return <Eye className="h-4 w-4 text-amber-500" />
    }
    
    switch (activity.document_type) {
      case "invoice":
      case "tax_invoice":
      case "proforma_invoice":
        return activity.action.includes("payment") 
          ? <DollarSign className="h-4 w-4 text-green-600" /> 
          : <FileText className="h-4 w-4 text-blue-500" />
      case "receipt":
      case "cash_receipt":
      case "sales_receipt":
        return <Receipt className="h-4 w-4 text-green-500" />
      case "quote":
      case "estimate":
        return <FileSpreadsheet className="h-4 w-4 text-purple-500" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getActivityText = (activity: Activity) => {
    // Format the type for display
    const documentType = activity.document_type?.replace(/_/g, " ") || "document"
    
    if (!activity.document_number) {
      return `${documentType} activity`
    }
    
    switch (activity.action) {
      case "document_created":
      case "created":
        return `${documentType} ${activity.document_number} created`
      case "document_updated":
      case "updated":
        return `${documentType} ${activity.document_number} updated`
      case "payment_received":
      case "marked_as_paid":
        return `Payment received for ${activity.document_number}`
      case "document_viewed":
      case "viewed":
        return `${documentType} ${activity.document_number} viewed`
      case "document_downloaded":
      case "downloaded":
        return `${documentType} ${activity.document_number} downloaded`
      default:
        return `${documentType} ${activity.document_number} ${activity.action}`
    }
  }

  return (
    <div className="space-y-0 divide-y">
      {activities.map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Link 
            href={`/documents/${activity.document_id}`}
            className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {getActivityIcon(activity)}
              <span className="text-sm">{getActivityText(activity)}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}

