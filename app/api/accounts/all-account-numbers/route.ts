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

    // Get all account numbers from customers_grouped
    const { data: customers, error } = await supabase
      .from('customers_grouped')
      .select('id, company_group, all_new_account_numbers')
      .not('all_new_account_numbers', 'is', null);

    if (error) {
      console.error('Error fetching customers data:', error);
      return NextResponse.json({
        error: `Database error: ${error.message}`
      }, { status: 500 });
    }

    // Extract all account numbers
    const allAccountNumbers = customers
      ?.map(customer => customer.all_new_account_numbers)
      .filter(accountString => accountString && accountString.trim() !== '')
      .join(',')
      .split(',')
      .map(acc => acc.trim())
      .filter(acc => acc) || [];

    // Get unique account numbers
    const uniqueAccountNumbers = [...new Set(allAccountNumbers)];

    return NextResponse.json({
      success: true,
      totalCustomers: customers?.length || 0,
      allAccountNumbers: allAccountNumbers,
      uniqueAccountNumbers: uniqueAccountNumbers,
      uniqueCount: uniqueAccountNumbers.length,
      sampleCustomers: customers?.slice(0, 3),
      message: `Found ${uniqueAccountNumbers.length} unique account numbers from ${customers?.length || 0} customers`
    });

  } catch (error) {
    console.error('Error in all account numbers API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

