import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code'); // The client code (e.g., "MACS", "CGRC")
    const includeLegalNames = searchParams.get('includeLegalNames') === 'true';

    if (!code) {
      return NextResponse.json({ error: 'Code parameter is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`Fetching payments data for client code: ${code}`);

    // First, get the all_new_account_numbers from customers_grouped table
    const { data: customerGroup, error: groupError } = await supabase
      .from('customers_grouped')
      .select('company_group, legal_names, all_new_account_numbers')
      .ilike('company_group', `${code}%`)
      .single();

    if (groupError || !customerGroup) {
      console.log(`No customer group found for code: ${code}`);
      return NextResponse.json({
        customers: [],
        pagination: { page: 1, limit: 50, total: 0, hasMore: false }
      });
    }

    console.log('Customer group found:', customerGroup);

    // Parse the account numbers from all_new_account_numbers
    const accountNumbers = customerGroup.all_new_account_numbers
      ? customerGroup.all_new_account_numbers
          .split(',')
          .map((num: string) => num.trim().toUpperCase())
          .filter((num: string) => num.length > 0)
      : [];

    if (accountNumbers.length === 0) {
      console.log('No account numbers found for customer group');
      return NextResponse.json({
        customers: [],
        pagination: { page: 1, limit: 50, total: 0, hasMore: false }
      });
    }

    console.log('Account numbers to search:', accountNumbers);

    // Fetch payments data from payments_ table using cost_code
    const { data: payments, error: paymentsError } = await supabase
      .from('payments_')
      .select(`
        id,
        company,
        cost_code,
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

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return NextResponse.json({ error: 'Failed to fetch payments data' }, { status: 500 });
    }

    console.log(`Found ${payments?.length || 0} payment records`);

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

    // Transform payments data into the expected format
    const vehicles = payments?.map(payment => ({
      doc_no: payment.id,
      stock_code: payment.cost_code,
      stock_description: `${payment.company || 'N/A'} - ${payment.cost_code}`,
      account_number: payment.cost_code,
      company: payment.company || customerGroup.company_group,
      total_ex_vat: Number(payment.due_amount || 0),
      total_vat: 0,
      total_incl_vat: Number(payment.due_amount || 0),
      one_month: Number(payment.due_amount || 0),
      '2nd_month': 0,
      '3rd_month': 0,
      amount_due: Number(payment.balance_due || 0),
      monthly_amount: Number(payment.due_amount || 0),
      payment_status: payment.payment_status,
      billing_month: payment.billing_month,
      overdue_30_days: Number(payment.overdue_30_days || 0),
      overdue_60_days: Number(payment.overdue_60_days || 0),
      overdue_90_days: Number(payment.overdue_90_days || 0)
    })) || [];

    // Create customer summary
    const customer = {
      code: code,
      company: customerGroup.company_group,
      legal_name: includeLegalNames ? customerGroup.legal_names : null,
      totalMonthlyAmount: summary.totalDueAmount,
      totalAmountDue: summary.totalBalanceDue,
      totalOverdue: summary.totalOverdue30 + summary.totalOverdue60 + summary.totalOverdue90,
      vehicleCount: vehicles.length,
      vehicles: vehicles,
      paymentsTotalAmount: summary.totalPaidAmount,
      paymentsAmountDue: summary.totalBalanceDue,
      summary: summary
    };

    return NextResponse.json({
      customers: [customer],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        hasMore: false
      }
    });

  } catch (error) {
    console.error('Error in client-payments API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
