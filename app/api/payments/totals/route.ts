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

    const { data: payments, error } = await supabase
      .from('payments_')
      .select(`
        cost_code,
        due_amount,
        paid_amount,
        balance_due,
        outstanding_balance,
        overdue_30_days,
        overdue_60_days,
        overdue_90_days,
        overdue_120_plus_days
      `);

    if (error) {
      console.error('Error fetching payment records:', error);
      return NextResponse.json({
        error: `Database error: ${error.message}`
      }, { status: 500 });
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({
        success: true,
        totals: {
          totalDueAmount: 0,
          totalPaidAmount: 0,
          totalBalanceDue: 0,
          totalOverdueAmount: 0,
          totalAccounts: 0
        },
        message: 'No payment records found in payments_ table'
      });
    }

    const toNumber = (value: unknown) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : 0;
    };

    const totals = payments?.reduce((acc, payment) => {
      const dueAmount = toNumber(payment.due_amount);
      const paidAmount = toNumber(payment.paid_amount);
      const outstandingBalance =
        payment.outstanding_balance ?? payment.balance_due ?? Math.max(0, dueAmount - paidAmount);
      const overdueAmount =
        toNumber(payment.overdue_30_days) +
        toNumber(payment.overdue_60_days) +
        toNumber(payment.overdue_90_days) +
        toNumber(payment.overdue_120_plus_days);

      return {
        totalDueAmount: acc.totalDueAmount + dueAmount,
        totalPaidAmount: acc.totalPaidAmount + paidAmount,
        totalBalanceDue: acc.totalBalanceDue + toNumber(outstandingBalance),
        totalOverdueAmount: acc.totalOverdueAmount + overdueAmount,
        totalAccounts: acc.totalAccounts + 1
      };
    }, {
      totalDueAmount: 0,
      totalPaidAmount: 0,
      totalBalanceDue: 0,
      totalOverdueAmount: 0,
      totalAccounts: 0
    }) || {
      totalDueAmount: 0,
      totalPaidAmount: 0,
      totalBalanceDue: 0,
      totalOverdueAmount: 0,
      totalAccounts: 0
    };

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
