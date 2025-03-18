import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Types for revenue data
export interface MonthlyRevenue {
  month: string           // Month in format "MMM YYYY"
  totalInvoices: number   // Sum of all invoices issued
  paidInvoices: number    // Sum of invoices marked as paid
  receipts: number        // Sum of receipts issued
  income: number          // Total recognized income
  currency: string        // Currency code for the amounts
}

export interface RevenueStats {
  currentMonth: MonthlyRevenue
  previousMonth: MonthlyRevenue
  percentChange: number
  collectionRate: number  // % of invoices that were paid
}

/**
 * Fetch monthly revenue data from Supabase
 * @param supabase Supabase client instance
 * @param userId User ID to fetch data for
 * @param months Number of months to fetch data for
 * @param currency Currency for the amounts
 * @param preserveNativeCurrency Whether to keep original document currencies (true) or convert all to specified currency (false)
 * @returns Promise resolving to array of monthly revenue data
 */
export async function fetchRevenueData(
  supabase: SupabaseClient<Database>,
  userId: string,
  months = 6,
  currency = 'UGX',
  preserveNativeCurrency = false
): Promise<MonthlyRevenue[]> {
  try {
    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Format dates for Supabase query
    const startDateStr = startDate.toISOString()
    const endDateStr = endDate.toISOString()

    // Get all relevant documents
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Group by month and calculate totals
    const monthlyData: Record<string, Record<string, MonthlyRevenue>> = {}
    
    // Initialize all months in the range
    for (let i = 0; i < months; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = monthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })
      
      // If preserving native currencies, we need a nested structure
      // to track monthly data per currency
      monthlyData[monthKey] = {}
      
      // Always ensure we have an entry for the target currency
      monthlyData[monthKey][currency] = {
        month: monthKey,
        totalInvoices: 0,
        paidInvoices: 0,
        receipts: 0,
        income: 0,
        currency: currency
      }
    }

    // Process documents
    documents?.forEach(doc => {
      const date = new Date(doc.created_at)
      const monthKey = date.toLocaleString('en-US', { month: 'short', year: 'numeric' })
      const docCurrency = doc.currency || currency
      
      if (!monthlyData[monthKey]) return // Skip if not in our target range
      
      // Initialize structure for this month and currency if needed
      if (preserveNativeCurrency && !monthlyData[monthKey][docCurrency]) {
        monthlyData[monthKey][docCurrency] = {
          month: monthKey,
          totalInvoices: 0,
          paidInvoices: 0,
          receipts: 0,
          income: 0,
          currency: docCurrency
        }
      }
      
      // Use either native currency tracking or the target currency
      const trackingCurrency = preserveNativeCurrency ? docCurrency : currency
      const amount = doc.total_amount || 0

      // Process based on document type
      if (['invoice', 'tax_invoice', 'proforma_invoice'].includes(doc.type)) {
        monthlyData[monthKey][trackingCurrency].totalInvoices += amount
        
        // Add to paid invoices if status is paid
        if (doc.status === 'paid') {
          monthlyData[monthKey][trackingCurrency].paidInvoices += amount
        }
      } 
      else if (['receipt', 'cash_receipt', 'sales_receipt'].includes(doc.type)) {
        monthlyData[monthKey][trackingCurrency].receipts += amount
      }

      // Calculate income (from either receipts or paid invoices)
      monthlyData[monthKey][trackingCurrency].income = Math.max(
        monthlyData[monthKey][trackingCurrency].receipts,
        monthlyData[monthKey][trackingCurrency].paidInvoices
      )
    })

    // Convert to sorted array
    let result: MonthlyRevenue[] = []
    
    // If preserving native currencies, we need to flatten the structure
    if (preserveNativeCurrency) {
      Object.values(monthlyData).forEach(currencyMap => {
        Object.values(currencyMap).forEach(data => {
          result.push(data)
        })
      })
    } else {
      // Otherwise just take the target currency data for each month
      result = Object.keys(monthlyData).map(month => monthlyData[month][currency])
    }
    
    // Sort by date
    return result.sort((a, b) => {
      const dateA = new Date(a.month)
      const dateB = new Date(b.month)
      return dateA.getTime() - dateB.getTime()
    })
  } catch (error) {
    console.error('Error fetching revenue data:', error)
    throw error
  }
}

/**
 * Calculate revenue statistics based on monthly data
 * @param revenueData Array of monthly revenue data
 * @returns Revenue statistics object
 */
export function calculateRevenueStats(revenueData: MonthlyRevenue[]): RevenueStats | null {
  if (revenueData.length < 2) return null

  const currentMonth = revenueData[revenueData.length - 1]
  const previousMonth = revenueData[revenueData.length - 2]
  
  // Calculate percentage change in income
  const percentChange = previousMonth.income > 0
    ? ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100
    : 0
  
  // Calculate collection rate for current month
  const collectionRate = currentMonth.totalInvoices > 0
    ? (currentMonth.paidInvoices / currentMonth.totalInvoices) * 100
    : 0
  
  return {
    currentMonth,
    previousMonth,
    percentChange,
    collectionRate
  }
}

/**
 * Fetch aggregated financial metrics
 * @param supabase Supabase client instance
 * @param userId User ID to fetch data for
 * @returns Promise resolving to financial metrics
 */
export async function fetchFinancialMetrics(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  try {
    // Get metrics for the current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

    // Get all documents for the current month
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)

    if (error) throw error

    // Calculate metrics
    const metrics = {
      totalInvoices: 0,
      paidInvoices: 0,
      pendingInvoices: 0,
      totalReceipts: 0,
      collectionRate: 0
    }

    documents?.forEach(doc => {
      if (['invoice', 'tax_invoice', 'proforma_invoice'].includes(doc.type)) {
        const amount = doc.total_amount || 0
        metrics.totalInvoices += amount
        
        if (doc.status === 'paid') {
          metrics.paidInvoices += amount
        } else {
          metrics.pendingInvoices += amount
        }
      } 
      else if (['receipt', 'cash_receipt', 'sales_receipt'].includes(doc.type)) {
        metrics.totalReceipts += doc.total_amount || 0
      }
    })

    // Calculate collection rate
    metrics.collectionRate = metrics.totalInvoices > 0
      ? (metrics.paidInvoices / metrics.totalInvoices) * 100
      : 0

    return metrics
  } catch (error) {
    console.error('Error fetching financial metrics:', error)
    throw error
  }
} 