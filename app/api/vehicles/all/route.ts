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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    
    console.log('🚗 [VEHICLES API] Fetching all vehicles from vehicles table');
    console.log('🚗 [VEHICLES API] Page:', page, 'Limit:', limit, 'Search:', search);

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build the query
    let query = supabase
      .from('vehicles')
      .select('*', { count: 'exact' });

    // Apply search filter if provided
    if (search.trim()) {
      console.log('🔍 [VEHICLES API] Applying search filter:', search);
      query = query.or(
        `reg.ilike.%${search}%,` +
        `fleet_number.ilike.%${search}%,` +
        `make.ilike.%${search}%,` +
        `model.ilike.%${search}%,` +
        `company.ilike.%${search}%,` +
        `new_account_number.ilike.%${search}%`
      );
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: vehicles, error, count } = await query;

    if (error) {
      console.error('💥 [VEHICLES API] Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

    console.log('✅ [VEHICLES API] Successfully fetched vehicles:', vehicles?.length || 0, 'of', count || 0);

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      vehicles: vehicles || [],
      totalCount: count || 0,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      limit
    });

  } catch (error) {
    console.error('💥 [VEHICLES API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
