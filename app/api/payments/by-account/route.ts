import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateOverdueBuckets, normalizeBillingMonth } from '@/lib/server/account-invoice-payments';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber');
    const billingMonth = normalizeBillingMonth(searchParams.get('billingMonth'));

    if (!accountNumber) {
      return NextResponse.json({
        error: 'Missing required parameter: accountNumber'
      }, { status: 400 });
    }

    const supabase = await createClient();

    let query = supabase
      .from('payments_')
      .select('*')
      .eq('cost_code', accountNumber)
      .order('billing_month', { ascending: false, nullsFirst: false })
      .order('last_updated', { ascending: false })
      .limit(1);

    query = billingMonth ? query.eq('billing_month', billingMonth) : query;

    const { data: paymentRows, error } = await query;

    if (error) {
      console.error('Error fetching payment record:', error);
      return NextResponse.json({
        error: `Database error: ${error.message}`
      }, { status: 500 });
    }

    const payment = Array.isArray(paymentRows) ? paymentRows[0] || null : null;

    if (!payment) {
      return NextResponse.json({
        payment: null,
        message: `No payment record found for account: ${accountNumber}`
      });
    }

    const overdue = calculateOverdueBuckets({
      balanceDue: payment.balance_due,
      dueDate: payment.due_date,
    });

    return NextResponse.json({
      payment: {
        ...payment,
        overdue_30_days: overdue.overdue30Days,
        overdue_60_days: overdue.overdue60Days,
        overdue_90_days: overdue.overdue90Days + overdue.overdue91PlusDays,
        overdue_91_plus_days: overdue.overdue91PlusDays,
        current_due: overdue.currentDue,
      },
      message: 'Payment record retrieved successfully'
    });

  } catch (error) {
    console.error('Error in by-account endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
