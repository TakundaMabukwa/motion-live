import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const allNewAccountNumbers = searchParams.get('all_new_account_numbers');

    if (!allNewAccountNumbers) {
      return NextResponse.json({
        error: 'Missing required parameter: all_new_account_numbers'
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Parse the comma-separated account numbers
    // Handle cases like "AVIS-0001, AVIS-0002, AVIS-0003"
    const accountNumbers = allNewAccountNumbers
      .split(',')
      .map((code: string) => code.trim().toUpperCase())
      .filter((code: string) => code.length > 0);

    console.log('🔍 DEBUG: Raw all_new_account_numbers input:', allNewAccountNumbers);
    console.log('🔍 DEBUG: Parsed account numbers:', accountNumbers);
    console.log('🔍 DEBUG: Number of account numbers to search:', accountNumbers.length);

    if (accountNumbers.length === 0) {
      return NextResponse.json({
        payments: [],
        message: 'No valid account numbers provided'
      });
    }

    console.log('🔍 DEBUG: Searching payments_ table for cost_code IN:', accountNumbers);

    // Fetch payment records for all account numbers from payments_ table
    const { data: payments, error } = await supabase
      .from('payments_')
      .select(`
        id,
        company,
        cost_code,
        reference,
        due_amount,
        paid_amount,
        balance_due,
        invoice_date,
        due_date,
        payment_status,
        overdue_30_days,
        overdue_60_days,
        overdue_90_days,
        last_updated,
        billing_month
      `)
      .in('cost_code', accountNumbers)
      .order('billing_month', { ascending: false })
      .order('due_date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching payment records:', error);
      return NextResponse.json({
        error: `Database error: ${error.message}`
      }, { status: 500 });
    }

    console.log(`✅ Found ${payments?.length || 0} payment records from payments_ table`);
    
    // Show which account numbers had matches
    const matchesByAccount = {};
    payments?.forEach(payment => {
      if (!matchesByAccount[payment.cost_code]) {
        matchesByAccount[payment.cost_code] = 0;
      }
      matchesByAccount[payment.cost_code]++;
    });
    console.log('✅ DEBUG: Matches by account number:', matchesByAccount);
    console.log('✅ DEBUG: All searched account numbers:', accountNumbers);
    console.log('✅ DEBUG: Account numbers with matches:', Object.keys(matchesByAccount));

    // Calculate summary statistics
    const summary = {
      totalDueAmount: 0,
      totalPaidAmount: 0,
      totalBalanceDue: 0,
      totalOverdue30: 0,
      totalOverdue60: 0,
      totalOverdue90: 0,
      paymentCount: payments?.length || 0,
      statusCounts: {
        pending: 0,
        paid: 0,
        overdue: 0,
        partial: 0
      }
    };

    if (payments && payments.length > 0) {
      payments.forEach(payment => {
        summary.totalDueAmount += Number(payment.due_amount || 0);
        summary.totalPaidAmount += Number(payment.paid_amount || 0);
        summary.totalBalanceDue += Number(payment.balance_due || 0);
        summary.totalOverdue30 += Number(payment.overdue_30_days || 0);
        summary.totalOverdue60 += Number(payment.overdue_60_days || 0);
        summary.totalOverdue90 += Number(payment.overdue_90_days || 0);
        
        // Count payment statuses
        const status = payment.payment_status?.toLowerCase();
        if (summary.statusCounts.hasOwnProperty(status)) {
          summary.statusCounts[status]++;
        }
      });
    }

    return NextResponse.json({
      payments: payments || [],
      summary,
      accountNumbers,
      message: `Retrieved ${payments?.length || 0} payment records for ${accountNumbers.length} account numbers`
    });

  } catch (error) {
    console.error('Error in by-client-accounts endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
