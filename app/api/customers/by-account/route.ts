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
    const accountNumber = searchParams.get('account_number');

    if (!accountNumber) {
      return NextResponse.json({ 
        error: 'Account number is required' 
      }, { status: 400 });
    }

    // First try to find customer by new_account_number
    let { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('new_account_number', accountNumber)
      .single();

    // If not found, try to find by account_number
    if (customerError && customerError.code === 'PGRST116') {
      const { data: customerByAccount, error: accountError } = await supabase
        .from('customers')
        .select('*')
        .eq('account_number', accountNumber)
        .single();
      
      if (!accountError) {
        customer = customerByAccount;
      }
    }

    // If still not found, try to find in customer_grouped table
    if (!customer) {
      const { data: groupedCustomer, error: groupedError } = await supabase
        .from('customer_grouped')
        .select('*')
        .contains('all_new_account_numbers', [accountNumber])
        .single();

      if (!groupedError && groupedCustomer) {
        // Use the grouped customer data
        customer = {
          id: groupedCustomer.id,
          company: groupedCustomer.company_group,
          legal_name: groupedCustomer.legal_names,
          trading_name: groupedCustomer.trading_name,
          email: groupedCustomer.email,
          cell_no: groupedCustomer.cell_no,
          switchboard: groupedCustomer.switchboard,
          physical_address_1: groupedCustomer.physical_address,
          new_account_number: accountNumber
        };
      }
    }

    if (!customer) {
      return NextResponse.json({ 
        error: 'Customer not found',
        accountNumber 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        company: customer.company,
        legal_name: customer.legal_name,
        trading_name: customer.trading_name,
        email: customer.email,
        cell_no: customer.cell_no,
        switchboard: customer.switchboard,
        physical_address_1: customer.physical_address_1,
        physical_address_2: customer.physical_address_2,
        physical_address_3: customer.physical_address_3,
        physical_area: customer.physical_area,
        physical_province: customer.physical_province,
        physical_code: customer.physical_code,
        new_account_number: customer.new_account_number || accountNumber
      }
    });

  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

