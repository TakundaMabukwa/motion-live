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
    const prefix = searchParams.get('prefix');

    if (!prefix) {
      return NextResponse.json({ error: 'Prefix is required' }, { status: 400 });
    }

    console.log('Fetching customer contact info for prefix:', prefix);

    // Query customers table to find records where new_account_number starts with the prefix
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        id,
        company,
        legal_name,
        trading_name,
        cell_no,
        email,
        switchboard,
        physical_address_1,
        physical_address_2,
        physical_area,
        physical_province,
        physical_code,
        postal_address_1,
        postal_address_2,
        postal_area,
        postal_province,
        postal_code,
        branch_person,
        branch_person_number,
        branch_person_email,
        new_account_number
      `)
      .like('new_account_number', `${prefix}-%`)
      .limit(1);

    if (error) {
      console.error('Error fetching customer contact info:', error);
      return NextResponse.json({ error: 'Failed to fetch customer contact info' }, { status: 500 });
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = customers[0];
    console.log('Found customer:', customer.company || customer.legal_name || customer.trading_name);

    return NextResponse.json({ 
      success: true,
      customer 
    });

  } catch (error) {
    console.error('Error in customer contact info GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
