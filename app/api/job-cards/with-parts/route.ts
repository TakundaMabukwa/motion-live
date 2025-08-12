import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication - only authenticated users can access this data
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Query job cards where parts_required is not null
    let query = supabase
      .from('job_cards')
      .select('*')
      .not('parts_required', 'is', null)
      .order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching job cards with parts:', error);
      return NextResponse.json({ error: 'Failed to fetch job cards' }, { status: 500 });
    }

    // Get total count for pagination (only jobs with parts)
    const { count } = await supabase
      .from('job_cards')
      .select('*', { count: 'exact', head: true })
      .not('parts_required', 'is', null);

    return NextResponse.json({
      job_cards: data || [],
      count: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error('Error in job cards with parts GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
