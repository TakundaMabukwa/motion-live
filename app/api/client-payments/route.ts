import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildDraftPaymentsFromVehicles, calculateOverdueBuckets } from '@/lib/server/account-invoice-payments';

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
    const currentBillingMonth = new Date();
    currentBillingMonth.setDate(1);
    const currentBillingMonthKey = currentBillingMonth.toISOString().slice(0, 10);

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // console.log(`Fetching payments data for: ${allNewAccountNumbers ? 'all_new_account_numbers' : 'code'}: ${allNewAccountNumbers || code}`);

    let customerGroup;
    let groupError;

    if (allNewAccountNumbers) {
      // Direct search using all_new_account_numbers (exact match)
      console.log('🔍 Searching customers_grouped by all_new_account_numbers (exact):', allNewAccountNumbers);
      const result = await supabase
        .from('customers_grouped')
        .select('company_group, legal_names, all_new_account_numbers')
        .eq('all_new_account_numbers', allNewAccountNumbers)
        .single();
      
      customerGroup = result.data;
      groupError = result.error;

      // Fallback: try partial match on any account number
      if (!customerGroup) {
        const accountNumbers = allNewAccountNumbers
          .split(',')
          .map((num: string) => num.trim().toUpperCase())
          .filter((num: string) => num.length > 0);

        if (accountNumbers.length > 0) {
          const orFilters = accountNumbers
            .map((acc) => `all_new_account_numbers.ilike.%${acc}%`)
            .join(',');

          console.log('🔍 Fallback search customers_grouped by any account number:', accountNumbers);
          const fallbackResult = await supabase
            .from('customers_grouped')
            .select('company_group, legal_names, all_new_account_numbers')
            .or(orFilters)
            .single();

          customerGroup = fallbackResult.data;
          groupError = fallbackResult.error;
        }
      }
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
      // Continue without customers_grouped; we can still serve payments_ by cost_code
    }

    console.log('Customer group found:', customerGroup);

    // Parse the account numbers from all_new_account_numbers
    // Handle comma-separated values like "AVIS-0001, AVIS-0002, AVIS-0003"
    const accountNumbersSource = allNewAccountNumbers || customerGroup?.all_new_account_numbers;
    const accountNumbers = accountNumbersSource
      ? accountNumbersSource
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

    // Fetch payments data from payments_ table using cost_code
    const { data: payments, error: paymentsError } = await supabase
      .from('payments_')
      .select(`
        id,
        company,
        cost_code,
        account_invoice_id,
        invoice_number,
        reference,
        due_amount,
        paid_amount,
        balance_due,
        credit_amount,
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
    
    const { data: vehiclesByNewAccount, error: vehiclesByNewAccountError } = await supabase
      .from('vehicles')
      .select('company, new_account_number, account_number, total_rental, total_sub')
      .in('new_account_number', accountNumbers);

    const { data: vehiclesByAccount, error: vehiclesByAccountError } = await supabase
      .from('vehicles')
      .select('company, new_account_number, account_number, total_rental, total_sub')
      .in('account_number', accountNumbers);

    if (vehiclesByNewAccountError || vehiclesByAccountError) {
      return NextResponse.json(
        { error: 'Failed to fetch vehicle billing totals' },
        { status: 500 },
      );
    }

    const latestPaymentsMap = {};
    payments?.forEach(payment => {
      if (!payment?.cost_code) {
        return;
      }
      if (String(payment.billing_month || '') !== currentBillingMonthKey) {
        return;
      }
      if (latestPaymentsMap[payment.cost_code]) {
        return;
      }
      latestPaymentsMap[payment.cost_code] = payment;
    });

    const vehicleMap = new Map();
    [...(vehiclesByNewAccount || []), ...(vehiclesByAccount || [])].forEach((vehicle) => {
      const vehicleKey = JSON.stringify([
        vehicle?.new_account_number || '',
        vehicle?.account_number || '',
        vehicle?.company || '',
        vehicle?.total_rental || '',
        vehicle?.total_sub || '',
      ]);
      if (!vehicleMap.has(vehicleKey)) {
        vehicleMap.set(vehicleKey, vehicle);
      }
    });

    const draftPaymentsByCode = buildDraftPaymentsFromVehicles(Array.from(vehicleMap.values()));
    accountNumbers.forEach((accountNumber) => {
      if (latestPaymentsMap[accountNumber]) return;
      const draft = draftPaymentsByCode.get(accountNumber);
      if (draft) {
        latestPaymentsMap[accountNumber] = draft;
      }
    });

    const latestPayments = Object.values(latestPaymentsMap);

    // Group results by cost_code to show which account numbers had matches
    const matchesByAccount = {};
    latestPayments.forEach(payment => {
      if (!matchesByAccount[payment.cost_code]) {
        matchesByAccount[payment.cost_code] = 0;
      }
      matchesByAccount[payment.cost_code]++;
    });

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

    if (latestPayments.length > 0) {
      latestPayments.forEach(payment => {
        const overdue = calculateOverdueBuckets({
          balanceDue: payment.balance_due,
          dueDate: payment.due_date,
        });
        summary.totalDueAmount += Number(payment.due_amount || 0);
        summary.totalPaidAmount += Number(payment.paid_amount || 0);
        summary.totalBalanceDue += Number(payment.balance_due || 0);
        summary.totalOverdue30 += overdue.overdue30Days;
        summary.totalOverdue60 += overdue.overdue60Days;
        summary.totalOverdue90 += overdue.overdue90Days + overdue.overdue91PlusDays;
        
        // Count payment statuses
        const status = payment.payment_status?.toLowerCase();
        if (summary.statusCounts.hasOwnProperty(status)) {
          summary.statusCounts[status]++;
        }
      });
    }

    // Transform payments data into the expected format
    const vehicles = latestPayments.map(payment => {
      const overdue = calculateOverdueBuckets({
        balanceDue: payment.balance_due,
        dueDate: payment.due_date,
      });
      return {
        doc_no: payment.id,
        stock_code: payment.cost_code,
        stock_description: `${payment.company || customerGroup?.company_group || 'N/A'} - ${payment.cost_code}`,
        account_number: payment.cost_code,
        account_invoice_id: payment.account_invoice_id || null,
        company: payment.company || customerGroup?.company_group || null,
        total_ex_vat: Number(payment.due_amount || 0),
        total_vat: 0,
        total_incl_vat: Number(payment.due_amount || 0),
        one_month: Number(payment.due_amount || 0),
        '2nd_month': 0,
        '3rd_month': 0,
        amount_due: Number(payment.balance_due || 0),
        credit_amount: Number(payment.credit_amount || 0),
        monthly_amount: Number(payment.due_amount || 0),
        payment_status: payment.payment_status,
        billing_month: payment.billing_month,
        reference: payment.invoice_number || payment.reference,
        overdue_30_days: overdue.overdue30Days,
        overdue_60_days: overdue.overdue60Days,
        overdue_90_days: overdue.overdue90Days + overdue.overdue91PlusDays,
        overdue_91_plus_days: overdue.overdue91PlusDays
      };
    }) || [];

    // Create customer summary
    const customer = {
      code: code,
      company: customerGroup?.company_group || null,
      legal_name: includeLegalNames ? customerGroup?.legal_names || null : null,
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
