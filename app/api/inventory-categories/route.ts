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

    // Get unique codes from inventory_items
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('category_code')
      .not('category_code', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unique codes that actually have items
    const uniqueCodes = [...new Set(items?.map(item => item.category_code?.trim()).filter(Boolean))];
    
    // Return only categories that have matching items
    const categories = uniqueCodes.map(code => ({ code, description: code }));

    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error('Error in categories GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}