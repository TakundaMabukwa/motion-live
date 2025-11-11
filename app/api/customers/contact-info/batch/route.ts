import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountNumbers } = await request.json();

    if (!accountNumbers || !Array.isArray(accountNumbers) || accountNumbers.length === 0) {
      return NextResponse.json({ error: 'Account numbers array is required' }, { status: 400 });
    }

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
      .in('new_account_number', accountNumbers);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch customer contact info' }, { status: 500 });
    }

    const customerMap: Record<string, any> = {};
    customers?.forEach(customer => {
      customerMap[customer.new_account_number] = customer;
    });

    return NextResponse.json({ 
      success: true,
      customers: customerMap,
      found: customers?.length || 0,
      requested: accountNumbers.length
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}