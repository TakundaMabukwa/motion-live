import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get sample inventory items with categories
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select(`
        id,
        serial_number,
        category_code,
        inventory_categories!inventory_items_category_fkey (
          code,
          description
        )
      `)
      .limit(5);

    // Also get categories directly
    const { data: categories, error: catError } = await supabase
      .from('inventory_categories')
      .select('code, description')
      .limit(10);

    return NextResponse.json({ 
      items: items || [], 
      categories: categories || [],
      itemsError: error?.message,
      categoriesError: catError?.message 
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}