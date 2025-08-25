import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('API: Starting accounts customers-grouped request');
    
    // Create Supabase server client
    const supabase = await createClient();
    console.log('API: Supabase client created');
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('API: Authentication failed', { authError, user: !!user });
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    console.log('API: User authenticated successfully');

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const fetchAll = searchParams.get('fetchAll') === 'true';
    const limit = 20;
    const offset = (page - 1) * limit;

    console.log('API: Query parameters', { page, search, fetchAll, limit, offset });

    // Build the query for customers_grouped
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

    // Apply search filter if provided
    if (search.trim()) {
      console.log('API: Applying search filter for:', search);
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

    // Apply pagination - if fetchAll is true, get all records
    if (fetchAll) {
      console.log('API: Fetching all records');
      query = query.order('created_at', { ascending: false });
    } else {
      console.log('API: Applying pagination', { offset, limit });
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    }

    console.log('API: Executing database query for customers_grouped');
    const { data: companyGroups, error, count } = await query;

    if (error) {
      console.error('API: Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch company groups data', details: error.message },
        { status: 500 }
      );
    }

    console.log('API: Query successful', { 
      companyGroupsCount: companyGroups?.length || 0, 
      totalCount: count 
    });

    // Transform the data and fetch vehicle amounts for each group
    const transformedCompanyGroups = await Promise.all(
      (companyGroups || []).map(async (group) => {
        // Extract prefix from all_new_account_numbers (e.g., "KARG" from "KARG-0014, KARG-0005")
        let prefix = '';
        let vehicleAmounts = {
          totalMonthlyAmount: 0,
          totalAmountDue: 0,
          vehicleCount: 0,
          uniqueClientCount: 0
        };

        if (group.all_new_account_numbers) {
          const firstAccount = group.all_new_account_numbers.split(',')[0].trim();
          prefix = firstAccount.split('-')[0];
          
          // Ensure we have a valid prefix
          if (!prefix || prefix.length === 0) {
            console.log(`Warning: Invalid prefix for group ${group.id}, using fallback`);
            prefix = 'UNKNOWN';
          }
          
          // Fetch vehicle amounts for this prefix
          try {
            console.log(`Fetching vehicle invoices for prefix: ${prefix}`);
            const { data: vehicleInvoices, error: vehicleError } = await supabase
              .from('vehicle_invoices')
              .select('*')
              .ilike('new_account_number', `${prefix}%`);

            if (!vehicleError && vehicleInvoices) {
              console.log(`Found ${vehicleInvoices.length} vehicle invoices for prefix ${prefix}`);
              
              // Function to calculate amount due - show total monthly amounts for all accounts with same prefix
              const getAmountDue = (oneMonth, secondMonth, thirdMonth) => {
                // For accounts section, we want to show the total monthly amounts
                // This represents what the client owes for their monthly subscriptions
                // Ensure we handle null, undefined, and string values properly
                const one = typeof oneMonth === 'string' ? parseFloat(oneMonth) || 0 : (oneMonth || 0);
                const two = typeof secondMonth === 'string' ? parseFloat(secondMonth) || 0 : (secondMonth || 0);
                const three = typeof thirdMonth === 'string' ? parseFloat(thirdMonth) || 0 : (thirdMonth || 0);
                
                return one + two + three;
              };

              // Function to calculate overdue amount based on current date
              const getOverdueAmount = (oneMonth, secondMonth, thirdMonth) => {
                const currentDate = new Date();
                const currentDay = currentDate.getDate();
                const currentMonth = currentDate.getMonth() + 1;
                const paymentDueDay = 21;

                // If before 21st of month, no overdue
                if (currentDay < paymentDueDay) {
                  return 0;
                }

                // After 21st, calculate overdue based on months
                let overdue = 0;
                if (currentMonth === 1) {
                  // January - previous year's months
                  overdue += (oneMonth || 0) + (secondMonth || 0) + (thirdMonth || 0);
                } else if (currentMonth === 2) {
                  // February - previous year's months
                  overdue += (secondMonth || 0) + (thirdMonth || 0);
                } else if (currentMonth === 3) {
                  // March - previous year's month
                  overdue += (thirdMonth || 0);
                } else {
                  // Other months - current year's previous months
                  overdue += (oneMonth || 0) + (secondMonth || 0) + (thirdMonth || 0);
                }
                
                return overdue;
              };

              // Count unique clients from vehicle invoices
              const uniqueClients = new Set();
              vehicleInvoices.forEach(invoice => {
                if (invoice.new_account_number) {
                  uniqueClients.add(invoice.new_account_number);
                }
              });

              vehicleAmounts = vehicleInvoices.reduce((acc, invoice) => {
                const oneMonth = parseFloat(invoice.one_month) || 0;
                const secondMonth = parseFloat(invoice['2nd_month']) || 0;
                const thirdMonth = parseFloat(invoice['3rd_month']) || 0;
                
                // Calculate monthly amount (what they owe monthly)
                const monthlyAmount = getAmountDue(oneMonth, secondMonth, thirdMonth);
                
                // Calculate overdue amount (what's actually due now)
                const overdueAmount = getOverdueAmount(oneMonth, secondMonth, thirdMonth);

                console.log(`Invoice ${invoice.id}: one_month=${oneMonth}, 2nd_month=${secondMonth}, 3rd_month=${thirdMonth}, monthlyAmount=${monthlyAmount}, overdueAmount=${overdueAmount}`);

                return {
                  totalMonthlyAmount: acc.totalMonthlyAmount + monthlyAmount,
                  totalAmountDue: acc.totalAmountDue + overdueAmount, // This is what's actually due now
                  vehicleCount: acc.vehicleCount + 1,
                  uniqueClientCount: uniqueClients.size
                };
              }, { totalMonthlyAmount: 0, totalAmountDue: 0, vehicleCount: 0, uniqueClientCount: 0 });

              console.log(`Final amounts for prefix ${prefix}:`, vehicleAmounts);
            }
          } catch (vehicleError) {
            console.error(`Error fetching vehicle amounts for prefix ${prefix}:`, vehicleError);
          }
        }

        return {
          id: group.id,
          company_group: group.company_group,
          legal_names: group.legal_names,
          all_account_numbers: group.all_account_numbers,
          all_new_account_numbers: group.all_new_account_numbers,
          created_at: group.created_at,
          // Parse account numbers for display
          account_count: group.all_account_numbers ? group.all_account_numbers.split(',').length : 0,
          // Parse legal names for display
          legal_names_list: group.legal_names ? group.legal_names.split(',').map(name => name.trim()) : [],
          // Vehicle amounts
          prefix,
          ...vehicleAmounts
        };
      })
    );

    console.log('API: Data transformation complete', { 
      transformedCount: transformedCompanyGroups.length 
    });

    const response = {
      companyGroups: transformedCompanyGroups,
      count: count || 0,
      page,
      limit,
      hasMore: fetchAll ? false : (count ? offset + limit < count : false),
      totalPages: count ? Math.ceil(count / limit) : 0,
      fetchAll
    };

    console.log('API: Request completed successfully');
    return NextResponse.json(response);

  } catch (error) {
    console.error('API: Unexpected error:', error);
    console.error('API: Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
