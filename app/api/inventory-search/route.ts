import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'IN STOCK';

    let dbQuery = supabase
      .from('inventory_items')
      .select(`
        *,
        category:inventory_categories(description)
      `)
      .eq('status', status);

    if (category) {
      dbQuery = dbQuery.eq('category_code', category);
    }

    if (query && query.length >= 2) {
      dbQuery = dbQuery.ilike('serial_number', `%${query}%`);
    }

    const { data: items, error } = await dbQuery
      .order('serial_number')
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}