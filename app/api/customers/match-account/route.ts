import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber');

    if (!accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    console.log('Fetching customer data for account number:', accountNumber);

    // Get customer data from customers table where new_account_number matches the cost code
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('new_account_number', accountNumber)
      .limit(1);

    if (error) {
      console.error('Error fetching customer data:', error);
      return NextResponse.json({ error: 'Failed to fetch customer data' }, { status: 500 });
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Return customer data from customers table
    const customer = customers[0];
    
    console.log('Customer data found:', customer);
    console.log('Available customer fields:', Object.keys(customer));

    return NextResponse.json({ 
      success: true,
      customer
    });

  } catch (error) {
    console.error('Error in customer match GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
