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
    const prefix = searchParams.get('prefix'); // Keep for backward compatibility

    if (!accountNumber && !prefix) {
      return NextResponse.json({ error: 'Account number or prefix is required' }, { status: 400 });
    }

    console.log('🔍 API: Fetching customer contact info');
    console.log('📊 API: Account number:', accountNumber);
    console.log('📊 API: Prefix:', prefix);

    let query = supabase
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
      `);

    // If account number is provided, search for exact match first, then fallback to prefix
    if (accountNumber) {
      console.log(`🎯 API: Searching for exact account number: "${accountNumber}"`);
      query = query.eq('new_account_number', accountNumber);
    } else if (prefix) {
      // Fallback to prefix-based search for backward compatibility
      console.log(`🔄 API: Searching by prefix: "${prefix}"`);
      query = query.like('new_account_number', `${prefix}-%`);
    }

    const { data: customers, error } = await query.limit(1);

    if (error) {
      console.error('💥 API: Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch customer contact info' }, { status: 500 });
    }

    if (!customers || customers.length === 0) {
      console.log(`❌ API: No customers found for ${accountNumber ? `account "${accountNumber}"` : `prefix "${prefix}"`}`);
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = customers[0];
    console.log('✅ API: Found customer:', {
      id: customer.id,
      company: customer.company,
      legal_name: customer.legal_name,
      trading_name: customer.trading_name,
      new_account_number: customer.new_account_number,
      email: customer.email,
      cell_no: customer.cell_no
    });

    return NextResponse.json({ 
      success: true,
      customer 
    });

  } catch (error) {
    console.error('💥 API: Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
