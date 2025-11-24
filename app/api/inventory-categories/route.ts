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

    // Get categories from inventory_categories table
    const { data: categories, error } = await supabase
      .from('inventory_categories')
      .select('code, description')
      .order('code');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error('Error in categories GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, description } = await request.json();

    if (!code || !description) {
      return NextResponse.json({ error: 'Code and description are required' }, { status: 400 });
    }

    // Insert new category
    const { data: category, error } = await supabase
      .from('inventory_categories')
      .insert({
        code: code.toUpperCase(),
        description
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error in categories POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}