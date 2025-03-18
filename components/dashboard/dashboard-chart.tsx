"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { useSupabase } from "@/lib/supabase/provider"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, SupportedCurrency } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, BarChart3, PieChartIcon, RefreshCw, BadgeCheck, Clock, ReceiptText } from "lucide-react"
import { startOfMonth, endOfMonth, format, eachMonthOfInterval, subMonths } from "date-fns"
import { MonthlyRevenue } from "@/lib/api-utils"

type DocumentType = "invoice" | "receipt" | "all"

interface ChartData {
  name: string
  invoices: number
  paidInvoices: number
  receipts: number
  income: number
  originalCurrency: SupportedCurrency
}

interface DocumentTypeOption {
  value: DocumentType
  label: string
}

interface FinancialMetrics {
  totalInvoices: number
  paidInvoices: number
  pendingInvoices: number
  totalReceipts: number
  collectionRate: number
}

// Exchange rates between currencies
// These rates represent the conversion from each currency to each other currency
const EXCHANGE_RATES: Record<SupportedCurrency, Record<SupportedCurrency, number>> = {
  UGX: {
    UGX: 1,
    KES: 0.0299, // 1 UGX = 0.0299 KES
    USD: 0.00027, // 1 UGX = 0.00027 USD
  },
  KES: {
    UGX: 33.5, // 1 KES = 33.5 UGX
    KES: 1,
    USD: 0.0078, // 1 KES = 0.0078 USD
  },
  USD: {
    UGX: 3700, // 1 USD = 3700 UGX
    KES: 127.5, // 1 USD = 127.5 KES
    USD: 1,
  },
}

export function DashboardChart() {
  const { supabase, user } = useSupabase()
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ChartData[]>([])
  const [displayData, setDisplayData] = useState<ChartData[]>([])
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>("UGX")
  const [currentTab, setCurrentTab] = useState("overview")
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>("all")
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null)
  
  // Document type filter options
  const documentTypeOptions: DocumentTypeOption[] = [
    { value: "all", label: "All" },
    { value: "invoice", label: "Invoices" },
    { value: "receipt", label: "Receipts" }
  ]

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user, selectedDocumentType])

  useEffect(() => {
    if (data.length > 0) {
      processDisplayData(data, displayCurrency)
    }
  }, [data, displayCurrency])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch data from the API in native currency format
      const response = await fetch(`/api/revenue?native_currency=true&months=6`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load revenue data')
      }

      // Process API data into chart format - respect original currencies
      const chartData = result.revenueData.map((item: MonthlyRevenue) => ({
        name: item.month,
        invoices: item.totalInvoices,
        paidInvoices: item.paidInvoices,
        receipts: item.receipts,
        income: item.income,
        originalCurrency: item.currency as SupportedCurrency || "UGX"
      }))
      
      // Filter by document type if needed
      let filteredData = chartData
      if (selectedDocumentType !== "all") {
        filteredData = chartData.map((item: ChartData) => {
          if (selectedDocumentType === "invoice") {
            // Only show invoice data
            return {
              ...item,
              receipts: 0,
              income: item.paidInvoices
            }
          } else if (selectedDocumentType === "receipt") {
            // Only show receipt data
            return {
              ...item,
              invoices: 0,
              paidInvoices: 0,
              income: item.receipts
            }
          }
          return item
        })
      }

      // Set state with data from API
      setData(filteredData)
      setMetrics(result.metrics)
      
      // Convert to display currency immediately
      processDisplayData(filteredData, displayCurrency)
    } catch (error) {
      // Log error details for debugging
      console.error("Error fetching revenue data:", error)
      
      // Try to extract a more user-friendly error message
      let errorMessage = "Failed to load chart data"
      
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      
      // Provide fallback data
      const fallbackData = generateFallbackData()
      setData(fallbackData)
      processDisplayData(fallbackData, displayCurrency)
    } finally {
      setLoading(false)
    }
  }

  const processDisplayData = (data: ChartData[], targetCurrency: SupportedCurrency) => {
    // Convert all data to the target currency
    const convertedData = data.map((item) => {
      // If the item is already in the target currency, don't convert
      if (item.originalCurrency === targetCurrency) {
        return item
      }

      // Convert each value using the appropriate exchange rate from original to target currency
      return {
        ...item,
        invoices: convertAmount(item.invoices, item.originalCurrency, targetCurrency),
        paidInvoices: convertAmount(item.paidInvoices, item.originalCurrency, targetCurrency),
        receipts: convertAmount(item.receipts, item.originalCurrency, targetCurrency),
        income: convertAmount(item.income, item.originalCurrency, targetCurrency),
        // Keep track of the display currency, but maintain original currency in data
        displayCurrency: targetCurrency
      }
    })

    setDisplayData(convertedData)
  }
  
  // Helper function to convert amounts between currencies using the exchange rate matrix
  const convertAmount = (amount: number, fromCurrency: SupportedCurrency, toCurrency: SupportedCurrency): number => {
    if (fromCurrency === toCurrency) return amount
    
    // Get the direct exchange rate from the rate matrix
    const exchangeRate = EXCHANGE_RATES[fromCurrency][toCurrency]
    return amount * exchangeRate
  }

  const handleCurrencyChange = (value: string) => {
    setDisplayCurrency(value as SupportedCurrency)
  }
  
  const handleDocumentTypeChange = (value: string) => {
    setSelectedDocumentType(value as DocumentType)
  }

  // Calculate aggregated totals and stats
  const stats = useMemo(() => {
    if (displayData.length < 2) return null
    
    const currentMonth = displayData[displayData.length - 1]
    const previousMonth = displayData[displayData.length - 2]
    
    const totalIncome = currentMonth.income
    const totalInvoices = currentMonth.invoices
    const totalPaidInvoices = currentMonth.paidInvoices
    const totalReceipts = currentMonth.receipts
    
    const incomeChange = previousMonth.income !== 0 
      ? ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100 
      : 0
      
    const invoicesChange = previousMonth.invoices !== 0
      ? ((currentMonth.invoices - previousMonth.invoices) / previousMonth.invoices) * 100
      : 0
      
    const receiptsChange = previousMonth.receipts !== 0
      ? ((currentMonth.receipts - previousMonth.receipts) / previousMonth.receipts) * 100
      : 0
      
    // Use API metrics if available, otherwise calculate from chart data
    const collectionEfficiency = metrics?.collectionRate || (totalInvoices > 0 
      ? (totalPaidInvoices / totalInvoices) * 100 
      : 0)
    
    return {
      totalIncome,
      totalInvoices,
      totalPaidInvoices,
      totalReceipts,
      incomeChange,
      invoicesChange,
      receiptsChange,
      collectionEfficiency
    }
  }, [displayData, metrics])

  // Calculate total for the entire period
  const periodTotals = useMemo(() => {
    if (displayData.length === 0) return null
    
    const totalIncome = displayData.reduce((sum, month) => sum + month.income, 0)
    const totalInvoices = displayData.reduce((sum, month) => sum + month.invoices, 0)
    const totalPaidInvoices = displayData.reduce((sum, month) => sum + month.paidInvoices, 0)
    const totalReceipts = displayData.reduce((sum, month) => sum + month.receipts, 0)
    
    // Collection rate over the period
    const collectionRate = totalInvoices > 0 
      ? (totalPaidInvoices / totalInvoices) * 100 
      : 0
    
    return {
      totalIncome,
      totalInvoices,
      totalPaidInvoices,
      totalReceipts,
      collectionRate
    }
  }, [displayData])

  // Generate color for trend indicators
  const getTrendColor = (value: number) => {
    return value >= 0 ? 'text-green-500' : 'text-red-500'
  }

  // Generate fallback data when API calls fail
  const generateFallbackData = (): ChartData[] => {
    const now = new Date()
    return Array.from({ length: 6 }).map((_, index) => {
      const monthDate = subMonths(now, 5 - index)
      const monthName = format(monthDate, "MMM yyyy")
      
      // Generate random but realistic looking data
      const invoices = Math.floor(Math.random() * 5000000) + 2000000
      const paidInvoices = Math.floor(invoices * (Math.random() * 0.4 + 0.5)) // 50-90% paid
      const receipts = Math.floor(Math.random() * 4000000) + 1500000
      const income = receipts
      
      return {
        name: monthName,
        invoices,
        paidInvoices,
        receipts,
        income,
        originalCurrency: "UGX"
      }
    })
  }

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center">
        <p className="text-muted-foreground">{error}</p>
        <button 
          onClick={fetchData} 
          className="mt-4 inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <h3 className="text-lg font-semibold">Revenue Overview</h3>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedDocumentType} onValueChange={handleDocumentTypeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              {documentTypeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={displayCurrency} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="w-[90px]">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UGX">UGX</SelectItem>
              <SelectItem value="KES">KES</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <div className="rounded-full bg-green-100 p-1.5 text-green-600 dark:bg-green-900/30">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <CardDescription>Current month revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalIncome, displayCurrency)}</div>
              <div className="mt-1 flex items-center text-xs">
                {stats.incomeChange >= 0 ? (
                  <ArrowUpRight className={`mr-1 h-3 w-3 ${getTrendColor(stats.incomeChange)}`} />
                ) : (
                  <ArrowDownRight className={`mr-1 h-3 w-3 ${getTrendColor(stats.incomeChange)}`} />
                )}
                <span className={getTrendColor(stats.incomeChange)}>
                  {Math.abs(stats.incomeChange).toFixed(1)}% from last month
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Invoices & Receipts</CardTitle>
                <div className="rounded-full bg-blue-100 p-1.5 text-blue-600 dark:bg-blue-900/30">
                  <ReceiptText className="h-4 w-4" />
                </div>
              </div>
              <CardDescription>Current month breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoices</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(stats.totalInvoices, displayCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receipts</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(stats.totalReceipts, displayCurrency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Collection Efficiency</CardTitle>
                <div className="rounded-full bg-amber-100 p-1.5 text-amber-600 dark:bg-amber-900/30">
                  <BadgeCheck className="h-4 w-4" />
                </div>
              </div>
              <CardDescription>Paid vs total invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.collectionEfficiency.toFixed(1)}%</div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Paid Invoices</span>
                  <span>{formatCurrency(stats.totalPaidInvoices, displayCurrency)}</span>
                </div>
                <progress 
                  className="mt-1 h-2 w-full [&::-moz-progress-bar]:bg-amber-500 [&::-webkit-progress-bar]:bg-gray-100 [&::-webkit-progress-value]:bg-amber-500"
                  value={stats.collectionEfficiency}
                  max="100"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Revenue Overview</span>
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center gap-1.5">
            <PieChartIcon className="h-3.5 w-3.5" />
            <span>Document Breakdown</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={displayData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: theme === "dark" ? "#94a3b8" : "#64748b" }}
                />
                <YAxis
                  orientation="left"
                  tickFormatter={(value) => 
                    value >= 1000000
                      ? `${(value / 1000000).toFixed(1)}M`
                      : value >= 1000
                      ? `${(value / 1000).toFixed(0)}K`
                      : value.toString()
                  }
                  tick={{ fill: theme === "dark" ? "#94a3b8" : "#64748b" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#27272a" : "#ffffff",
                    borderColor: theme === "dark" ? "#3f3f46" : "#e4e4e7",
                    color: theme === "dark" ? "#ffffff" : "#000000",
                  }}
                  formatter={(value) => [`${formatCurrency(value as number, displayCurrency)}`, ""]}
                  labelFormatter={(label) => {
                    // Find the data item for this label to show its original currency
                    const item = displayData.find(d => d.name === label)
                    if (item?.originalCurrency && item.originalCurrency !== displayCurrency) {
                      return `${label} (Original: ${item.originalCurrency})`
                    }
                    return label
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="income" 
                  name="Total Income" 
                  fill="#22c55e" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={60}
                />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  name="Income Trend" 
                  stroke="#3b82f6" 
                  strokeWidth={2.5}
                  dot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
        
        <TabsContent value="breakdown" className="mt-4">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: theme === "dark" ? "#94a3b8" : "#64748b" }}
                />
                <YAxis 
                  tickFormatter={(value) => 
                    value >= 1000000
                      ? `${(value / 1000000).toFixed(1)}M`
                      : value >= 1000
                      ? `${(value / 1000).toFixed(0)}K`
                      : value.toString()
                  }
                  tick={{ fill: theme === "dark" ? "#94a3b8" : "#64748b" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#27272a" : "#ffffff",
                    borderColor: theme === "dark" ? "#3f3f46" : "#e4e4e7",
                    color: theme === "dark" ? "#ffffff" : "#000000",
                  }}
                  formatter={(value) => [`${formatCurrency(value as number, displayCurrency)}`, ""]}
                  labelFormatter={(label) => {
                    // Find the data item for this label to show its original currency
                    const item = displayData.find(d => d.name === label)
                    if (item?.originalCurrency && item.originalCurrency !== displayCurrency) {
                      return `${label} (Original: ${item.originalCurrency})`
                    }
                    return label
                  }}
                />
                <Legend />
                <Bar dataKey="invoices" name="Total Invoices" fill="#8884d8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="paidInvoices" name="Paid Invoices" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="receipts" name="Receipts" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
      
      {periodTotals && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">6-Month Summary</CardTitle>
            <CardDescription>
              Overall performance for the past 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <span className="text-lg font-semibold">{formatCurrency(periodTotals.totalIncome, displayCurrency)}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">Total Invoices</span>
                <span className="text-lg font-semibold">{formatCurrency(periodTotals.totalInvoices, displayCurrency)}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">Total Receipts</span>
                <span className="text-lg font-semibold">{formatCurrency(periodTotals.totalReceipts, displayCurrency)}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-sm text-muted-foreground">Collection Rate</span>
                <span className="text-lg font-semibold">{periodTotals.collectionRate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

