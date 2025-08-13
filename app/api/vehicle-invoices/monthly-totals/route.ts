import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all vehicle invoices with monthly subscription data
    const { data: invoices, error } = await supabase
      .from('vehicle_invoices')
      .select('*')
      .eq('stock_code', 'MONLTHY SUBSCRIPTION');

    if (error) {
      console.error('Error fetching monthly subscription invoices:', error);
      return NextResponse.json({ error: 'Failed to fetch monthly subscription data' }, { status: 500 });
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({
        success: true,
        totalMonthlyRevenue: 0,
        totalVehicles: 0,
        totalAccounts: 0,
        message: 'No monthly subscriptions found'
      });
    }

    // Calculate totals
    let totalMonthlyRevenue = 0;
    let totalVehicles = 0;
    const uniqueAccounts = new Set();

    invoices.forEach(invoice => {
      // Sum up total_incl_vat for monthly revenue
      const monthlyAmount = parseFloat(invoice.total_incl_vat) || 0;
      totalMonthlyRevenue += monthlyAmount;
      
      // Count vehicles
      totalVehicles += 1;
      
      // Track unique accounts
      if (invoice.new_account_number) {
        uniqueAccounts.add(invoice.new_account_number);
      }
    });

    const totalAccounts = uniqueAccounts.size;

    // Log the monthly totals calculation
    console.log(`[${new Date().toISOString()}] Monthly Totals Calculation:`, {
      totalMonthlyRevenue,
      totalVehicles,
      totalAccounts,
      sampleInvoices: invoices.slice(0, 3).map(inv => ({
        account: inv.new_account_number,
        company: inv.company,
        amount: inv.total_incl_vat
      }))
    });

    return NextResponse.json({
      success: true,
      totalMonthlyRevenue,
      totalVehicles,
      totalAccounts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in monthly totals calculation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
