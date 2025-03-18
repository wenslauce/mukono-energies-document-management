import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { fetchRevenueData, fetchFinancialMetrics } from '@/lib/api-utils'

export async function GET(request: Request) {
  try {
    // Get request parameters 
    const url = new URL(request.url)
    const months = parseInt(url.searchParams.get('months') || '6')
    const currency = url.searchParams.get('currency') || 'UGX'
    const nativeCurrency = url.searchParams.get('native_currency') === 'true'
    
    // Initialize Supabase client
    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Fetch revenue data
    const revenueData = await fetchRevenueData(
      supabase,
      session.user.id,
      months,
      currency,
      nativeCurrency
    )
    
    // Fetch current month metrics
    const metrics = await fetchFinancialMetrics(
      supabase,
      session.user.id
    )
    
    // Return the data
    return NextResponse.json({
      success: true,
      revenueData,
      metrics,
    })
  } catch (error) {
    console.error('Revenue API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      },
      { status: 500 }
    )
  }
} 