"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Settings,
  PlusCircle,
  Receipt,
  FileCheck,
  FileSpreadsheet,
  TruckIcon as TruckDelivery,
  CreditCard,
  ShoppingCart,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  className?: string
}

const documentTypes = [
  {
    name: "Invoices",
    href: "/documents/invoices",
    icon: FileText,
  },
  {
    name: "Receipts",
    href: "/documents/receipts",
    icon: Receipt,
  },
  {
    name: "Quotes & Estimates",
    href: "/documents/quotes",
    icon: FileSpreadsheet,
  },
  {
    name: "Credit Notes",
    href: "/documents/credit-notes",
    icon: CreditCard,
  },
  {
    name: "Purchase Orders",
    href: "/documents/purchase-orders",
    icon: ShoppingCart,
  },
  {
    name: "Delivery Notes",
    href: "/documents/delivery-notes",
    icon: TruckDelivery,
  },
]

export function DashboardSidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={cn("flex flex-col space-y-6 border-r p-6 w-64", className)}>
      <div className="flex flex-col space-y-1">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
            pathname === "/dashboard" ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/documents"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
            pathname === "/documents" ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
          )}
        >
          <FileCheck className="h-4 w-4" />
          <span>All Documents</span>
        </Link>
        <Link
          href="/documents/create"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
            pathname === "/documents/create" ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
          )}
        >
          <PlusCircle className="h-4 w-4" />
          <span>Create Document</span>
        </Link>
        <Link
          href="/customers"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
            pathname.startsWith("/customers") ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
          )}
        >
          <Users className="h-4 w-4" />
          <span>Customers</span>
        </Link>
      </div>

      <div>
        <h4 className="mb-2 px-3 text-sm font-medium">Document Types</h4>
        <div className="flex flex-col space-y-1">
          {documentTypes.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
                pathname === item.href ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-auto">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
            pathname.startsWith("/settings") ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
          )}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  )
}

