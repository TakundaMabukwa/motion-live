import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const fetchAll = searchParams.get('fetchAll') === 'true';
    const includePayments = searchParams.get('includePayments') === 'true';
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('customers_grouped')
      .select(`
        id,
        company_group,
        legal_names,
        all_account_numbers,
        all_new_account_numbers,
        created_at
      `, { count: 'exact' });

    if (search.trim()) {
      try {
        query = query.or(
          `company_group.ilike.%${search}%,` +
          `legal_names.ilike.%${search}%,` +
          `all_account_numbers.ilike.%${search}%`
        );
      } catch (searchError) {
        console.error('API: Search query error:', searchError);
        // Fallback to simple search on company_group only
        query = query.ilike('company_group', `%${search}%`);
      }
    }

    if (fetchAll) {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    }

    const { data: companyGroups, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch company groups data', details: error.message },
        { status: 500 }
      );
    }

    let paymentData = {};
    if (includePayments && companyGroups && companyGroups.length > 0) {
      try {
        const allCostCodes = companyGroups
          .flatMap(group => {
            if (group.all_new_account_numbers) {
              return group.all_new_account_numbers
                .split(',')
                .map((code: string) => code.trim().toUpperCase())
                .filter((code: string) => code.length > 0);
            }
            return [];
          });

        if (allCostCodes.length > 0) {
          const { data: payments, error: paymentsError } = await supabase
            .from('payments_')
            .select('cost_code, due_amount, balance_due, billing_month')
            .in('cost_code', allCostCodes);

          if (paymentsError) {
            console.error('API: Error fetching payments:', paymentsError);
          } else {
            paymentData = companyGroups.reduce((acc: any, group: any) => {
              const groupCostCodes = group.all_new_account_numbers ? 
                group.all_new_account_numbers.split(',').map((code: string) => code.trim().toUpperCase()).filter((code: string) => code.length > 0) : [];
              
              const groupPayments = payments?.filter((payment: any) => 
                groupCostCodes.includes(payment.cost_code?.toString().toUpperCase())
              ) || [];

              acc[group.id] = {
                totalDue: groupPayments.reduce((sum: number, payment: any) => sum + (payment.due_amount || 0), 0),
                totalBalance: groupPayments.reduce((sum: number, payment: any) => sum + (payment.balance_due || 0), 0),
                paymentCount: groupPayments.length,
                costCodes: groupCostCodes,
                payments: groupPayments
              };

              return acc;
            }, {});
          }
        }
      } catch (paymentErr) {
        console.error('API: Error processing payment data:', paymentErr);
      }
    }

    const transformedCompanyGroups = companyGroups?.map(group => ({
      id: group.id,
      company_group: group.company_group,
      legal_names: group.legal_names,
      all_account_numbers: group.all_account_numbers,
      all_new_account_numbers: group.all_new_account_numbers,
      created_at: group.created_at,
      // Parse account numbers for display
      account_count: group.all_account_numbers ? group.all_account_numbers.split(',').length : 0,
      // Parse legal names for display
      legal_names_list: group.legal_names ? group.legal_names.split(',').map(name => name.trim()) : []
    })) || [];

    const response = {
      companyGroups: transformedCompanyGroups,
      paymentData,
      count: count || 0,
      page,
      limit,
      hasMore: fetchAll ? false : (count ? offset + limit < count : false),
      totalPages: count ? Math.ceil(count / limit) : 0,
      fetchAll
    };

    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 
