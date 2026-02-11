import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get account number from query params
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber')?.toUpperCase();

    if (!accountNumber) {
      return NextResponse.json(
        { error: 'Account number is required' },
        { status: 400 }
      );
    }

    console.log('Fetching customer data for account:', accountNumber);

    // Query customers_grouped table
    // Look for the account number in all_new_account_numbers field (which contains comma-separated values)
    const { data: customers, error } = await supabase
      .from('customers_grouped')
      .select('*')
      .ilike('all_new_account_numbers', `%${accountNumber}%`)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.log('No customer found for account:', accountNumber);
        return NextResponse.json(
          { error: 'Customer not found', success: false },
          { status: 404 }
        );
      }
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch customer data', details: error.message },
        { status: 500 }
      );
    }

    if (!customers) {
      console.log('No customer found for account:', accountNumber);
      return NextResponse.json(
        { error: 'Customer not found', success: false },
        { status: 404 }
      );
    }

    console.log('Customer found:', customers);

    // Format the response
    const customer = {
      id: customers.id,
      company_group: customers.company_group,
      legal_names: customers.legal_names,
      all_account_numbers: customers.all_account_numbers,
      all_new_account_numbers: customers.all_new_account_numbers,
      cost_code: customers.cost_code,
      email: null, // These fields may not exist in customers_grouped
      phone: null,
      address: null,
    };

    return NextResponse.json({
      success: true,
      customer: customer,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
