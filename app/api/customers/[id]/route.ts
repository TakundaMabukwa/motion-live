import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const accountNumber = id;

    if (!accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    console.log('Fetching customer with account number:', accountNumber);

    // Get customer data from vehicles_ip table instead of customers table
    const { data: vehicles, error } = await supabase
      .from('vehicles_ip')
      .select('*')
      .eq('new_account_number', accountNumber)
      .limit(1);

    if (error) {
      console.error('Error fetching customer:', error);
      return NextResponse.json({ error: 'Failed to fetch customer data' }, { status: 500 });
    }

    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Create customer object from vehicle data
    const vehicle = vehicles[0];
    const customer = {
      id: accountNumber,
      new_account_number: accountNumber,
      account_number: accountNumber, // Add this for backward compatibility
      company: vehicle.company || 'Unknown Company',
      company_trading_name: vehicle.company || vehicle.trading_name || 'Unknown Company',
      trading_name: vehicle.company || vehicle.trading_name || 'Unknown Company',
      email: vehicle.email || '',
      landline_no: vehicle.switchboard || vehicle.phone || vehicle.cell_no || '',
      cell_no: vehicle.cell_no || vehicle.phone || '',
      switchboard: vehicle.switchboard || vehicle.phone || '',
      address: vehicle.physical_address || vehicle.address || '',
      physical_address: vehicle.physical_address || vehicle.address || '',
      postal_address: vehicle.postal_address || vehicle.address || '',
      // Add other fields as needed
    };

    return NextResponse.json({ customer });

  } catch (error) {
    console.error('Error in customer detail GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const customerId = id;
    const body = await request.json();

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    console.log('Updating customer:', customerId, 'with data:', body);

    // Update customer in customers table
    const { data: updatedCustomer, error } = await supabase
      .from('customers')
      .update(body)
      .eq('id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      return NextResponse.json({ error: 'Failed to update customer', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      customer: updatedCustomer,
      message: 'Customer updated successfully'
    });

  } catch (error) {
    console.error('Error in customer PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 