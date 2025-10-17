import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const supabase = await createClient();
    
    let query = supabase
      .from('vehicles_ip')
      .select('ip_address, new_registration, company, group_name')
      .not('ip_address', 'is', null);

    // If search term provided, filter by IP address
    if (search) {
      query = query.ilike('ip_address', `%${search}%`);
    }

    const { data, error } = await query
      .order('ip_address')
      .limit(10);

    if (error) {
      console.error('Error fetching IP addresses:', error);
      return NextResponse.json({ error: 'Failed to fetch IP addresses' }, { status: 500 });
    }

    return NextResponse.json({ ip_addresses: data || [] });
  } catch (error) {
    console.error('Error in IP addresses API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}