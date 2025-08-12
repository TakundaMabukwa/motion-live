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

    // Get customer data from vehicles_ip table where new_account_number matches
    const { data: vehicles, error } = await supabase
      .from('vehicles_ip')
      .select('*')
      .eq('new_account_number', accountNumber)
      .limit(1);

    if (error) {
      console.error('Error fetching customer data:', error);
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
      company: vehicle.company || 'Unknown Company',
      trading_name: vehicle.company || vehicle.trading_name || 'Unknown Company',
      email: vehicle.email || '',
      cell_no: vehicle.cell_no || vehicle.phone || '',
      switchboard: vehicle.switchboard || vehicle.phone || '',
      physical_address: vehicle.physical_address || vehicle.address || '',
      postal_address: vehicle.postal_address || vehicle.address || '',
      // Add other fields as needed
    };

    return NextResponse.json({ 
      success: true,
      customer 
    });

  } catch (error) {
    console.error('Error in customer match GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
