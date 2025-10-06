import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch ALL payment records from payments_ table - no filtering
    // Focus on due_amount and paid_amount columns
    const { data: payments, error } = await supabase
      .from('payments_')
      .select('cost_code, due_amount, paid_amount, company, reference');

    if (error) {
      console.error('Error fetching payment records:', error);
      return NextResponse.json({
        error: `Database error: ${error.message}`
      }, { status: 500 });
    }

    console.log('Payments totals API - payments data found:', payments?.length || 0, 'records');
    console.log('Payments totals API - sample payment data:', payments?.slice(0, 2));
    
    if (!payments || payments.length === 0) {
      console.log('No payment records found in payments_ table');
      return NextResponse.json({
        success: true,
        totals: {
          totalDueAmount: 0,
          totalPaidAmount: 0,
          totalBalanceDue: 0,
          totalAccounts: 0
        },
        message: 'No payment records found in payments_ table'
      });
    }

    // Calculate totals - focusing ONLY on due_amount and paid_amount
    const totals = payments?.reduce((acc, payment) => {
      const dueAmount = parseFloat(payment.due_amount) || 0;
      const paidAmount = parseFloat(payment.paid_amount) || 0;

      console.log(`Payment ${payment.cost_code}: due_amount=${dueAmount}, paid_amount=${paidAmount}`);

      return {
        totalDueAmount: acc.totalDueAmount + dueAmount,
        totalPaidAmount: acc.totalPaidAmount + paidAmount,
        totalBalanceDue: acc.totalBalanceDue + (dueAmount - paidAmount), // Calculate balance as due - paid
        totalAccounts: acc.totalAccounts + 1
      };
    }, {
      totalDueAmount: 0,
      totalPaidAmount: 0,
      totalBalanceDue: 0,
      totalAccounts: 0
    }) || {
      totalDueAmount: 0,
      totalPaidAmount: 0,
      totalBalanceDue: 0,
      totalAccounts: 0
    };

    console.log('Payments totals API - calculated totals:', totals);

    return NextResponse.json({
      success: true,
      totals,
      message: `Payment totals retrieved for ${totals.totalAccounts} payment records`
    });

  } catch (error) {
    console.error('Error in payments totals API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
