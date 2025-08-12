import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('TEST: Starting test request');
    
    // Create Supabase server client
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

    // Test simple query first
    console.log('TEST: Testing simple count query');
    const { count, error: countError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('TEST: Count query error:', countError);
      return NextResponse.json(
        { error: 'Database connection failed', details: countError.message },
        { status: 500 }
      );
    }

    console.log('TEST: Count query successful', { count });

    // Test simple search
    console.log('TEST: Testing simple search query');
    const { data: searchTest, error: searchError } = await supabase
      .from('customers')
      .select('id, trading_name, company')
      .ilike('trading_name', '%test%')
      .limit(5);

    if (searchError) {
      console.error('TEST: Search query error:', searchError);
      return NextResponse.json(
        { error: 'Search query failed', details: searchError.message },
        { status: 500 }
      );
    }

    console.log('TEST: Search query successful', { 
      searchResults: searchTest?.length || 0 
    });

    // Test table structure
    console.log('TEST: Testing table structure');
    const { data: structureTest, error: structureError } = await supabase
      .from('customers')
      .select('id, trading_name, company, email, account_number')
      .limit(1);

    if (structureError) {
      console.error('TEST: Structure query error:', structureError);
      return NextResponse.json(
        { error: 'Structure query failed', details: structureError.message },
        { status: 500 }
      );
    }

    console.log('TEST: Structure query successful', { 
      hasData: !!structureTest?.length,
      sampleData: structureTest?.[0] ? Object.keys(structureTest[0]) : []
    });

    return NextResponse.json({
      success: true,
      totalCount: count,
      searchTest: searchTest?.length || 0,
      structureTest: structureTest?.length || 0,
      sampleFields: structureTest?.[0] ? Object.keys(structureTest[0]) : []
    });

  } catch (error) {
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