import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code'); // The client code (e.g., "MACS", "CGRC")
    const allNewAccountNumbers = searchParams.get('all_new_account_numbers'); // Comma-separated account numbers
    const includeLegalNames = searchParams.get('includeLegalNames') === 'true';

    if (!code && !allNewAccountNumbers) {
      return NextResponse.json({ error: 'Either code or all_new_account_numbers parameter is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`Fetching payments data for: ${allNewAccountNumbers ? 'all_new_account_numbers' : 'code'}: ${allNewAccountNumbers || code}`);

    let customerGroup;
    let groupError;

    if (allNewAccountNumbers) {
      // Direct search using all_new_account_numbers
      console.log('🔍 Searching customers_grouped by all_new_account_numbers:', allNewAccountNumbers);
      const result = await supabase
        .from('customers_grouped')
        .select('company_group, legal_names, all_new_account_numbers')
        .eq('all_new_account_numbers', allNewAccountNumbers)
        .single();
      
      customerGroup = result.data;
      groupError = result.error;
    } else {
      // Fallback to code-based search
      console.log('🔍 Searching customers_grouped by code:', code);
      const result = await supabase
        .from('customers_grouped')
        .select('company_group, legal_names, all_new_account_numbers')
        .or(`company_group.ilike.%${code}%,company_group.eq.${code},all_new_account_numbers.ilike.%${code}%,all_account_numbers.ilike.%${code}%`)
        .single();
      
      customerGroup = result.data;
      groupError = result.error;
    }

    if (groupError || !customerGroup) {
      console.log(`No customer group found for code: ${code}`);
      return NextResponse.json({
        customers: [],
        pagination: { page: 1, limit: 50, total: 0, hasMore: false }
      });
    }

    console.log('Customer group found:', customerGroup);

    // Parse the account numbers from all_new_account_numbers
    // Handle comma-separated values like "AVIS-0001, AVIS-0002, AVIS-0003"
    const accountNumbersSource = allNewAccountNumbers || customerGroup.all_new_account_numbers;
    const accountNumbers = accountNumbersSource
      ? accountNumbersSource
          .split(',')
          .map((num: string) => num.trim().toUpperCase())
          .filter((num: string) => num.length > 0)
      : [];

    console.log('🔍 DEBUG: Raw all_new_account_numbers source:', accountNumbersSource);
    console.log('🔍 DEBUG: Parsed account numbers:', accountNumbers);
    console.log('🔍 DEBUG: Number of account numbers found:', accountNumbers.length);

    if (accountNumbers.length === 0) {
      console.log('No account numbers found for customer group');
      return NextResponse.json({
        customers: [],
        pagination: { page: 1, limit: 50, total: 0, hasMore: false }
      });
    }

    console.log('🔍 DEBUG: Account numbers to search in payments_ table:', accountNumbers);
    console.log('🔍 DEBUG: Searching payments_ table for cost_code IN:', accountNumbers);

    // Fetch payments data from payments_ table using cost_code
    const { data: payments, error: paymentsError } = await supabase
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

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return NextResponse.json({ error: 'Failed to fetch payments data' }, { status: 500 });
    }

    console.log(`✅ Found ${payments?.length || 0} payment records from payments_ table`);
    console.log('✅ DEBUG: Payment records found:', payments?.map(p => ({ 
      cost_code: p.cost_code, 
      company: p.company,
      due_amount: p.due_amount,
      balance_due: p.balance_due
    })) || []);
    
    // Group results by cost_code to show which account numbers had matches
    const matchesByAccount = {};
    payments?.forEach(payment => {
      if (!matchesByAccount[payment.cost_code]) {
        matchesByAccount[payment.cost_code] = 0;
      }
      matchesByAccount[payment.cost_code]++;
    });
    console.log('✅ DEBUG: Matches by account number:', matchesByAccount);

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
      reference: payment.reference,
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
