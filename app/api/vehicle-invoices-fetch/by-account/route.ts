import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication - handle potential undefined auth
    let user = null;
    let authError = null;
    
    try {
      const authResult = await supabase.auth.getUser();
      user = authResult.data?.user;
      authError = authResult.error;
    } catch (authErr) {
      console.error('Auth error:', authErr);
      authError = authErr;
    }
    
    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account number from query params
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber');

    if (!accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    console.log(`Fetching vehicle invoices for account: ${accountNumber}`);

    // Fetch vehicle invoices for the account
    const { data: vehicleInvoices, error: fetchError } = await supabase
      .from('vehicle_invoices')
      .select('*')
      .eq('new_account_number', accountNumber);

    if (fetchError) {
      console.error('Error fetching vehicle invoices:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch vehicle invoices' }, { status: 500 });
    }

    console.log(`Found ${vehicleInvoices?.length || 0} vehicle invoices for account ${accountNumber}`);

    return NextResponse.json({
      success: true,
      accountNumber,
      vehicleInvoices: vehicleInvoices || []
    });

  } catch (error) {
    console.error('Error in vehicle invoices API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
