import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('TEST: Starting table test request');
    
    const supabase = await createClient();
    console.log('TEST: Supabase client created');
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('TEST: Authentication failed', { authError, user: !!user });
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    console.log('TEST: User authenticated successfully');

    // Test customers_grouped table
    console.log('TEST: Testing customers_grouped table');
    const { data: groupedData, error: groupedError, count: groupedCount } = await supabase
      .from('customers_grouped')
      .select('*', { count: 'exact' })
      .limit(5);

    if (groupedError) {
      console.error('TEST: customers_grouped table error:', groupedError);
      return NextResponse.json(
        { error: 'customers_grouped table error', details: groupedError.message },
        { status: 500 }
      );
    }

    console.log('TEST: customers_grouped table successful', { 
      count: groupedCount,
      sampleData: groupedData?.slice(0, 2) || []
    });

    // Test customers table
    console.log('TEST: Testing customers table');
    const { data: customersData, error: customersError, count: customersCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .limit(5);

    if (customersError) {
      console.error('TEST: customers table error:', customersError);
      return NextResponse.json(
        { error: 'customers table error', details: customersError.message },
        { status: 500 }
      );
    }

    console.log('TEST: customers table successful', { 
      count: customersCount,
      sampleData: customersData?.slice(0, 2) || []
    });

    return NextResponse.json({
      success: true,
      customers_grouped: {
        count: groupedCount,
        sampleData: groupedData?.slice(0, 2) || []
      },
      customers: {
        count: customersCount,
        sampleData: customersData?.slice(0, 2) || []
      }
    });

  } catch (error: any) {
    console.error('TEST: Unexpected error:', error);
    console.error('TEST: Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 