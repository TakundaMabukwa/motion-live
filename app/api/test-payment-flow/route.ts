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

    // Step 1: Get customers data
    const { data: customers, error: customersError } = await supabase
      .from('customers_grouped')
      .select('id, company_group, all_new_account_numbers')
      .limit(5);

    if (customersError) {
      return NextResponse.json({ error: `Customers error: ${customersError.message}` }, { status: 500 });
    }

    // Step 2: Extract account numbers
    const accountNumbers = customers
      ?.map(customer => customer.all_new_account_numbers)
      .filter(accountString => accountString && accountString.trim() !== '')
      .join(',') || '';

    const accountList = accountNumbers.split(',').map(acc => acc.trim()).filter(acc => acc);

    // Step 3: Get payments data - focus on due_amount and paid_amount
    const { data: payments, error: paymentsError } = await supabase
      .from('payments_')
      .select('cost_code, due_amount, paid_amount, company, reference')
      .in('cost_code', accountList);

    if (paymentsError) {
      return NextResponse.json({ error: `Payments error: ${paymentsError.message}` }, { status: 500 });
    }

    // Step 4: Calculate totals - focus on due_amount and paid_amount
    const totals = payments?.reduce((acc, payment) => {
      const dueAmount = parseFloat(payment.due_amount) || 0;
      const paidAmount = parseFloat(payment.paid_amount) || 0;

      return {
        totalDueAmount: acc.totalDueAmount + dueAmount,
        totalPaidAmount: acc.totalPaidAmount + paidAmount,
        totalBalanceDue: acc.totalBalanceDue + (dueAmount - paidAmount),
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

    return NextResponse.json({
      success: true,
      step1_customers: {
        count: customers?.length || 0,
        sample: customers?.slice(0, 2)
      },
      step2_accountNumbers: {
        raw: accountNumbers,
        parsed: accountList,
        count: accountList.length
      },
      step3_payments: {
        count: payments?.length || 0,
        sample: payments?.slice(0, 2)
      },
      step4_totals: totals,
      message: 'Complete payment flow test completed'
    });

  } catch (error) {
    console.error('Error in test payment flow API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
