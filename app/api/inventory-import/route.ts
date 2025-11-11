import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { categories, items } = body;

    // Insert categories
    if (categories?.length > 0) {
      const { error: categoryError } = await supabase
        .from('inventory_categories')
        .upsert(categories, { onConflict: 'code' });

      if (categoryError) {
        return NextResponse.json({ error: categoryError.message }, { status: 500 });
      }
    }

    // Insert items
    if (items?.length > 0) {
      const { error: itemError } = await supabase
        .from('inventory_items')
        .upsert(items, { onConflict: 'serial_number' });

      if (itemError) {
        return NextResponse.json({ error: itemError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true,
      categories_imported: categories?.length || 0,
      items_imported: items?.length || 0
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}