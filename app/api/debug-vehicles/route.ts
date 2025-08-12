import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('DEBUG: Starting vehicle debug request');
    
    const supabase = await createClient();
    console.log('DEBUG: Supabase client created');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('DEBUG: Authentication failed', { authError, user: !!user });
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    console.log('DEBUG: User authenticated successfully');

    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber');

    console.log('DEBUG: Query parameters', { accountNumber });

    if (!accountNumber) {
      // Test: Get all vehicles to see the structure
      console.log('DEBUG: No account number provided, fetching all vehicles');
      const { data: allVehicles, error: allError } = await supabase
        .from('vehicles_ip')
        .select('*')
        .limit(5);

      if (allError) {
        console.error('DEBUG: Error fetching all vehicles:', allError);
        return NextResponse.json(
          { error: 'Failed to fetch vehicles', details: allError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'All vehicles sample',
        vehicles: allVehicles,
        count: allVehicles?.length || 0
      });
    }

    // Test: Get vehicles for specific account
    console.log('DEBUG: Fetching vehicles for account:', accountNumber);
    
    // Test with new_account_number field
    const { data: vehicles, error, count } = await supabase
      .from('vehicles_ip')
      .select('*', { count: 'exact' })
      .eq('new_account_number', accountNumber)
      .or('active.is.true,active.is.null'); // Include both active=true and active=null vehicles

    if (error) {
      console.error('DEBUG: Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vehicles data', details: error.message },
        { status: 500 }
      );
    }

    console.log('DEBUG: Query successful', { 
      vehiclesCount: vehicles?.length || 0, 
      totalCount: count,
      accountNumber
    });

    // Also test without the active filter
    const { data: allVehiclesForAccount, error: allError } = await supabase
      .from('vehicles_ip')
      .select('*')
      .eq('new_account_number', accountNumber);

    console.log('DEBUG: All vehicles for account (including inactive):', {
      count: allVehiclesForAccount?.length || 0,
      vehicles: allVehiclesForAccount
    });

    // Also test with old account_number field for comparison
    const { data: oldFieldVehicles, error: oldError } = await supabase
      .from('vehicles_ip')
      .select('*')
      .eq('account_number', accountNumber);

    console.log('DEBUG: Vehicles with old account_number field:', {
      count: oldFieldVehicles?.length || 0,
      vehicles: oldFieldVehicles
    });

    return NextResponse.json({
      message: 'Vehicle debug info',
      accountNumber,
      activeVehicles: vehicles || [],
      allVehicles: allVehiclesForAccount || [],
      oldFieldVehicles: oldFieldVehicles || [],
      activeCount: vehicles?.length || 0,
      totalCount: allVehiclesForAccount?.length || 0,
      oldFieldCount: oldFieldVehicles?.length || 0
    });

  } catch (error: any) {
    console.error('DEBUG: Unexpected error:', error);
    console.error('DEBUG: Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Debug failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 