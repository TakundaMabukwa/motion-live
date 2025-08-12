import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { accountNumber: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountNumber = params.accountNumber;

    // Get current date and calculate overdue periods
    const now = new Date();
    const currentDay = now.getDate();
    const paymentDueDay = 21;

    // Fetch vehicle invoices for the specific account
    const { data: invoices, error } = await supabase
      .from('vehicle_invoices')
      .select('*')
      .eq('new_account_number', accountNumber)
      .order('company', { ascending: true });

    if (error) {
      console.error('Error fetching vehicle invoices for account:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicle invoices' }, { status: 500 });
    }

    // Process invoices to calculate overdue amounts and monthly totals
    const processedInvoices = invoices?.map(invoice => {
      const monthlyAmount = parseFloat(invoice.one_month) || 0;
      
      // Calculate overdue months based on current date vs payment due date
      let monthsLate = 0;
      if (currentDay > paymentDueDay) {
        monthsLate = 1; // Current month is overdue
      }
      
      // Calculate overdue amounts for different periods
      const overdue1_30 = monthsLate >= 1 ? monthlyAmount : 0;
      const overdue31_60 = monthsLate >= 2 ? monthlyAmount : 0;
      const overdue61_90 = monthsLate >= 3 ? monthlyAmount : 0;
      const overdue91_plus = monthsLate >= 4 ? monthlyAmount : 0;
      
      const totalOverdue = overdue1_30 + overdue31_60 + overdue61_90 + overdue91_plus;

      return {
        ...invoice,
        monthlyAmount,
        overdue1_30,
        overdue31_60,
        overdue61_90,
        overdue91_plus,
        totalOverdue,
        monthsLate,
        isOverdue: totalOverdue > 0
      };
    }) || [];

    // Calculate account summary
    const accountSummary = {
      accountNumber,
      company: invoices?.[0]?.company || 'Unknown Company',
      totalMonthlyAmount: processedInvoices.reduce((sum, inv) => sum + inv.monthlyAmount, 0),
      totalOverdue: processedInvoices.reduce((sum, inv) => sum + inv.totalOverdue, 0),
      overdue1_30: processedInvoices.reduce((sum, inv) => sum + inv.overdue1_30, 0),
      overdue31_60: processedInvoices.reduce((sum, inv) => sum + inv.overdue31_60, 0),
      overdue61_90: processedInvoices.reduce((sum, inv) => sum + inv.overdue61_90, 0),
      overdue91_plus: processedInvoices.reduce((sum, inv) => sum + inv.overdue91_plus, 0),
      vehicleCount: processedInvoices.length,
      invoices: processedInvoices
    };

    return NextResponse.json({
      success: true,
      accountSummary,
      invoices: processedInvoices
    });

  } catch (error) {
    console.error('Error in vehicle invoices by account GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
