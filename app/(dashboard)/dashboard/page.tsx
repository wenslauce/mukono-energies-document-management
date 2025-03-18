import { Suspense } from "react"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PlusCircle,
  FileText,
  Receipt,
  FileSpreadsheet,
  Clock,
  Users,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader,
} from "lucide-react"
import { RecentDocuments } from "@/components/dashboard/recent-documents"
import { DocumentStats } from "@/components/dashboard/document-stats"
import { DashboardChart } from "@/components/dashboard/dashboard-chart"
import { TopCustomers } from "@/components/dashboard/top-customers"
import { CalendarView } from "@/components/dashboard/calendar-view"
import { RecentActivity } from "@/components/dashboard/recent-activity"

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/documents">View All Documents</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/documents/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Document
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<DocumentStatsSkeleton />}>
        <DocumentStats />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>
              View your monthly revenue trends with detailed breakdowns
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Suspense fallback={<div className="flex h-[500px] items-center justify-center"><Loader className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
              <DashboardChart />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="md:row-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            <Suspense fallback={<ActivitySkeleton />}>
              <RecentActivity />
            </Suspense>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/documents">View All Activity</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Recent Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
                <TabsTrigger value="drafts">Drafts</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <Suspense fallback={<RecentDocumentsSkeleton />}>
                  <RecentDocuments limit={5} />
                </Suspense>
              </TabsContent>
              <TabsContent value="recent" className="mt-4">
                <Suspense fallback={<RecentDocumentsSkeleton />}>
                  <RecentDocuments limit={5} />
                </Suspense>
              </TabsContent>
              <TabsContent value="drafts" className="mt-4">
                <Suspense fallback={<RecentDocumentsSkeleton />}>
                  <RecentDocuments status="draft" limit={5} />
                </Suspense>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/documents">View All Documents</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Top Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            <Suspense fallback={<TopCustomersSkeleton />}>
              <TopCustomers />
            </Suspense>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/customers">View All Customers</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Create</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Button asChild variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
                <Link href="/documents/create?type=invoice">Create Invoice</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
                <Link href="/documents/create?type=receipt">Create Receipt</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="bg-background/80 backdrop-blur-sm">
                <Link href="/documents/create?type=quote">Create Quote</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Suspense fallback={<DocumentTypesSkeleton />}>
              <RecentDocuments type="invoice" limit={3} compact />
            </Suspense>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/documents/invoices">View All Invoices</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-gradient-to-br from-mukono-blue/10 to-mukono-blue/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Quotes</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Suspense fallback={<DocumentTypesSkeleton />}>
              <RecentDocuments type="quote" limit={3} compact />
            </Suspense>
          </CardContent>
          <CardFooter>
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href="/documents/quotes">View All Quotes</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

function DocumentStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-16" />
            <Skeleton className="mt-1 h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RecentDocumentsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

function DocumentTypesSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="space-y-0 divide-y">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

function TopCustomersSkeleton() {
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

